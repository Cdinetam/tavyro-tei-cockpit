import { chatMessageText, type ChatMessage } from './schema.js'
import { getUserByEmail, saveLiveMemoryJson } from './liveUserStore.js'
import { requestJsonCompletion } from './openaiClient.js'
import {
  getConversation,
  listConversationsNeedingMemorySync,
  markConversationMemorySynced,
} from './liveConversationStore.js'

/**
 * Persistente Live-Erinnerung über Gespräche hinweg — bewusst NUR für die
 * Live-Version (Demo bleibt zustandslos). Kein Vollarchiv im Prompt, sondern
 * ein kurzes, festes JSON-Profil pro Konto (siehe das von Tam vorgegebene
 * Schema). Hypothesen sind als solche markiert und dürfen nicht als Fakt
 * behandelt werden.
 */

const MAX_LIST = 12
const MAX_SESSIONS = 12
const TRANSCRIPT_MESSAGES = 12
// Neuaufbau aus gespeicherten Gesprächen (syncConversationIntoMemory) sieht
// mehr vom Verlauf als das schnelle Update nach jeder Antwort.
const BACKFILL_TRANSCRIPT_MESSAGES = 40
const BACKFILL_MESSAGE_CHARS = 900
const MAX_FIELD = 280
const MAX_EVIDENCE = 400
const MAX_SUMMARY = 500

export interface LiveMemoryIdentity {
  ceoName: string
  /** Nur true, wenn ceoName per detectSelfIntroducedName aus einer eigenen
   * Vorstellung stammt oder die Person ihn selbst in der Erinnerungs-Ansicht
   * eingetragen hat. Unbestätigte Namen werden beim Laden verworfen. */
  ceoNameConfirmed: boolean
  role: string
  company: string
  industry: string
  companySize: string
}

export interface LiveMemoryPerson {
  name: string
  role: string
}

export interface LiveMemoryPreferences {
  communicationStyle: string
  decisionStyle: string
  preferredApproach: string
}

export interface LiveMemoryObservation {
  type: string
  observation: string
  evidence: string
  confidence: 'low' | 'medium' | 'high'
  status: 'hypothesis' | 'confirmed' | 'revised' | 'dropped'
  createdAt: string
  confirmedByUser: boolean
}

export interface LiveMemorySession {
  date: string
  conversationId: string
  summary: string
  newInsights: string[]
  nextSteps: string[]
}

export interface LiveMemory {
  identity: LiveMemoryIdentity
  keyPeople: LiveMemoryPerson[]
  strategicThemes: string[]
  openTopics: string[]
  decisions: string[]
  preferences: LiveMemoryPreferences
  observations: LiveMemoryObservation[]
  sessions: LiveMemorySession[]
}

export function emptyLiveMemory(): LiveMemory {
  return {
    identity: { ceoName: '', ceoNameConfirmed: false, role: '', company: '', industry: '', companySize: '' },
    keyPeople: [],
    strategicThemes: [],
    openTopics: [],
    decisions: [],
    preferences: { communicationStyle: '', decisionStyle: '', preferredApproach: '' },
    observations: [],
    sessions: [],
  }
}

export function parseLiveMemory(raw: string | undefined | null): LiveMemory {
  if (!raw?.trim()) return emptyLiveMemory()
  try {
    return sanitizeLiveMemory(JSON.parse(raw) as Partial<LiveMemory>)
  } catch {
    return emptyLiveMemory()
  }
}

function clip(value: unknown, max = MAX_FIELD): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function stringList(value: unknown, maxItems = MAX_LIST): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => clip(item))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function sanitizeLiveMemory(input: Partial<LiveMemory> | null | undefined): LiveMemory {
  const base = emptyLiveMemory()
  const identity = (input?.identity ?? {}) as Partial<LiveMemoryIdentity>
  const preferences = (input?.preferences ?? {}) as Partial<LiveMemoryPreferences>
  const confidence = (value: unknown): LiveMemoryObservation['confidence'] =>
    value === 'high' || value === 'medium' ? value : 'low'
  const status = (value: unknown): LiveMemoryObservation['status'] =>
    value === 'confirmed' || value === 'revised' || value === 'dropped' ? value : 'hypothesis'

  const people = Array.isArray(input?.keyPeople) ? input.keyPeople : []
  const observations = Array.isArray(input?.observations) ? input.observations : []
  const sessions = Array.isArray(input?.sessions) ? input.sessions : []

  // Live beobachtet: das Modell hat den Namen eines Kunden als Namen der
  // Person gespeichert. Ein Name zählt deshalb nur mit Bestätigungs-Flag,
  // das ausschliesslich der Code setzt (refreshLiveMemory, applyUserEdit).
  const ceoNameConfirmed = identity.ceoNameConfirmed === true && Boolean(clip(identity.ceoName))

  return {
    identity: {
      ceoName: ceoNameConfirmed ? clip(identity.ceoName, 80) : '',
      ceoNameConfirmed,
      role: clip(identity.role, 120),
      company: clip(identity.company),
      industry: clip(identity.industry),
      companySize: clip(identity.companySize, 80),
    },
    keyPeople: people
      .map((person) => ({ name: clip(person?.name, 80), role: clip(person?.role, 80) }))
      .filter((person) => person.name)
      .slice(0, MAX_LIST),
    strategicThemes: stringList(input?.strategicThemes),
    openTopics: stringList(input?.openTopics),
    decisions: stringList(input?.decisions),
    preferences: {
      communicationStyle: clip(preferences.communicationStyle),
      decisionStyle: clip(preferences.decisionStyle),
      preferredApproach: clip(preferences.preferredApproach),
    },
    observations: observations
      .map((item) => ({
        type: clip(item?.type, 40) || 'possible_blind_spot',
        observation: clip(item?.observation),
        evidence: clip(item?.evidence, MAX_EVIDENCE),
        confidence: confidence(item?.confidence),
        status: status(item?.status),
        createdAt: clip(item?.createdAt, 40),
        confirmedByUser: Boolean(item?.confirmedByUser),
      }))
      .filter((item) => item.observation)
      .slice(0, MAX_LIST),
    sessions: sessions
      .map((item) => ({
        date: clip(item?.date, 40),
        conversationId: clip(item?.conversationId, 64),
        summary: clip(item?.summary, MAX_SUMMARY),
        newInsights: stringList(item?.newInsights, 4),
        nextSteps: stringList(item?.nextSteps, 4),
      }))
      .filter((item) => item.summary)
      .slice(-MAX_SESSIONS),
  }
}

export function isLiveMemoryEmpty(memory: LiveMemory): boolean {
  return (
    !memory.identity.ceoName &&
    !memory.identity.role &&
    !memory.identity.company &&
    !memory.identity.industry &&
    !memory.identity.companySize &&
    memory.keyPeople.length === 0 &&
    memory.strategicThemes.length === 0 &&
    memory.openTopics.length === 0 &&
    memory.decisions.length === 0 &&
    !memory.preferences.communicationStyle &&
    !memory.preferences.decisionStyle &&
    !memory.preferences.preferredApproach &&
    memory.observations.length === 0 &&
    memory.sessions.length === 0
  )
}

export function formatMemoryForPrompt(memory: LiveMemory, lang: 'de' | 'en'): string {
  if (isLiveMemoryEmpty(memory)) return ''
  const json = JSON.stringify(memory)
  if (lang === 'en') {
    return `

ACCOUNT MEMORY (internal, do not read out as a list):
The following JSON is a compact note from earlier Live conversations with this person. Use it actively as background: link to open topics, decisions and next steps from earlier sessions when they fit the current concern (e.g. "Last time we were looking at …, does that connect here?"), instead of starting from zero. Do not treat it as something just said in this chat. Items with status "hypothesis" or confirmedByUser false are provisional — use them as sparring hypotheses, not as facts. If the person contradicts the note, their current statement wins. Do not read the note out as a list. identity.ceoName is the only name of the person themselves; all names in keyPeople belong to other people.

${json}`
  }
  return `

KONTO-ERINNERUNG (intern, nicht als Liste vorlesen):
Das folgende JSON ist eine knappe Notiz aus früheren Live-Gesprächen mit dieser Person. Nutze sie aktiv als Hintergrund: knüpfe an offene Themen, Entscheidungen und nächste Schritte aus früheren Sessions an, wenn sie zum aktuellen Anliegen passen (z.B. "Letztes Mal ging es um …, hängt das hier zusammen?"), statt bei null zu beginnen. Behaupte nichts daraus als soeben gesagt. Einträge mit status "hypothesis" oder confirmedByUser false sind vorläufig — behandle sie als Sparring-Hypothese, nicht als Tatsache. Widerspricht die Person der Notiz, gilt ihre aktuelle Aussage. Lies die Notiz nicht als Liste vor. identity.ceoName ist der einzige Name der Person selbst; alle Namen unter keyPeople gehören anderen Personen.

${json}`
}

function transcript(messages: ChatMessage[], maxMessages = TRANSCRIPT_MESSAGES, maxChars = 1200): string {
  return messages
    .slice(-maxMessages)
    .map((message) => {
      const text = chatMessageText(message.content).slice(0, maxChars)
      return `${message.role}: ${text || '[ohne Text]'}`
    })
    .join('\n\n')
}

const MEMORY_UPDATE_SYSTEM = `Du aktualisierst eine persistente Gesprächs-Notiz für denselben Menschen über mehrere Sessions hinweg. Ziel: ein zusammenhängendes Bild der Person, ihres Unternehmens und ihrer Themen über alle Gespräche hinweg.
Gib NUR JSON zurück, exakt in diesem Schema:
{
  "identity": { "ceoName": "", "role": "", "company": "", "industry": "", "companySize": "" },
  "keyPeople": [{ "name": "", "role": "" }],
  "strategicThemes": [],
  "openTopics": [],
  "decisions": [],
  "preferences": { "communicationStyle": "", "decisionStyle": "", "preferredApproach": "" },
  "observations": [{ "type": "possible_blind_spot", "observation": "", "evidence": "", "confidence": "low", "status": "hypothesis", "createdAt": "", "confirmedByUser": false }],
  "currentSession": { "summary": "", "newInsights": [], "nextSteps": [] }
}
Regeln:
- identity, keyPeople, openTopics, decisions, preferences: nur was die Person selbst gesagt oder klar bestätigt hat. Sonst leerer String / weglassen.
- identity.ceoName: immer leer lassen, das System setzt ihn selbst. identity.role ist die eigene Funktion der Person (z.B. "CEO und Inhaber"), nur wenn sie das selbst sagt. Namen von Mitarbeitenden, Kunden, Familienmitgliedern oder anderen erwähnten Personen gehören höchstens in keyPeople, mit Rolle (z.B. "Kunde").
- strategicThemes: übergeordnete, länger laufende Themen über mehrere Gespräche hinweg (z.B. "Nachfolge in der GL", "Internationalisierung"), keine Einzelfragen. openTopics: konkrete offene Punkte.
- observations dürfen Hypothesen enthalten; dann status=hypothesis, confirmedByUser=false, confidence=low oder medium. evidence kurz belegen.
- Erfinde keine Namen, Zahlen, Firmen.
- Bestehende Einträge nicht stillschweigend verwerfen: strategicThemes, openTopics, decisions und keyPeople aus der bisherigen Notiz behalten, solange sie nicht erledigt oder widerlegt sind. Doppelte Einträge zusammenführen.
- currentSession: knappe Zusammenfassung NUR dieses aktuellen Gesprächs (Thema, Stand, vereinbarte oder vorgeschlagene nächste Schritte). Frühere Sessions verwaltet das System selbst, gib sie nicht zurück.
- Wenn nichts Neues vorliegt: gib die bisherige Notiz bereinigt zurück.
- Kurz halten. Keine Fliesstexte.`

const ATTACHMENT_MARKER_PREFIX = '[TEI-ATTACHMENT:'
const NAME_WORD = "[A-ZÄÖÜ][\\p{L}'’-]+"
const SELF_INTRO_PATTERNS = [
  new RegExp(`\\b(?:mein name ist|ich heisse|ich heiße|my name is)\\s+(${NAME_WORD}(?:\\s+${NAME_WORD})?)`, 'iu'),
  new RegExp(`\\b(?:[Ii]ch bin|I am|[Ii]['’]m)\\s+(${NAME_WORD}(?:\\s+${NAME_WORD})?)\\s*(?:[,.!;]|$|\\s+(?:und|and|der|die|CEO|Inhaber|Gründer|Founder|von|of|bei|at)\\b)`, 'u'),
]
// "Ich bin CEO", "Ich bin Inhaber" o.ä. sind Rollen, keine Namen.
const NOT_A_NAME = new Set(
  [
    'ceo', 'cfo', 'coo', 'chro', 'cto', 'inhaber', 'inhaberin', 'gründer', 'gründerin', 'geschäftsführer',
    'geschäftsführerin', 'unternehmer', 'unternehmerin', 'verwaltungsrat', 'verwaltungsrätin', 'mitglied',
    'partner', 'partnerin', 'founder', 'owner', 'head', 'director', 'manager', 'teil', 'neu', 'new', 'not',
    'nicht', 'unsicher', 'sicher', 'froh', 'hier', 'here', 'sure', 'unsure', 'happy',
  ],
)

function userTextWithoutAttachments(message: ChatMessage): string {
  const text = chatMessageText(message.content)
  const markerAt = text.indexOf(ATTACHMENT_MARKER_PREFIX)
  return markerAt >= 0 ? text.slice(0, markerAt) : text
}

/** Liefert den Namen nur, wenn die Person sich in einer eigenen Nachricht
 * ausdrücklich selbst vorstellt — Dokument-Anhänge (z.B. eingefügte
 * Kunden-E-Mails) werden bewusst ignoriert. Die jüngste Vorstellung gewinnt. */
export function detectSelfIntroducedName(messages: ChatMessage[]): string {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'user') continue
    const text = userTextWithoutAttachments(message)
    for (const pattern of SELF_INTRO_PATTERNS) {
      const match = pattern.exec(text)
      const name = match?.[1]?.trim()
      if (name && !NOT_A_NAME.has(name.split(/\s+/)[0].toLowerCase())) return clip(name, 80)
    }
  }
  return ''
}

// Azure Table Storage: eine String-Eigenschaft fasst höchstens 64 KiB
// (UTF-16, also ~32'000 Zeichen). Reserve für Umlaute/Escapes.
const MAX_STORED_JSON_CHARS = 28000

/** Kürzt bei Bedarf zuerst Details der ältesten Sessions, dann ganze alte
 * Sessions, dann Belege der Hypothesen — das aktuelle Profil bleibt. */
function serializeForStorage(memory: LiveMemory): string {
  if (isLiveMemoryEmpty(memory)) return ''
  const next: LiveMemory = structuredClone(memory)
  let json = JSON.stringify(next)
  for (const session of next.sessions) {
    if (json.length <= MAX_STORED_JSON_CHARS) return json
    session.newInsights = []
    session.nextSteps = []
    json = JSON.stringify(next)
  }
  while (json.length > MAX_STORED_JSON_CHARS && next.sessions.length > 1) {
    next.sessions.shift()
    json = JSON.stringify(next)
  }
  for (const observation of next.observations) {
    if (json.length <= MAX_STORED_JSON_CHARS) return json
    observation.evidence = ''
    json = JSON.stringify(next)
  }
  return json
}

export async function loadLiveMemory(email: string): Promise<LiveMemory> {
  const user = await getUserByEmail(email)
  return parseLiveMemory(user?.memoryJson)
}

export async function clearLiveMemory(email: string): Promise<void> {
  await saveLiveMemoryJson(email, '')
}

/**
 * Sessions werden hier deterministisch gepflegt statt vom Modell: genau ein
 * Eintrag pro Gespräch (per conversationId überschrieben). Vorher hängte das
 * Modell bei JEDER Antwort eine neue Session an — ein einziges längeres
 * Gespräch verdrängte so alle früheren Gespräche aus den wenigen Slots.
 */
export async function refreshLiveMemory(
  email: string,
  messages: ChatMessage[],
  conversationId: string | null,
  options: { backfill?: boolean; sessionDate?: string } = {},
): Promise<void> {
  const previous = await loadLiveMemory(email)
  const today = options.sessionDate || new Date().toISOString().slice(0, 10)
  const conversationText = options.backfill
    ? transcript(messages, BACKFILL_TRANSCRIPT_MESSAGES, BACKFILL_MESSAGE_CHARS)
    : transcript(messages)
  const { sessions: previousSessions, ...profile } = previous
  const currentEntry = conversationId
    ? previousSessions.find((session) => session.conversationId === conversationId)
    : undefined
  const earlierSessions = previousSessions.filter((session) => session !== currentEntry)

  const userPrompt =
    `Bisherige Notiz:\n${JSON.stringify(profile)}\n\n` +
    `Frühere Sessions (nur Kontext, nicht zurückgeben):\n${JSON.stringify(earlierSessions)}\n\n` +
    (currentEntry ? `Bisheriger Stand dieser Session:\n${JSON.stringify(currentEntry)}\n\n` : '') +
    `Datum dieser Session: ${today}\n\nGesprächsausschnitt dieser Session:\n${conversationText}`

  const raw = await requestJsonCompletion(MEMORY_UPDATE_SYSTEM, userPrompt, 1200, options.backfill ? 15000 : 8000)
  const parsed = JSON.parse(raw) as Partial<LiveMemory> & { currentSession?: Partial<LiveMemorySession> }

  const session: LiveMemorySession = {
    date: today,
    conversationId: conversationId ?? '',
    summary: clip(parsed.currentSession?.summary, MAX_SUMMARY),
    newInsights: stringList(parsed.currentSession?.newInsights, 4),
    nextSteps: stringList(parsed.currentSession?.nextSteps, 4),
  }
  const sessions = session.summary ? [...earlierSessions, session] : previousSessions

  const ceoName = detectSelfIntroducedName(messages) || previous.identity.ceoName
  const identity = {
    ...(parsed.identity ?? previous.identity),
    ceoName,
    ceoNameConfirmed: Boolean(ceoName),
  }

  const next = sanitizeLiveMemory({ ...parsed, identity, sessions })
  await saveLiveMemoryJson(email, serializeForStorage(next))
}

/**
 * Arbeitet bis zu `maxConversations` gespeicherte Gespräche, deren aktueller
 * Stand noch nicht in der Erinnerung steckt, nacheinander ein (älteste
 * zuerst). Schrittweise statt in einem Rutsch, weil der SWA-Proxy einen
 * einzelnen Request nach rund 45 s abbricht — der Client ruft den Endpoint
 * so lange erneut auf, bis `remaining` 0 ist.
 */
export async function syncPendingConversationsIntoMemory(
  email: string,
  timeBudgetMs = 22000,
  maxConversations = 3,
): Promise<{ processed: number; remaining: number }> {
  const startedAt = Date.now()
  const pending = await listConversationsNeedingMemorySync(email)
  let processed = 0

  for (const id of pending) {
    if (processed >= maxConversations || Date.now() - startedAt > timeBudgetMs) break
    const conversation = await getConversation(email, id)
    if (conversation && conversation.messages.length > 0) {
      try {
        await refreshLiveMemory(email, conversation.messages, id, {
          backfill: true,
          sessionDate: new Date(conversation.updatedAt || Date.now()).toISOString().slice(0, 10),
        })
      } catch {
        // Nicht als eingearbeitet markieren: beim nächsten Öffnen erneut
        // versuchen. Abbrechen statt weiterzumachen, damit der Client mit
        // processed 0 die Schleife beendet.
        break
      }
    }
    await markConversationMemorySynced(email, id)
    processed++
  }

  return { processed, remaining: pending.length - processed }
}

/** Korrektur durch die Person selbst (Erinnerungs-Ansicht). Ein dort selbst
 * eingetragener Name gilt als bestätigt. */
export async function applyUserMemoryEdit(email: string, edited: Partial<LiveMemory>): Promise<LiveMemory> {
  const identity = (edited.identity ?? {}) as Partial<LiveMemoryIdentity>
  const next = sanitizeLiveMemory({
    ...edited,
    identity: { ...identity, ceoNameConfirmed: Boolean(clip(identity.ceoName)) } as LiveMemoryIdentity,
  })
  await saveLiveMemoryJson(email, serializeForStorage(next))
  return next
}

/** Entfernt die Zusammenfassung eines gelöschten Gesprächs aus der
 * Erinnerung. Daraus abgeleitete Profil-Einträge lassen sich nicht sauber
 * zuordnen und bleiben — die Person kann sie in der Ansicht löschen. */
export async function removeConversationFromMemory(email: string, conversationId: string): Promise<void> {
  const memory = await loadLiveMemory(email)
  const sessions = memory.sessions.filter((session) => session.conversationId !== conversationId)
  if (sessions.length === memory.sessions.length) return
  await saveLiveMemoryJson(email, serializeForStorage({ ...memory, sessions }))
}
