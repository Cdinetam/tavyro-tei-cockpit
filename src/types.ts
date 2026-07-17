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

export interface AiAnalysisResult {
  eingabeText: string
  /** Empathische Reflexion: was wurde gehört, in eigenen Worten gespiegelt. */
  verstaendnis: string
  /** Unterstützende, normalisierende Einordnung — keine Bewertung, keine Diagnose, keine Lösung. */
  einordnung: string
  /** 2–4 offene, einfühlsame Rückfragen zum Weiterdenken, keine Checkliste. */
  rueckfragen: string[]
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
