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
 * wiederholend (inkl. Paraphrase). Empirisch: 0.45 fängt Umschreibungen
 * mit Synonymen; echte Vertiefungen mit neuen Aspekten bleiben typischerweise
 * darunter. */
const REPETITION_THRESHOLD = 0.45

/** Alle letzten Assistenten-Antworten im Verlauf prüfen — Paraphrasen
 * dürfen auch nicht gegen ältere Antworten im selben Gespräch getestet werden. */
const LOOKBACK_ASSISTANT_REPLIES = 5

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
  if (tokensA.length < 6 || tokensB.length < 6) return 0

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

export const REPETITION_REINFORCEMENT_DE = `VERSTÄRKUNGS-HINWEIS GEGEN WIEDERHOLUNG UND PARAPHRASE (interner Kontext, nicht
für die Person sichtbar): Deine vorherige Antwort wiederholte oder paraphrasierte
Inhalte aus einer Antwort, die du in diesem Gespräch bereits gegeben hast —
auch wenn die Formulierung anders war (siehe Steuerungsblock Punkt 15). Das ist
verboten. Schreibe diese Antwort von Grund auf neu. Wiederhole und paraphrasiere
KEINE Kernthese, Empfehlung, Schritte, Diagnose oder Formulierungen aus
früheren Antworten — auch nicht als Zusammenfassung oder Bestätigung in
anderen Worten. Liefere ausschliesslich NEUEN Mehrwert, der inhaltlich noch
nicht vorkam: einen anderen Blickwinkel, eine zusätzliche Option, eine
konkretere Ebene, einen bisher nicht genannten Aspekt, ein Beispiel oder den
nächsten logischen Schritt. Behalte die feste Antwortstruktur (Punkt 11) bei,
aber mit neuem Inhalt.`

export const REPETITION_REINFORCEMENT_EN = `REINFORCEMENT NOTE AGAINST REPETITION AND PARAPHRASING (internal context, not
visible to the person): Your previous reply repeated or paraphrased content
from an answer you already gave earlier in this conversation — even if the
wording differed (see steering block point 15). That is forbidden. Rewrite
this reply from scratch. Do NOT repeat or paraphrase any core thesis,
recommendation, steps, diagnosis or phrasing from earlier replies — not as a
summary, not as confirmation in different words. Deliver only NEW value that
has not appeared yet: a different angle, an additional option, a more concrete
level, an aspect not yet mentioned, an example, or the next logical step. Keep
the fixed response structure (point 11), but with new content.`

export function getRepetitionReinforcement(lang: GuardLang = 'de'): string {
  return lang === 'en' ? REPETITION_REINFORCEMENT_EN : REPETITION_REINFORCEMENT_DE
}
