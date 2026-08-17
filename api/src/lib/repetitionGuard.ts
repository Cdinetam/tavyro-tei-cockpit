import type { GuardLang } from './adviceGuard.js'
import { chatMessageText, type ChatMessage } from './schema.js'

/**
 * Technisches Sicherheitsnetz gegen inhaltlich wiederholte Folgeantworten
 * (siehe Prompt-Regel 15 in CHAT_SYSTEM_PROMPT / _EN).
 *
 * Reine Prompt-Formulierung reicht live nicht zuverlässig: das Modell
 * umschreibt oft denselben Kern mit Synonymen statt neuen Mehrwert zu
 * liefern. Diese Heuristik vergleicht die neue Antwort mit der/den
 * vorherigen Assistenten-Antwort(en) im Verlauf und löst denselben
 * Nachforderungs-Retry aus wie adviceGuard.ts (siehe requestChatReply).
 *
 * Ähnlichkeit: Jaccard über signifikante Wörter (Länge ≥ 4) plus Anteil
 * gemeinsamer Bigramme. Schwelle bewusst hoch genug, damit inhaltlich
 * verwandte, aber neue Antworten (z.B. konkretere Stufe zum selben Thema)
 * NICHT als Wiederholung gelten — nur wirklich deckungsgleiche.
 */

/** Ab diesem Jaccard-/Bigramm-Score gilt eine Antwort als inhaltlich
 * wiederholend. Empirisch: 0.55 fängt starke Umschreibungen, lässt echte
 * Vertiefungen (neue Optionen/Aspekte) typischerweise durch. */
const REPETITION_THRESHOLD = 0.55

/** Nur die letzten N Assistenten-Antworten prüfen — ältere sind thematisch
 * oft schon weit weg und würden fälschlich "Wiederholung" auslösen. */
const LOOKBACK_ASSISTANT_REPLIES = 2

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
}

function bigrams(tokens: string[]): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]} ${tokens[i + 1]}`)
  }
  return set
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

/** 0..1 — höher = ähnlicher. Mittelwert aus Wort-Jaccard und Bigramm-Jaccard. */
export function replySimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.length < 8 || tokensB.length < 8) return 0

  const wordScore = jaccard(new Set(tokensA), new Set(tokensB))
  const bigramScore = jaccard(bigrams(tokensA), bigrams(tokensB))
  return (wordScore + bigramScore) / 2
}

/** Liefert die letzten Assistenten-Antworten aus dem Verlauf (neueste zuerst),
 * ohne die aktuelle (noch nicht im history enthaltene) Antwort. */
export function previousAssistantReplies(history: ChatMessage[]): string[] {
  const replies: string[] = []
  for (let i = history.length - 1; i >= 0 && replies.length < LOOKBACK_ASSISTANT_REPLIES; i--) {
    const m = history[i]
    if (m.role !== 'assistant') continue
    const text = chatMessageText(m.content).trim()
    if (text.length > 0) replies.push(text)
  }
  return replies
}

/** true, wenn die neue Antwort einer der letzten Assistenten-Antworten
 * inhaltlich zu nahe kommt. */
export function isRepetitiveReply(reply: string, history: ChatMessage[]): boolean {
  const previous = previousAssistantReplies(history)
  if (previous.length === 0) return false
  return previous.some((prev) => replySimilarity(reply, prev) >= REPETITION_THRESHOLD)
}

export const REPETITION_REINFORCEMENT_DE = `VERSTÄRKUNGS-HINWEIS GEGEN WIEDERHOLUNG (interner Kontext, nicht für die
Person sichtbar): Deine vorherige Antwort war inhaltlich zu nah an einer
Antwort, die du in diesem Gespräch bereits gegeben hast — auch wenn die
Formulierung anders war (siehe Steuerungsblock Punkt 15). Schreibe diese
Antwort komplett neu. Wiederhole KEINE Kernthese, Empfehlung, Schritte oder
Formulierungen aus früheren Antworten. Liefere ausschliesslich NEUEN
Mehrwert: einen anderen Blickwinkel, eine zusätzliche Option, eine
konkretere Ebene, einen bisher nicht genannten Aspekt, ein Beispiel oder
den nächsten logischen Schritt. Behalte die feste Antwortstruktur (Punkt 11)
bei, aber mit neuem Inhalt.`

export const REPETITION_REINFORCEMENT_EN = `REINFORCEMENT NOTE AGAINST REPETITION (internal context, not visible to the
person): Your previous reply was substantively too close to an answer you
already gave earlier in this conversation — even if the wording differed
(see steering block point 15). Rewrite this reply completely. Do NOT repeat
any core thesis, recommendation, steps or phrasing from earlier replies.
Deliver only NEW value: a different angle, an additional option, a more
concrete level, an aspect not yet mentioned, an example, or the next
logical step. Keep the fixed response structure (point 11), but with new
content.`

export function getRepetitionReinforcement(lang: GuardLang = 'de'): string {
  return lang === 'en' ? REPETITION_REINFORCEMENT_EN : REPETITION_REINFORCEMENT_DE
}
