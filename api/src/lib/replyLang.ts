import { chatMessageText, type ChatMessage } from './schema.js'

export type ReplyLang = 'de' | 'en'

/**
 * Erkennt die Sprache der Antwort anhand der Nutzer-Nachrichten — nicht der
 * UI-Sprache (body.lang). Grund: CHAT_SYSTEM_PROMPT vs. _EN, adviceGuard und
 * Nachforderungs-Retries hängen alle am lang-Parameter; wenn die Oberfläche
 * auf Englisch steht (Browser, /en, Toggle), der Nutzer aber auf Deutsch
 * schreibt, überstimmt der englische System-Prompt die bisherige
 * Prompt-Regel "antworte in der Sprache der letzten Nachricht".
 */
export function detectReplyLang(history: ChatMessage[], fallback: ReplyLang = 'de'): ReplyLang {
  const userTexts = history
    .filter((m) => m.role === 'user')
    .map((m) => chatMessageText(m.content).trim())
    .filter((text) => text.length > 0)

  if (userTexts.length === 0) return fallback

  for (let i = userTexts.length - 1; i >= 0; i--) {
    const scored = scoreTextLang(userTexts[i])
    if (scored) return scored
  }

  return fallback
}

function scoreTextLang(text: string): ReplyLang | null {
  const sample = text.toLowerCase()

  const germanScore =
    (sample.match(/[äöüß]/g) ?? []).length * 3 +
    countWords(
      sample,
      /\b(der|die|das|und|ist|nicht|wir|ich|sie|ein|eine|einer|einem|einen|für|mit|auf|auch|aber|wenn|warum|weshalb|wieso|können|könnte|haben|habe|hat|werden|wird|wurde|dass|schon|noch|sehr|gibt|sind|war|mich|mir|uns|ihr|ihm|ihn|ihnen|dem|den|des|von|zu|als|nach|bei|seit|über|unter|weil|welche|welcher|welches|würde|sollte|müssen|möchte|bitte|danke|guten|hallo|frage|antwort|gespräch|unternehmen|führung|mitarbeiter|entscheidung|problem|situation|team|rolle|chef|geschäftsführung|vorstand|personal|organisation|strategie|konflikt|vertrauen|zusammenarbeit|wie|was|wo|wer|wann|wohin|darum|deshalb|deswegen|obwohl|damit|während|zwischen|gegen|ohne|innerhalb|ausserhalb|heute|morgen|gestern|immer|nie|vielleicht|eigentlich|natürlich|jedoch|deshalb|zudem|ausserdem|insbesondere|grundsätzlich|gründe|gründen)\b/g,
    )

  const englishScore = countWords(
    sample,
    /\b(the|and|is|are|was|were|have|has|had|not|you|your|we|they|this|that|with|for|from|about|would|could|should|what|why|how|when|where|which|who|whom|can|will|shall|been|being|their|there|these|those|please|thank|thanks|hello|question|answer|company|leadership|employee|decision|problem|situation|team|role|ceo|executive|board|people|organization|strategy|conflict|trust|collaboration|because|although|however|therefore|also|still|already|always|never|maybe|actually|today|tomorrow|yesterday)\b/g,
  )

  if (germanScore >= 2 && germanScore > englishScore) return 'de'
  if (englishScore >= 2 && englishScore > germanScore) return 'en'
  if (germanScore > 0 && germanScore > englishScore) return 'de'
  if (englishScore > 0 && englishScore > germanScore) return 'en'
  return null
}

function countWords(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}
