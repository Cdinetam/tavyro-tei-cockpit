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

export type GuardLang = 'de' | 'en'

const ADVICE_REQUEST_PATTERNS_DE: RegExp[] = [
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

const ADVICE_REQUEST_PATTERNS_EN: RegExp[] = [
  /what\s+should\s+i/i,
  /what\s+would\s+you\s+do/i,
  /how\s+would\s+you\s+decide/i,
  /what('?s|\s+is)\s+your\s+(suggestion|advice|tip|opinion|assessment|idea|take)/i,
  /just\s+tell\s+me/i,
  /what\s+do\s+you\s+think/i,
  /your\s+opinion/i,
  /should\s+i\s+(fire|hire|engage|keep|trust|replace)/i,
]

/** Erkennt, ob die letzte Nutzer-Nachricht ausdrücklich nach einer
 * Handlungsempfehlung fragt (auslösende Bedingung für die RATSCHLÄGE-Regel
 * im Prompt). Bewusst als Muster-Liste gehalten, nicht abschliessend —
 * natürliche Sprache hat mehr Varianten, als sich vollständig erfassen
 * lassen (siehe Modul-Kommentar oben zu den Grenzen dieser Heuristik). */
export function isExplicitAdviceRequest(text: string, lang: GuardLang = 'de'): boolean {
  const patterns = lang === 'en' ? ADVICE_REQUEST_PATTERNS_EN : ADVICE_REQUEST_PATTERNS_DE
  return patterns.some((re) => re.test(text))
}

const COMMITMENT_PATTERNS_DE: RegExp[] = [
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

const COMMITMENT_PATTERNS_EN: RegExp[] = [
  /i\s+would\s+(lean|recommend|advise|not\s+yet)/i,
  /my\s+first\s+instinct/i,
  /my\s+(preliminary\s+)?assessment/i,
  /my\s+preliminary\s+recommendation/i,
  /i\s+recommend/i,
  /i\s+advise\s+(you\s+)?(to|against)/i,
  /i\s+(would\s+)?consider\s+.{0,40}(sensible|premature|risky)/i,
  /under\s+these\s+assumptions,?\s+i\s+would/i,
  /i\s+would\s+(currently\s+)?advise\s+against/i,
  /that('s|\s+is)\s+not\s+a\s+conclusion\s+i'?d\s+draw/i,
  /given\s+the\s+circumstances.{0,40}i\s+would/i,
]

// Die von Punkt 1 des Steuerungsblocks ausdrücklich verbotenen
// Formulierungen ("Was du vermeiden musst" verbietet sie zusätzlich ganz
// generell, nicht nur als Opener). Live hat sich gezeigt, dass diese
// Phrasen nicht nur als allererster Satz auftreten, sondern auch als
// Eröffnung eines späteren Unterabschnitts ("Zunächst zum CFO: Es klingt,
// als ob...") — deshalb wird der GESAMTE Text geprüft, nicht nur der
// Anfang.
const BANNED_PHRASE_PATTERNS_DE: RegExp[] = [
  /es\s+klingt,?\s+als\s+ob/i,
  /es\s+scheint,?\s+als\s+ob/i,
  /es\s+ist\s+verst[äa]ndlich/i,
  /vielleicht\s+(k[öo]nnte\s+es\s+)?hilft?/i,
]

const BANNED_PHRASE_PATTERNS_EN: RegExp[] = [
  /it\s+sounds\s+like/i,
  /it\s+seems\s+like/i,
  /it'?s\s+understandable/i,
  /perhaps\s+it\s+(could\s+|would\s+)?help/i,
  /maybe\s+it\s+(could\s+|would\s+)?help/i,
]

// "Komplexe Situation" als generischer Öffner tritt in vielen
// unterschiedlichen Verb-Varianten auf ("Sie befinden sich in...", "Sie
// stehen vor...", "Sie sind in..."), mit unterschiedlichen Nomen
// ("Situation", "Herausforderung", "Lage") UND als zusammengesetztes Wort
// mit einem Präfix ("Führungsherausforderung" statt "Herausforderung") —
// live beobachtet: das Modell weicht bei einem verbotenen Nomen auf ein
// Synonym ODER ein Kompositum aus. \S* vor dem Nomen-Stamm erlaubt genau
// diesen Kompositum-Fall (ein beliebiges Präfix direkt vor "situation"/
// "herausforderung"/... ohne Leerzeichen dazwischen), ohne jedes mögliche
// Präfix einzeln aufzählen zu müssen. Die Kombination aus Adjektiv und
// Nomen-Stamm nahe am Anfang ist die eigentliche Struktur des ausweichenden
// Öffners, unabhängig vom genauen Wortlaut drumherum. Adjektiv-Klasse
// bewusst grosszügig gehalten (auch "kritisch", "ernst", "heikel",
// "sensibel", "angespannt", "brisant", "delikat" — live beobachtet:
// "Sie stehen vor einer kritischen Situation" nutzte ein bis dahin nicht
// erfasstes Adjektiv), da genau diese Adjektiv-für-Adjektiv-Lücke schon
// mehrfach in dieser Sitzung neu auftrat.
const GENERIC_OPENER_NEAR_START_DE =
  /^.{0,70}(komplexe[nr]?|vielschichtige[nr]?|schwierige[nr]?|herausfordernde[nr]?|kritische[nr]?|ernste[nr]?|heikle[nr]?|sensible[nr]?|angespannte[nr]?|brisante[nr]?|delikate[nr]?)\s+\S*(situation|herausforderung|lage|konstellation|gemengelage)/i

// Englisches Pendant — dieselbe Struktur (Adjektiv + evtl. zusammengesetztes
// Nomen), auf die englischen Synonyme angepasst ("challenging situation",
// "complex leadership challenge" usw.), inkl. der beiden gängigen
// Verb-Einleitungen ("you're facing", "you are in"). Adjektiv-Klasse
// ebenfalls um dieselben Synonyme wie DE erweitert (critical/serious/
// delicate/sensitive/tense), damit dieselbe Lücke nicht zuerst auf Englisch
// auftaucht.
const GENERIC_OPENER_NEAR_START_EN =
  /^.{0,70}(complex|challenging|multifaceted|difficult|critical|serious|delicate|sensitive|tense)\s+\S*(situation|challenge|circumstance|predicament)/i

/** Erkennt, ob eine Antwort eine der explizit verbotenen Formulierungen
 * enthält (irgendwo im Text) oder mit dem generischen "komplexe
 * Situation"-Muster beginnt (Steuerungsblock Punkt 1 / "Was du vermeiden
 * musst"). */
export function hasBannedOpener(reply: string, lang: GuardLang = 'de'): boolean {
  const genericOpener = lang === 'en' ? GENERIC_OPENER_NEAR_START_EN : GENERIC_OPENER_NEAR_START_DE
  const bannedPhrases = lang === 'en' ? BANNED_PHRASE_PATTERNS_EN : BANNED_PHRASE_PATTERNS_DE
  if (genericOpener.test(reply)) return true
  return bannedPhrases.some((re) => re.test(reply))
}

// Abstrakte Massnahmen, die Punkt 10 des Steuerungsblocks nur zulässt, wenn
// sie konkretisiert werden (mit wem, worüber, bis wann, welche Kriterien,
// welche Konsequenz). Bewusst als grober Signalgeber behandelt: schon die
// blosse Verwendung dieser Formulierungen ist meistens ein Zeichen, dass
// die Konkretisierung fehlt — ein gelegentlicher False Positive (eine
// bereits konkretisierte Stelle löst trotzdem einen Retry aus) kostet nur
// etwas Latenz, keine inhaltliche Qualität.
// Bewusst wortstellungs-unabhängig gehalten (kein "X gefolgt von Y"-Zwang):
// live hat sich gezeigt, dass z.B. "Führen Sie ein offenes Gespräch..."
// (Verb zuerst) genauso vorkommt wie "ein offenes Gespräch führen" (Verb
// zuletzt) — die blosse Kombination aus Adjektiv und "Gespräch" ist schon
// der eigentliche Signalgeber, unabhängig von der Satzstellung.
const VAGUE_ACTION_PATTERNS_DE: RegExp[] = [
  /(kl[äa]rendes|ehrliches|offenes)\s+gespr[äa]ch/i,
  /transparent\s+(zu\s+)?kommunizieren/i,
  /erwartungen\s+(zu\s+)?kl[äa]ren/i,
  /kl[äa]ren\s+sie\s+.{0,20}erwartungen/i,
  /langfristige\s+ziele\s+(zu\s+)?ber[üu]cksichtigen/i,
  /vor-?\s*und\s+nachteile\s+(ab)?w[äa]gen/i,
]

const VAGUE_ACTION_PATTERNS_EN: RegExp[] = [
  /(honest|open|clarifying)\s+conversation/i,
  /communicate\s+transparently/i,
  /clarify\s+expectations/i,
  /take\s+long-?term\s+goals\s+into\s+account/i,
  /weigh(ing)?\s+(the\s+)?pros\s+and\s+cons/i,
]

/** Erkennt, ob eine Antwort eine der nicht-konkretisierten Pauschal-
 * Empfehlungen enthält, die Punkt 10 des Steuerungsblocks ohne
 * Konkretisierung verbietet. */
export function hasVagueUnconcretizedAction(reply: string, lang: GuardLang = 'de'): boolean {
  const patterns = lang === 'en' ? VAGUE_ACTION_PATTERNS_EN : VAGUE_ACTION_PATTERNS_DE
  return patterns.some((re) => re.test(reply))
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
export function isEvasiveReply(reply: string, lang: GuardLang = 'de'): boolean {
  if (hasBannedOpener(reply, lang)) return true
  if (hasVagueUnconcretizedAction(reply, lang)) return true
  const commitmentPatterns = lang === 'en' ? COMMITMENT_PATTERNS_EN : COMMITMENT_PATTERNS_DE
  return !commitmentPatterns.some((re) => re.test(reply))
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
export function stripLeadingBannedOpener(reply: string, lang: GuardLang = 'de'): string {
  const match = reply.match(/^(.+?[.!?])\s+([\s\S]+)$/)
  if (!match) return reply

  const genericOpener = lang === 'en' ? GENERIC_OPENER_NEAR_START_EN : GENERIC_OPENER_NEAR_START_DE
  const bannedPhrases = lang === 'en' ? BANNED_PHRASE_PATTERNS_EN : BANNED_PHRASE_PATTERNS_DE

  const [, firstSentence, rest] = match
  const firstIsBanned = genericOpener.test(firstSentence) || bannedPhrases.some((re) => re.test(firstSentence))
  if (!firstIsBanned || !rest.trim()) return reply

  const trimmedRest = rest.trim()
  return trimmedRest.charAt(0).toUpperCase() + trimmedRest.slice(1)
}

// Verbotene Listen-Formatierung ("-, *, 1., 2." laut FORMAT-Regel im
// System-Prompt) — live beobachtet: die deutsche Antwort hält sich
// zuverlässig an Fliesstext, die englische Antwort rutscht bei
// "Sequence of action"/"next steps" auffällig oft in eine sichtbare
// nummerierte Liste ("1. ... 2. ... 3. ...") ab, obwohl exakt dieselbe
// FORMAT-Regel (nur übersetzt) auch dort steht. Sprachunabhängig geprüft,
// da es reine Zeichen-/Formatierungserkennung ist, kein Sprachmuster.
const LIST_MARKER_PATTERN = /(^|\n)[ \t]*(?:[-*]|\d+[.)])[ \t]+/g

/** Erkennt, ob eine Antwort eine verbotene Aufzählungs-/Nummerierungs-
 * Formatierung enthält (Bindestrich, Stern oder "1."/"1)" am Zeilenanfang) —
 * das Feld "reply" wird im Frontend als reiner Fliesstext gerendert
 * (whitespace-pre-line), eine sichtbare Nummerierung sieht dort kaputt statt
 * gestylt aus. */
export function hasListFormatting(reply: string): boolean {
  LIST_MARKER_PATTERN.lastIndex = 0
  return LIST_MARKER_PATTERN.test(reply)
}

/** Kombinierte Prüfung, ob eine Antwort einen weiteren Nachforderungs-
 * Versuch auslösen sollte: entweder weil sie ausweichend ist (siehe
 * isEvasiveReply) oder weil sie gegen die Fliesstext-Formatierungsregel
 * verstösst (siehe hasListFormatting). Beide Gründe sind unabhängig
 * voneinander möglich — eine Antwort kann inhaltlich vollständig
 * entscheidungsfreudig sein und trotzdem eine verbotene Liste enthalten. */
export function needsReinforcedRetry(reply: string, lang: GuardLang = 'de'): boolean {
  return isEvasiveReply(reply, lang) || hasListFormatting(reply)
}

/**
 * Letzte, deterministische Absicherung — analog zu
 * stripLeadingBannedOpener, aber für Listen-Formatierung: entfernt nur die
 * Aufzählungs-/Nummerierungs-Zeichen am Zeilenanfang, behält Zeilenumbrüche
 * und den restlichen Text unverändert bei. Kein Versuch, die Sätze zu einem
 * einzigen Fliesstext-Absatz zusammenzuführen (zu fehleranfällig ohne
 * weiteren Modell-Aufruf) — das Ergebnis liest sich als mehrere kurze,
 * durch Zeilenumbruch getrennte Sätze, was die bestehende
 * whitespace-pre-line-Darstellung im Frontend weiterhin sauber anzeigt.
 */
export function stripListMarkers(reply: string): string {
  return reply.replace(LIST_MARKER_PATTERN, '$1')
}

/** Wird als zusätzlicher, nur für den Nachforderungs-Versuch geltender
 * Hinweis an den System-Prompt angehängt (siehe requestChatReply). */
export const ADVICE_REINFORCEMENT_DE = `VERSTÄRKUNGS-HINWEIS FÜR DIESEN NACHFORDERUNGS-VERSUCH (interner Kontext,
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
Reflexionsfrage, wie in Punkt 11 der festen Antwortstruktur vorgesehen.
Schreibe die Reihenfolge der nächsten Schritte als Fliesstext in Sätzen
("Zunächst ..., danach ..., abschliessend ...") — NICHT als sichtbare
nummerierte Liste ("1. ... 2. ... 3. ...") oder Aufzählung mit Bindestrichen
oder Sternen.`

/** Englisches Pendant zu ADVICE_REINFORCEMENT_DE — Formulierungen müssen zu
 * den englischen COMMITMENT_PATTERNS_EN/BANNED_PHRASE_PATTERNS_EN passen. */
export const ADVICE_REINFORCEMENT_EN = `REINFORCEMENT NOTE FOR THIS RETRY (internal context, not visible to the
person): Your previous reply either began with an explicitly forbidden
phrase (see steering block point 1 — e.g. "It sounds like", "You're facing
a complex situation") or contained no recognisable preliminary position
(point 7) — only observation, differentiation and/or a follow-up question,
but no recommendation of your own. This new reply must begin with a clear
core thesis (point 1) and add a preliminary position using the required
phrasing "My preliminary recommendation is ..." (alternatively "Under these
assumptions, I would ..." or "I would not yet make a long-term commitment
..."), followed by a short, concrete justification tied to what the person
actually described. After that, continue as needed with the sequence of
next steps, a decision rule, and at most one reflection question, as set
out in point 11 of the fixed response structure.
Write the sequence of next steps as flowing prose in sentences ("First, ...
Next, ... Finally, ...") — NOT as a visible numbered list ("1. ... 2. ...
3. ...") or a bullet list with dashes or asterisks.`

/** Wählt den passenden Reinforcement-Text anhand der Sprache. */
export function getAdviceReinforcement(lang: GuardLang = 'de'): string {
  return lang === 'en' ? ADVICE_REINFORCEMENT_EN : ADVICE_REINFORCEMENT_DE
}
