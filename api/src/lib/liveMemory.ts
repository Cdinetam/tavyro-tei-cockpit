import { chatMessageText, type ChatMessage } from './schema.js'
import { getUserByEmail, saveLiveMemoryJson } from './liveUserStore.js'
import { requestJsonCompletion } from './openaiClient.js'

/**
 * Persistente Live-Erinnerung über Gespräche hinweg — bewusst NUR für die
 * Live-Version (Demo bleibt zustandslos). Kein Vollarchiv im Prompt, sondern
 * ein kurzes, festes JSON-Profil pro Konto (siehe das von Tam vorgegebene
 * Schema). Hypothesen sind als solche markiert und dürfen nicht als Fakt
 * behandelt werden.
 */

const MAX_LIST = 8
const MAX_SESSIONS = 5
const MAX_FIELD = 280
const MAX_EVIDENCE = 400
const MAX_SUMMARY = 420

export interface LiveMemoryIdentity {
  ceoName: string
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
  summary: string
  newInsights: string[]
  nextSteps: string[]
}

export interface LiveMemory {
  identity: LiveMemoryIdentity
  keyPeople: LiveMemoryPerson[]
  openTopics: string[]
  decisions: string[]
  preferences: LiveMemoryPreferences
  observations: LiveMemoryObservation[]
  sessions: LiveMemorySession[]
}

export function emptyLiveMemory(): LiveMemory {
  return {
    identity: { ceoName: '', company: '', industry: '', companySize: '' },
    keyPeople: [],
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

  return {
    identity: {
      ceoName: clip(identity.ceoName),
      company: clip(identity.company),
      industry: clip(identity.industry),
      companySize: clip(identity.companySize, 80),
    },
    keyPeople: people
      .map((person) => ({ name: clip(person?.name, 80), role: clip(person?.role, 80) }))
      .filter((person) => person.name)
      .slice(0, MAX_LIST),
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
    !memory.identity.company &&
    !memory.identity.industry &&
    !memory.identity.companySize &&
    memory.keyPeople.length === 0 &&
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
The following JSON is a compact note from earlier Live conversations with this person. Use it as background. Do not treat it as something just said in this chat. Items with status "hypothesis" or confirmedByUser false are provisional — use them as sparring hypotheses, not as facts. If the person contradicts the note, their current statement wins. Do not mention the memory unless they ask or a natural continuation needs it.

${json}`
  }
  return `

KONTO-ERINNERUNG (intern, nicht als Liste vorlesen):
Das folgende JSON ist eine knappe Notiz aus früheren Live-Gesprächen mit dieser Person. Nutze sie als Hintergrund. Behaupte nichts daraus als soeben gesagt. Einträge mit status "hypothesis" oder confirmedByUser false sind vorläufig — behandle sie als Sparring-Hypothese, nicht als Tatsache. Widerspricht die Person der Notiz, gilt ihre aktuelle Aussage. Erwähne die Erinnerung nicht ausdrücklich, ausser sie fragt danach oder ein natürlicher Anschluss braucht sie.

${json}`
}

function transcript(messages: ChatMessage[]): string {
  return messages
    .slice(-8)
    .map((message) => {
      const text = chatMessageText(message.content).slice(0, 1200)
      return `${message.role}: ${text || '[ohne Text]'}`
    })
    .join('\n\n')
}

const MEMORY_UPDATE_SYSTEM = `Du aktualisierst eine persistente Gesprächs-Notiz für denselben Menschen über mehrere Sessions hinweg.
Gib NUR JSON zurück, exakt in diesem Schema:
{
  "identity": { "ceoName": "", "company": "", "industry": "", "companySize": "" },
  "keyPeople": [{ "name": "", "role": "" }],
  "openTopics": [],
  "decisions": [],
  "preferences": { "communicationStyle": "", "decisionStyle": "", "preferredApproach": "" },
  "observations": [{ "type": "possible_blind_spot", "observation": "", "evidence": "", "confidence": "low", "status": "hypothesis", "createdAt": "", "confirmedByUser": false }],
  "sessions": [{ "date": "", "summary": "", "newInsights": [], "nextSteps": [] }]
}
Regeln:
- identity, keyPeople, openTopics, decisions, preferences: nur was die Person selbst gesagt oder klar bestätigt hat. Sonst leerer String / weglassen.
- observations dürfen Hypothesen enthalten; dann status=hypothesis, confirmedByUser=false, confidence=low oder medium. evidence kurz belegen.
- Erfinde keine Namen, Zahlen, Firmen.
- sessions: behalte die letzten Einträge und füge die aktuelle Session kurz hinzu (ISO-Datum, knappe Zusammenfassung).
- Wenn nichts Neues vorliegt: gib die bisherige Notiz bereinigt zurück.
- Kurz halten. Keine Fliesstexte.`

export async function loadLiveMemory(email: string): Promise<LiveMemory> {
  const user = await getUserByEmail(email)
  return parseLiveMemory(user?.memoryJson)
}

export async function clearLiveMemory(email: string): Promise<void> {
  await saveLiveMemoryJson(email, '')
}

export async function refreshLiveMemory(email: string, messages: ChatMessage[]): Promise<void> {
  const previous = await loadLiveMemory(email)
  const today = new Date().toISOString().slice(0, 10)
  const userPrompt = `Bisherige Notiz:\n${JSON.stringify(previous)}\n\nHeutiges Datum: ${today}\n\nAktueller Gesprächsausschnitt:\n${transcript(messages)}`

  const raw = await requestJsonCompletion(MEMORY_UPDATE_SYSTEM, userPrompt, 900, 8000)
  const next = sanitizeLiveMemory(JSON.parse(raw) as Partial<LiveMemory>)
  await saveLiveMemoryJson(email, JSON.stringify(next))
}
