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

// Die von Punkt 1 des Steuerungsblocks ausdrücklich verbotenen
// Formulierungen ("Was du vermeiden musst" verbietet sie zusätzlich ganz
// generell, nicht nur als Opener). Live hat sich gezeigt, dass diese
// Phrasen nicht nur als allererster Satz auftreten, sondern auch als
// Eröffnung eines späteren Unterabschnitts ("Zunächst zum CFO: Es klingt,
// als ob...") — deshalb wird der GESAMTE Text geprüft, nicht nur der
// Anfang.
const BANNED_PHRASE_PATTERNS: RegExp[] = [
  /es\s+klingt,?\s+als\s+ob/i,
  /es\s+scheint,?\s+als\s+ob/i,
  /es\s+ist\s+verst[äa]ndlich/i,
  /vielleicht\s+(k[öo]nnte\s+es\s+)?hilft?/i,
]

// "Komplexe Situation" als generischer Öffner tritt in vielen leicht
// unterschiedlichen Verb-Varianten auf ("Sie befinden sich in...", "Sie
// stehen vor...", "Sie sind in..." usw.) — statt jede Variante einzeln zu
// listen, wird das Nomen selbst nahe am Anfang der Antwort geprüft, da es
// dort praktisch immer denselben ausweichenden Öffner markiert.
const GENERIC_OPENER_NEAR_START = /^.{0,60}komplexe[nr]?\s+situation/i

/** Erkennt, ob eine Antwort eine der explizit verbotenen Formulierungen
 * enthält (irgendwo im Text) oder mit dem generischen "komplexe
 * Situation"-Muster beginnt (Steuerungsblock Punkt 1 / "Was du vermeiden
 * musst"). */
export function hasBannedOpener(reply: string): boolean {
  if (GENERIC_OPENER_NEAR_START.test(reply)) return true
  return BANNED_PHRASE_PATTERNS.some((re) => re.test(reply))
}

// Abstrakte Massnahmen, die Punkt 10 des Steuerungsblocks nur zulässt, wenn
// sie konkretisiert werden (mit wem, worüber, bis wann, welche Kriterien,
// welche Konsequenz). Bewusst als grober Signalgeber behandelt: schon die
// blosse Verwendung dieser Formulierungen ist meistens ein Zeichen, dass
// die Konkretisierung fehlt — ein gelegentlicher False Positive (eine
// bereits konkretisierte Stelle löst trotzdem einen Retry aus) kostet nur
// etwas Latenz, keine inhaltliche Qualität.
const VAGUE_ACTION_PATTERNS: RegExp[] = [
  /(ein\s+)?(kl[äa]rendes|ehrliches|offenes)\s+gespr[äa]ch\s+(zu\s+)?f[üu]hren/i,
  /transparent\s+(zu\s+)?kommunizieren/i,
  /erwartungen\s+(zu\s+)?kl[äa]ren/i,
  /langfristige\s+ziele\s+(zu\s+)?ber[üu]cksichtigen/i,
  /vor-?\s*und\s+nachteile\s+(ab)?w[äa]gen/i,
]

/** Erkennt, ob eine Antwort eine der nicht-konkretisierten Pauschal-
 * Empfehlungen enthält, die Punkt 10 des Steuerungsblocks ohne
 * Konkretisierung verbietet. */
export function hasVagueUnconcretizedAction(reply: string): boolean {
  return VAGUE_ACTION_PATTERNS.some((re) => re.test(reply))
}

/** Erkennt, ob eine Antwort ausweichend ist: entweder weil sie eine
 * ausdrücklich verbotene Formulierung enthält (siehe hasBannedOpener), weil
 * sie eine nicht-konkretisierte Pauschal-Empfehlung enthält (siehe
 * hasVagueUnconcretizedAction), oder weil sie keine erkennbare eigene
 * Tendenz enthält. Letzteres bewusst NICHT über eine Liste bekannter
 * Ausweich-Formulierungen definiert (z.B. "das hängt davon ab") — das
 * erwies sich als zu brüchig, weil dieselbe Ausweich-Absicht in zu vielen
 * leicht unterschiedlichen Formulierungen auftritt ("könnte hilfreich
 * sein" vs. "könnte es hilfreich sein" vs. "wäre vielleicht hilfreich"
 * usw.). Stattdessen die robustere, umgekehrte Prüfung: fehlt jede
 * erkennbare Festlegung, gilt die Antwort als ausweichend — unabhängig
 * davon, WIE sie ausweicht. */
export function isEvasiveReply(reply: string): boolean {
  if (hasBannedOpener(reply)) return true
  if (hasVagueUnconcretizedAction(reply)) return true
  return !COMMITMENT_PATTERNS.some((re) => re.test(reply))
}

/**
 * Letzte, deterministische Absicherung — greift, falls die verbotene
 * Eröffnung ("Sie stehen vor einer komplexen Situation" o.ä.) auch nach
 * allen Nachforderungs-Versuchen im ersten Satz bestehen bleibt. Live hat
 * sich gezeigt, dass diese Formulierung eine derart starke Neigung des
 * Modells ist, dass selbst mehrere verschärfte Retries (inkl. niedrigerer
 * Temperatur) sie nicht zuverlässig verhindern. Statt endlos weiter zu
 * versuchen (Kosten/Latenz), wird der ausweichende erste Satz mechanisch
 * entfernt — der Rest der Antwort ist in der Praxis meist bereits
 * eigenständig substanziell und verliert dadurch nichts Wesentliches.
 * Greift nur, wenn ein zweiter Satz übrig bleibt (sonst bliebe nichts
 * Sinnvolles stehen, dann wird die Antwort unverändert gelassen).
 */
export function stripLeadingBannedOpener(reply: string): string {
  const match = reply.match(/^(.+?[.!?])\s+([\s\S]+)$/)
  if (!match) return reply

  const [, firstSentence, rest] = match
  const firstIsBanned =
    GENERIC_OPENER_NEAR_START.test(firstSentence) || BANNED_PHRASE_PATTERNS.some((re) => re.test(firstSentence))
  if (!firstIsBanned || !rest.trim()) return reply

  const trimmedRest = rest.trim()
  return trimmedRest.charAt(0).toUpperCase() + trimmedRest.slice(1)
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
