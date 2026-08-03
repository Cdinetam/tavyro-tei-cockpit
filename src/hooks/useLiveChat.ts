import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import {
  sendLiveChatMessage,
  listLiveConversations,
  getLiveConversation,
  deleteLiveConversation,
  type LiveConversationSummary,
} from '../lib/liveClient'
import type { Lang } from '../lib/i18n'

export type LiveChatStatus = 'idle' | 'sending' | 'error'

/**
 * Live-Version-Pendant zu useTrustRoomChat.ts — deutlich einfacher, da hier
 * weder Themen-Streak/Cliffhanger noch Wochenlimit/Nachrichten-Cap
 * existieren (siehe liveChat.ts im Backend). Neu dafür: Gespräche werden
 * NICHT nur lokal (localStorage), sondern automatisch serverseitig
 * gespeichert (siehe liveConversationStore.ts) — savedConversations kommt
 * deshalb aus einem API-Aufruf statt aus dem Browser-Speicher.
 */
export function useLiveChat(lang: Lang = 'de') {
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [status, setStatus] = useState<LiveChatStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [savedConversations, setSavedConversations] = useState<LiveConversationSummary[]>([])

  async function refreshConversations() {
    const list = await listLiveConversations()
    setSavedConversations(list)
  }

  useEffect(() => {
    refreshConversations()
  }, [])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || status === 'sending') return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setStatus('sending')
    setErrorMessage('')

    const response = await sendLiveChatMessage(nextMessages, conversationId, langRef.current)

    if (response.status === 'ok' && response.reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply! }])
      if (response.conversationId) setConversationId(response.conversationId)
      setStatus('idle')
      refreshConversations()
    } else {
      const fallback = langRef.current === 'en' ? 'Something went wrong.' : 'Etwas ist schiefgelaufen.'
      setErrorMessage(response.message ?? fallback)
      setStatus('error')
    }
  }

  function reset() {
    setMessages([])
    setConversationId(null)
    setStatus('idle')
    setErrorMessage('')
  }

  async function resumeConversation(id: string) {
    const conversation = await getLiveConversation(id)
    if (!conversation) return
    setMessages(conversation.messages)
    setConversationId(conversation.id)
    setStatus('idle')
    setErrorMessage('')
  }

  async function deleteSavedConversation(id: string) {
    await deleteLiveConversation(id)
    if (conversationId === id) reset()
    refreshConversations()
  }

  return {
    messages,
    status,
    errorMessage,
    savedConversations,
    send,
    reset,
    resumeConversation,
    deleteSavedConversation,
  }
}
