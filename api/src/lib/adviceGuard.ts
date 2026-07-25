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

/** Erkennt, ob eine Antwort auf eine ausdrückliche Nachfrage eine
 * erkennbare eigene Tendenz enthält. Bewusst NICHT über eine Liste
 * bekannter Ausweich-Formulierungen definiert (z.B. "das hängt davon ab") —
 * das erwies sich als zu brüchig, weil dieselbe Ausweich-Absicht in zu
 * vielen leicht unterschiedlichen Formulierungen auftritt ("könnte
 * hilfreich sein" vs. "könnte es hilfreich sein" vs. "wäre vielleicht
 * hilfreich" usw.). Stattdessen die robustere, umgekehrte Prüfung: fehlt
 * jede erkennbare Festlegung, gilt die Antwort als ausweichend — unabhängig
 * davon, WIE sie ausweicht. */
export function isEvasiveReply(reply: string): boolean {
  return !COMMITMENT_PATTERNS.some((re) => re.test(reply))
}

/** Wird als zusätzlicher, nur für den Nachforderungs-Versuch geltender
 * Hinweis an den System-Prompt angehängt (siehe requestChatReply). */
export const ADVICE_REINFORCEMENT = `VERSTÄRKUNGS-HINWEIS FÜR DIESEN NACHFORDERUNGS-VERSUCH (interner Kontext,
nicht für die Person sichtbar): Deine vorherige Antwort enthielt keine
erkennbare vorläufige Position (siehe VERBINDLICHE ANTWORTREGELN, Punkt 3) —
nur Beobachtung, Differenzierung und/oder eine Rückfrage, aber keine eigene
Empfehlung. Ergänze diese neue Antwort zwingend um einen Satz mit der
vorgeschriebenen Formulierung "Meine vorläufige Empfehlung ist ..."
(alternativ "Unter diesen Annahmen würde ich ..." oder "Ich würde noch
keine langfristige Verpflichtung eingehen ..."), gefolgt von einer kurzen,
konkreten Begründung, die sich auf das bezieht, was die Person tatsächlich
geschildert hat. Formuliere danach ggf. weiterhin die nächsten Schritte,
Entscheidungsbedingungen und höchstens eine Reflexionsfrage, wie in Punkt 4
der VERBINDLICHEN ANTWORTREGELN vorgesehen.`
