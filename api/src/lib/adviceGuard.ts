/**
 * Technisches Sicherheitsnetz gegen ausweichende Antworten des Trust-Room-
 * Gespräch-Flows (chat.ts / CHAT_SYSTEM_PROMPT).
 *
 * Hintergrund: der aktuelle CHAT_SYSTEM_PROMPT (Revision: direktiver
 * C-Level-Sparringpartner statt reiner Reflexionsraum) verlangt in seiner
 * Antwortlogik bei JEDER Antwort eine "Vorläufige Einschätzung" (Schritt 4)
 * — nicht mehr nur bei ausdrücklicher Nachfrage wie in der Vorgänger-
 * Fassung. In der Praxis hat sich über mehrere Live-Tests gezeigt, dass
 * reine Prompt-Formulierung diese Regel nicht zuverlässig durchsetzt — das
 * Modell weicht gerne auf Formulierungen wie "das hängt davon ab" oder
 * "es kommt darauf an" aus, ODER lässt eine echte Positionierung ganz weg
 * und bleibt bei Beobachtung plus Rückfrage.
 *
 * isExplicitAdviceRequest bleibt erhalten (u.a. für Logging/Diagnose), ist
 * aber NICHT mehr Voraussetzung für den Retry — isEvasiveReply wird auf
 * jede Antwort angewendet, da die Vorläufige-Einschätzung-Pflicht jetzt
 * unabhängig von einer expliziten Nachfrage gilt. Trifft sie zu, fordert
 * requestChatReply (siehe openaiClient.ts) automatisch einmal strenger
 * nach, bevor die Antwort an die Person geht. Reine Heuristik auf Basis von
 * Textmustern — kein Ersatz für eine echte Absicht-Erkennung, aber
 * zuverlässiger als ausschliesslich auf Prompt-Befolgung zu vertrauen.
 */

const ADVICE_REQUEST_PATTERNS: RegExp[] = [
  /was\s+soll\s+ich/i,
  /was\s+w[üu]rdest\s+du/i,
  /wie\s+w[üu]rdest\s+du/i,
  /was\s+ist\s+dein[e]?\s+(vorschlag|rat|tipp|meinung|einsch[äa]tzung|idee)/i,
  /was\s+mach[e]?\s+ich/i,
  /sollte\s+ich/i,
  /soll\s+ich\s+(ihn|sie|es|das)/i,
  /oder\s+soll\s+ich/i,
  /sag\s+(du\s+)?(es\s+)?mir/i,
  /was\s+meinst\s+du/i,
  /was\s+denkst\s+du/i,
  /was\s+r[äa]tst\s+du/i,
  /deine\s+meinung/i,
]

/** Erkennt, ob die letzte Nutzer-Nachricht ausdrücklich nach einer
 * Handlungsempfehlung fragt (auslösende Bedingung für die RATSCHLÄGE-Regel
 * im Prompt). Bewusst als Muster-Liste gehalten, nicht abschliessend —
 * natürliche Sprache hat mehr Varianten, als sich vollständig erfassen
 * lassen (siehe Modul-Kommentar oben zu den Grenzen dieser Heuristik). */
export function isExplicitAdviceRequest(text: string): boolean {
  return ADVICE_REQUEST_PATTERNS.some((re) => re.test(text))
}

const COMMITMENT_PATTERNS: RegExp[] = [
  /ich\s+w[üu]rde\s+(eher|zu|an\s+ihrer\s+stelle|dazu\s+tendieren|empfehlen|dazu\s+raten|davon\s+abraten|noch\s+keine)/i,
  /mein\s+erster\s+gedanke/i,
  /meine\s+(vorl[äa]ufige\s+)?einsch[äa]tzung/i,
  /meine\s+vorl[äa]ufige\s+empfehlung/i,
  /ich\s+empfehle/i,
  /ich\s+rate\s+(ihnen\s+)?(dazu|davon\s+ab)/i,
  /ich\s+tendiere\s+(eher\s+)?zu/i,
  /an\s+ihrer\s+stelle\s+w[üu]rde\s+ich/i,
  /ich\s+halte\s+.{0,40}f[üu]r\s+(sinnvoll|verfr[üu]ht|riskant)/i,
  /unter\s+diesen\s+annahmen\s+w[üu]rde\s+ich/i,
  /davon\s+w[üu]rde\s+ich\s+.{0,20}abraten/i,
  /diese\s+schlussfolgerung\s+w[üu]rde\s+ich/i,
]

// Exakt die Eröffnungsformulierungen, die Punkt 1 des Steuerungsblocks
// ("Bereits die erste Antwort muss substanziell sein") ausdrücklich
// verbietet — inklusive "Sie befinden sich in einer komplexen Situation",
// die live tatsächlich als Antwort-Eröffnung aufgetreten ist. Nur am Anfang
// der Antwort geprüft (die ersten ca. 80 Zeichen), da es hier konkret um
// den ERSTEN Satz geht, nicht um das gelegentliche Vorkommen dieser Wörter
// später im Text.
const BANNED_OPENER_PATTERNS: RegExp[] = [
  /^.{0,10}es\s+klingt,?\s+als\s+ob/i,
  /^.{0,10}es\s+scheint,?\s+als\s+ob/i,
  /^.{0,10}es\s+ist\s+verst[äa]ndlich/i,
  /^.{0,10}sie\s+befinden\s+sich\s+in\s+einer\s+komplexen\s+situation/i,
  /^.{0,10}vielleicht\s+(k[öo]nnte\s+es\s+)?hilft?/i,
]

/** Erkennt, ob eine Antwort mit einer der explizit verbotenen
 * Eröffnungsformulierungen beginnt (Steuerungsblock Punkt 1). */
export function hasBannedOpener(reply: string): boolean {
  const opening = reply.slice(0, 80)
  return BANNED_OPENER_PATTERNS.some((re) => re.test(opening))
}

/** Erkennt, ob eine Antwort ausweichend ist: entweder weil sie mit einer
 * ausdrücklich verbotenen Formulierung beginnt (siehe hasBannedOpener),
 * oder weil sie keine erkennbare eigene Tendenz enthält. Letzteres bewusst
 * NICHT über eine Liste bekannter Ausweich-Formulierungen definiert (z.B.
 * "das hängt davon ab") — das erwies sich als zu brüchig, weil dieselbe
 * Ausweich-Absicht in zu vielen leicht unterschiedlichen Formulierungen
 * auftritt ("könnte hilfreich sein" vs. "könnte es hilfreich sein" vs.
 * "wäre vielleicht hilfreich" usw.). Stattdessen die robustere, umgekehrte
 * Prüfung: fehlt jede erkennbare Festlegung, gilt die Antwort als
 * ausweichend — unabhängig davon, WIE sie ausweicht. */
export function isEvasiveReply(reply: string): boolean {
  if (hasBannedOpener(reply)) return true
  return !COMMITMENT_PATTERNS.some((re) => re.test(reply))
}

/** Wird als zusätzlicher, nur für den Nachforderungs-Versuch geltender
 * Hinweis an den System-Prompt angehängt (siehe requestChatReply). */
export const ADVICE_REINFORCEMENT = `VERSTÄRKUNGS-HINWEIS FÜR DIESEN NACHFORDERUNGS-VERSUCH (interner Kontext,
nicht für die Person sichtbar): Deine vorherige Antwort hat entweder mit
einer ausdrücklich verbotenen Formulierung begonnen (siehe Steuerungsblock
Punkt 1 — z.B. "Es klingt, als ob", "Sie befinden sich in einer komplexen
Situation") oder enthielt keine erkennbare vorläufige Position (Punkt 7) —
nur Beobachtung, Differenzierung und/oder eine Rückfrage, aber keine eigene
Empfehlung. Beginne diese neue Antwort zwingend mit einer klaren Kernthese
(Punkt 1) und ergänze eine vorläufige Position mit der vorgeschriebenen
Formulierung "Meine vorläufige Empfehlung ist ..." (alternativ "Unter
diesen Annahmen würde ich ..." oder "Ich würde noch keine langfristige
Verpflichtung eingehen ..."), gefolgt von einer kurzen, konkreten
Begründung, die sich auf das bezieht, was die Person tatsächlich
geschildert hat. Formuliere danach ggf. weiterhin die Reihenfolge der
nächsten Schritte, eine Entscheidungsregel und höchstens eine
Reflexionsfrage, wie in Punkt 11 der festen Antwortstruktur vorgesehen.`
