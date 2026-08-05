export type Confidence = 'niedrig' | 'mittel' | 'hoch'

/**
 * Die sechs Dimensionen der TaVyro Executive Intelligence® Methodik,
 * wie auf tavyro.ch/de/executive-intelligence dargestellt. Jedes
 * Organisationssignal und jeder Ursachenbaum-Knoten wird einer dieser
 * Dimensionen zugeordnet — das verbindet das Cockpit sichtbar mit der
 * Methodik auf der Website, statt zwei getrennte Sprachen zu sprechen.
 */
export type TeiDimension = 'people' | 'organisation' | 'workforce' | 'governance' | 'business' | 'decision'

export interface ExecutiveSituation {
  ausgangslage: string
  entscheidungsdruck: string
  strategischeRelevanz: string
  fuehrungsdilemma: string
}

export interface OrganisationSignal {
  label: string
  beschreibung: string
  auspraegung: 1 | 2 | 3 | 4 | 5
  dimension: TeiDimension
}

export interface RootCauseHypothesis {
  id: string
  hypothese: string
  begruendung: string
  evidenzsignale: string[]
  konfidenz: Confidence
  zusatzinformation: string
}

export interface RootCauseNode {
  id: string
  label: string
  ebene: 'symptom' | 'ursache' | 'tiefenursache' | 'entscheidungsfrage'
  detail: string
  dimension?: TeiDimension
  children?: RootCauseNode[]
}

export interface DecisionOption {
  typ: 'Sofortmassnahme' | 'Strukturelle Massnahme' | 'Führungs- und Governance-Massnahme'
  titel: string
  beschreibung: string
  horizont: string
  risiko: string
}

export interface Scenario {
  id: string
  kategorie: string
  titel: string
  unternehmensprofil: string
  ceoFrage: string
  symptome: string[]
  situation: ExecutiveSituation
  organisationssignale: OrganisationSignal[]
  hypothesen: RootCauseHypothesis[]
  ursachenbaum: RootCauseNode
  entscheidungsoptionen: DecisionOption[]
  advisoryNote: string
}

// ---------------------------------------------------------------------------
// TEI® Trust Room (Azure OpenAI) — kein Analyse-Schema mehr.
//
// Produktentscheidung: keine Einordnung mehr nach Situation, Symptomen,
// Organisationssignalen, Hypothesen, Ursachenbaum oder den sechs Intelligence-
// Dimensionen. Stattdessen eine kurze, einfühlsame Reflexion der Eingabe —
// psychologische Sicherheit statt Beratung. Siehe api/src/lib/prompt.ts für
// die inhaltliche Haltung dahinter. Der statische Referenzfall-Bereich oben
// (ExecutiveSituation, OrganisationSignal, RootCauseHypothesis, RootCauseNode,
// Scenario) bleibt davon unberührt — er zeigt weiterhin die volle,
// strukturierte TEI®-Methodik als Beispiel, unabhängig vom Live-KI-Flow.
// ---------------------------------------------------------------------------

export interface AiRueckfrage {
  /** Offene, einfühlsame Frage zum Weiterdenken — keine Checkliste, kein Ja/Nein. */
  frage: string
  /** Kurze, eigenständige Reflexion zu WARUM diese Frage etwas trägt — keine Antwort auf die Frage selbst. */
  reflexion: string
}

export interface AiAnalysisResult {
  eingabeText: string
  /** Empathische Reflexion: was wurde gehört, in eigenen Worten gespiegelt. */
  verstaendnis: string
  /** Unterstützende, normalisierende Einordnung — keine Bewertung, keine Diagnose, keine Lösung. */
  einordnung: string
  /** 2–5 offene, einfühlsame Rückfragen mit kurzer Reflexion, keine Checkliste. */
  rueckfragen: AiRueckfrage[]
  /** Ein Satz: was sich nur im persönlichen Gespräch tragen/klären lässt — beantwortet nichts. */
  teaserGespraech: string
  /** Kurzer Hinweis auf die Grenzen dieser automatisierten Ersteinschätzung. */
  advisoryNote: string
}

export type AnalyzeResponseStatus = 'ok' | 'limit_reached' | 'demo_expired' | 'error'

export interface AnalyzeResponse {
  status: AnalyzeResponseStatus
  result?: AiAnalysisResult
  sessionAnalysesUsed?: number
  sessionAnalysesLimit?: number
  demoExpiresAt?: string
  message?: string
}

// ---------------------------------------------------------------------------
// Echter, mehrteiliger Trust-Room-Gespräch-Flow (api/src/functions/chat.ts) —
// bewusst getrennt vom AiAnalysisResult oben, das ein festes Ein-Antwort-
// Ergebnis ist. Hier gibt es stattdessen einen Nachrichtenverlauf.
// ---------------------------------------------------------------------------

/**
 * Ein einzelner Inhaltsteil einer Nachricht, wenn `content` kein reiner Text
 * ist — Bild-Uploads (GPT-4o Vision). Muss synchron mit api/src/lib/
 * schema.ts (ChatContentPart) gehalten werden. Form entspricht 1:1 dem
 * Azure-OpenAI-Format, damit openaiClient.ts es unverändert durchreichen
 * kann.
 */
export type ChatContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'user' | 'assistant'
  /**
   * Normalerweise ein reiner Text-String. Bei einer Nachricht mit
   * Bild-Anhang (siehe src/lib/attachments.ts → composeMessageWithAttachments)
   * stattdessen ein Array aus Text-/Bild-Teilen — Dokument-Anhänge bleiben
   * weiterhin als eingebetteter String kodiert. IMMER über
   * chatMessageText()/chatMessageHasContent() lesen statt direkt
   * .trim()/.length auf content aufzurufen.
   */
  content: string | ChatContentPart[]
  /**
   * Nur bei role: 'assistant' gesetzt — markiert eine Antwort, die bewusst
   * mit einem klaren Cliffhanger Richtung echtes Gespräch abschliesst
   * (spätestens ab der 5. Nachricht zum selben Thema, oder sofort bei
   * einem erkannten Themenwechsel). Steuert nur die Darstellung im
   * Frontend (siehe TrustRoomChat.tsx).
   */
  cliffhanger?: boolean
}

/** Siehe api/src/lib/schema.ts → chatMessageText (muss synchron gehalten werden). */
export function chatMessageText(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .trim()
}

/** Siehe api/src/lib/schema.ts → chatMessageHasContent (muss synchron gehalten werden). */
export function chatMessageHasContent(content: ChatMessage['content']): boolean {
  if (typeof content === 'string') return content.trim().length > 0
  return content.length > 0
}

/** Liefert die image_url ALLER Bild-Teile einer Nachricht (0 bis n) — eine
 * Nachricht kann mehrere Bild-Anhänge auf einmal enthalten (siehe
 * composeMessageWithAttachments in attachments.ts). Für die
 * Bubble-Darstellung (Bild-Thumbnails). */
export function chatMessageImageUrls(content: ChatMessage['content']): string[] {
  if (typeof content === 'string') return []
  return content
    .filter((p): p is { type: 'image_url'; image_url: { url: string } } => p.type === 'image_url')
    .map((p) => p.image_url.url)
}

export type ChatResponseStatus = 'ok' | 'limit_reached' | 'conversation_limit_reached' | 'demo_expired' | 'error'

export interface ChatResponse {
  status: ChatResponseStatus
  reply?: string
  cliffhanger?: boolean
  sessionAnalysesUsed?: number
  sessionAnalysesLimit?: number
  demoExpiresAt?: string
  message?: string
}

export interface LeadRequest {
  sessionId: string
  email: string
  question: string
  note?: string
}

export interface LeadResponse {
  status: 'ok' | 'error'
  message?: string
}
