import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { sendChatMessage } from '../lib/aiClient'
import type { Lang } from '../lib/i18n'

export type ChatFlowStatus =
  | 'idle'
  | 'sending'
  | 'limit_reached'
  | 'conversation_limit_reached'
  | 'demo_expired'
  | 'error'

export interface SavedConversation {
  id: string
  savedAt: string
  messages: ChatMessage[]
}

const SAVED_STORAGE_KEY = 'tei-saved-conversations'
// Sicherheitslimit gegen unbegrenztes Wachstum von localStorage.
const MAX_SAVED_CONVERSATIONS = 10

function readSaved(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedConversation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSaved(conversations: SavedConversation[]): void {
  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // localStorage kann voll oder blockiert sein (z.B. privates Fenster) —
    // das Speichern ist ein Komfort-Feature, darf den Gespräch-Flow nicht
    // zum Absturz bringen.
  }
}

/**
 * Verwaltet den Nachrichtenverlauf für den echten, mehrteiligen Trust-Room-
 * Gespräch-Flow. Bewusst clientseitig (kein Server-Speicher) — der aktive
 * Verlauf lebt nur im Browser und wird bei jeder Anfrage komplett an das
 * Backend mitgeschickt. Explizit abgeschlossene Gespräche können optional
 * (nur auf ausdrücklichen Wunsch der Person beim Verlassen) zusätzlich in
 * localStorage auf diesem Gerät gesichert werden — nie automatisch, siehe
 * Produktentscheidung zur Vertraulichkeit dieses Inhalts.
 */
export function useTrustRoomChat(lang: Lang = 'de') {
  // Ref statt nur des Parameters direkt, damit `send` (unten, als Closure
  // über mehrere Aufrufe hinweg stabil) beim Absenden immer die zum
  // Zeitpunkt des Klicks aktuelle Sprache liest, auch falls die Person kurz
  // zuvor per D | EN-Toggle die Sprache gewechselt hat.
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatFlowStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>(() => readSaved())
  // Verweist auf den localStorage-Eintrag, aus dem der aktive Chat stammt
  // (per resumeConversation geladen) — damit ein erneutes Speichern denselben
  // Eintrag aktualisiert, statt ein Duplikat desselben Gesprächs anzulegen.
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  // Anzahl der bisherigen, zusammenhängenden Nachrichten zum aktuellen
  // Thema — Grundlage für den Cliffhanger-Hinweis an das Backend (siehe
  // chat.ts). Wird auf 0 zurückgesetzt, sobald ein Cliffhanger ausgelöst
  // wurde (neues Kapitel beginnt) oder ein neues Gespräch startet.
  const [topicStreak, setTopicStreak] = useState(0)
  // Erst bekannt, sobald das Backend einmal "limit_reached" zurückgibt (mit
  // der tatsächlich konfigurierten Wochengrenze, siehe PILOT_WEEKLY_LIMIT) —
  // vorher zeigt die UI nur allgemein "Demo-Version", ohne konkrete Zahl.
  const [weeklyLimit, setWeeklyLimit] = useState<number | null>(null)

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || status === 'sending') return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setStatus('sending')
    setErrorMessage('')

    const topicTurnHint = topicStreak + 1
    const response = await sendChatMessage(nextMessages, topicTurnHint, langRef.current)

    if (response.status === 'ok' && response.reply) {
      const cliffhanger = !!response.cliffhanger
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply!, cliffhanger }])
      setTopicStreak(cliffhanger ? 0 : topicTurnHint)
      setStatus('idle')
    } else if (response.status === 'limit_reached') {
      if (typeof response.sessionAnalysesLimit === 'number') {
        setWeeklyLimit(response.sessionAnalysesLimit)
      }
      setStatus('limit_reached')
    } else if (response.status === 'conversation_limit_reached') {
      // Anders als 'limit_reached' (Wochenkontingent komplett erschöpft)
      // betrifft dies nur DIESES eine Gespräch — die Person kann sofort ein
      // neues starten, siehe TrustRoomChat.tsx.
      setStatus('conversation_limit_reached')
    } else if (response.status === 'demo_expired') {
      setStatus('demo_expired')
    } else {
      const fallback = langRef.current === 'en' ? 'Something went wrong.' : 'Etwas ist schiefgelaufen.'
      setErrorMessage(response.message ?? fallback)
      setStatus('error')
    }
  }

  function reset() {
    setMessages([])
    setStatus('idle')
    setErrorMessage('')
    setActiveConversationId(null)
    setTopicStreak(0)
  }

  /**
   * Sichert den aktuellen Verlauf lokal und leert danach den aktiven Chat.
   * Stammt der aktive Chat aus einem bereits gespeicherten Gespräch (per
   * resumeConversation geladen), wird dieser eine Eintrag aktualisiert statt
   * ein zweites Duplikat desselben Themas anzulegen.
   */
  function saveAndReset() {
    if (messages.length > 0) {
      const current = readSaved()
      const existingIndex = activeConversationId
        ? current.findIndex((c) => c.id === activeConversationId)
        : -1

      const entry: SavedConversation = {
        id: activeConversationId ?? crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        messages,
      }

      const withoutEntry = existingIndex >= 0 ? current.filter((c) => c.id !== entry.id) : current
      const updated = [entry, ...withoutEntry].slice(0, MAX_SAVED_CONVERSATIONS)
      writeSaved(updated)
      setSavedConversations(updated)
    }
    reset()
  }

  function resumeConversation(id: string) {
    const entry = savedConversations.find((c) => c.id === id)
    if (!entry) return
    setMessages(entry.messages)
    setStatus('idle')
    setErrorMessage('')
    setActiveConversationId(id)
    // Themen-Streak wird nicht mitgespeichert — nach dem Fortsetzen startet
    // die Zählung bewusst neu (nächste Nachricht zählt wieder als Turn 1).
    setTopicStreak(0)
  }

  function deleteSavedConversation(id: string) {
    const updated = savedConversations.filter((c) => c.id !== id)
    writeSaved(updated)
    setSavedConversations(updated)
    if (activeConversationId === id) {
      setActiveConversationId(null)
    }
  }

  return {
    messages,
    status,
    errorMessage,
    savedConversations,
    weeklyLimit,
    send,
    reset,
    saveAndReset,
    resumeConversation,
    deleteSavedConversation,
  }
}
