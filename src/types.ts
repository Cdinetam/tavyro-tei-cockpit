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
// KI-Assistent (Azure OpenAI) — bewusst eingeschränktes Schema.
//
// Unterschied zum statischen Fall-Schema oben:
// - Konfidenz ist auf 'niedrig' | 'mittel' gedeckelt. 'hoch' ist für den
//   KI-Pfad nicht erreichbar, weder im Prompt noch — als zweite Sicherung —
//   serverseitig (siehe api/src/lib/schema.ts).
// - Der Ursachenbaum endet strukturell bei 'tiefenursache'. Es gibt keinen
//   AiRootCauseNode vom Typ 'entscheidungsfrage': die Entscheidungsfrage ist
//   kein Baum-Blatt, sondern ein separates, bewusst gesperrtes Feld
//   (gesperrteEntscheidungsfrage), das im Cockpit als Cliffhanger gerendert
//   wird statt als Antwort.
// ---------------------------------------------------------------------------

export type AiConfidence = 'niedrig' | 'mittel'

export interface AiHypothesis {
  id: string
  hypothese: string
  begruendung: string
  evidenzsignale: string[]
  konfidenz: AiConfidence
  zusatzinformation: string
}

export interface AiRootCauseNode {
  id: string
  label: string
  ebene: 'symptom' | 'ursache' | 'tiefenursache'
  detail: string
  dimension?: TeiDimension
  children?: AiRootCauseNode[]
}

export interface AiAnalysisResult {
  eingabeText: string
  situation: ExecutiveSituation
  symptome: string[]
  organisationssignale: OrganisationSignal[]
  hypothesen: AiHypothesis[]
  ursachenbaum: AiRootCauseNode
  /** Ein Satz, der benennt, was zur Beantwortung fehlt — beantwortet die Frage nicht. */
  gesperrteEntscheidungsfrage: string
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
