/**
 * Kanonisches Schema für den KI-Analyse-Contract zwischen Azure Function und
 * Frontend. Bewusst hier dupliziert statt aus src/types.ts importiert, da
 * `func pack` beim Deployment nur den Inhalt von /api bündelt — ein Import
 * ausserhalb dieses Ordners würde beim Deploy stillschweigend brechen.
 *
 * WICHTIG: Wird dieses Schema geändert, muss src/types.ts (AiAnalysisResult
 * und verwandte Typen) manuell synchron gehalten werden.
 */

export type AiConfidence = 'niedrig' | 'mittel'

/**
 * Die sechs Dimensionen der TaVyro Executive Intelligence® Methodik
 * (siehe tavyro.ch/de/executive-intelligence). Jedes Organisationssignal
 * und jeder Ursachenbaum-Knoten wird einer davon zugeordnet.
 */
export type TeiDimension = 'people' | 'organisation' | 'workforce' | 'governance' | 'business' | 'decision'

const DIMENSION_ENUM: TeiDimension[] = [
  'people',
  'organisation',
  'workforce',
  'governance',
  'business',
  'decision',
]

const DIMENSION_FIELD_DESCRIPTION =
  'Eine der sechs TEI Dimensionen. Vertrauen/Misstrauen zwischen Menschen ' +
  'sowie "eigene Agenda"/Eigeninteressen sind IMMER "people", auch wenn es ' +
  'um Entscheidungsverhalten geht. Nicht-Umsetzung einer konkreten ' +
  'Entscheidung ("Anweisungen werden nicht befolgt") ist "decision", nicht ' +
  '"governance" oder "organisation".'

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
  dimension: TeiDimension
  children?: AiRootCauseNode[]
}

export interface AiAnalysisResult {
  eingabeText: string
  situation: ExecutiveSituation
  symptome: string[]
  organisationssignale: OrganisationSignal[]
  hypothesen: AiHypothesis[]
  ursachenbaum: AiRootCauseNode
  gesperrteEntscheidungsfrage: string
  advisoryNote: string
}

/**
 * JSON-Schema für Azure OpenAI structured outputs (response_format:
 * json_schema, strict: true). Erfordert ein Modell/Deployment, das strict
 * structured outputs unterstützt (z.B. gpt-4o, gpt-4o-mini, aktuelle
 * API-Version). Falls das Deployment das nicht unterstützt, siehe
 * openaiClient.ts für den Fallback auf response_format: json_object.
 *
 * "description"-Felder bei "dimension" und beim Symptom-Label wiederholen
 * die wichtigsten Prompt-Regeln direkt im Schema — Modelle gewichten
 * Schema-Beschreibungen bei strukturierter Ausgabe oft zuverlässiger als
 * Fliesstext weiter oben im System-Prompt. Ergänzt, nicht ersetzt, den
 * Prompt-Text in prompt.ts.
 */
export const aiAnalysisJsonSchema = {
  name: 'tei_ai_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'situation',
      'symptome',
      'organisationssignale',
      'hypothesen',
      'ursachenbaum',
      'gesperrteEntscheidungsfrage',
      'advisoryNote',
    ],
    properties: {
      situation: {
        type: 'object',
        additionalProperties: false,
        required: ['ausgangslage', 'entscheidungsdruck', 'strategischeRelevanz', 'fuehrungsdilemma'],
        properties: {
          ausgangslage: { type: 'string' },
          entscheidungsdruck: { type: 'string' },
          strategischeRelevanz: { type: 'string' },
          fuehrungsdilemma: { type: 'string' },
        },
      },
      symptome: {
        type: 'array',
        minItems: 2,
        maxItems: 5,
        items: { type: 'string' },
      },
      organisationssignale: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'beschreibung', 'auspraegung', 'dimension'],
          properties: {
            label: { type: 'string' },
            beschreibung: { type: 'string' },
            auspraegung: { type: 'integer', minimum: 1, maximum: 5 },
            dimension: { type: 'string', enum: DIMENSION_ENUM, description: DIMENSION_FIELD_DESCRIPTION },
          },
        },
      },
      hypothesen: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'hypothese', 'begruendung', 'evidenzsignale', 'konfidenz', 'zusatzinformation'],
          properties: {
            id: { type: 'string' },
            hypothese: { type: 'string' },
            begruendung: { type: 'string' },
            evidenzsignale: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
            konfidenz: { type: 'string', enum: ['niedrig', 'mittel'] },
            zusatzinformation: { type: 'string' },
          },
        },
      },
      ursachenbaum: {
        // Zwei Ebenen tief modelliert (symptom -> ursache -> tiefenursache).
        // Keine 'entscheidungsfrage'-Ebene im Schema — diese Ebene existiert
        // im KI-Pfad bewusst nicht als Baumknoten.
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'ebene', 'detail', 'dimension', 'children'],
        properties: {
          id: { type: 'string' },
          label: {
            type: 'string',
            description:
              'Die sichtbare Gesamtauswirkung (Symptom) — muss inhaltlich ANDERS sein als ' +
              'jedes Label in organisationssignale, auch nicht als Umformulierung desselben ' +
              'Sachverhalts. organisationssignale nennen die einzelnen Muster, das Symptom ist ' +
              'die übergeordnete Beobachtung, die daraus resultiert.',
          },
          ebene: { type: 'string', enum: ['symptom'] },
          detail: { type: 'string' },
          dimension: { type: 'string', enum: DIMENSION_ENUM, description: DIMENSION_FIELD_DESCRIPTION },
          children: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'label', 'ebene', 'detail', 'dimension', 'children'],
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                ebene: { type: 'string', enum: ['ursache'] },
                detail: { type: 'string' },
                dimension: { type: 'string', enum: DIMENSION_ENUM, description: DIMENSION_FIELD_DESCRIPTION },
                children: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 1,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'label', 'ebene', 'detail', 'dimension'],
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      ebene: { type: 'string', enum: ['tiefenursache'] },
                      detail: { type: 'string' },
                      dimension: { type: 'string', enum: DIMENSION_ENUM, description: DIMENSION_FIELD_DESCRIPTION },
                    },
                  },
                },
              },
            },
          },
        },
      },
      gesperrteEntscheidungsfrage: { type: 'string' },
      advisoryNote: { type: 'string' },
    },
  },
} as const

/**
 * Deterministische Korrektur für wiederkehrende Muster, die sich per
 * Prompt-Anweisung allein nicht zuverlässig durchsetzen liessen:
 * - "Vertrauen"/"Misstrauen" landete trotz expliziter Regel wiederholt bei
 *   "decision" statt "people".
 * - "Umsetzung"/"umgesetzt" (Nicht-Befolgung von Anweisungen) landete
 *   wiederholt bei "workforce", "governance" oder "organisation" statt
 *   "decision".
 * Statt weiter nur im Prompt zu wiederholen, wird das hier hart erzwungen —
 * unabhängig davon, was das Modell ausgegeben hat. Bewusst eng gefasst
 * (nur diese zwei bekannten Fehlmuster), keine generelle Heuristik.
 */
function correctKnownDimensionMisclassifications(label: string, beschreibung: string, dimension: TeiDimension): TeiDimension {
  const text = `${label} ${beschreibung}`.toLowerCase()
  if (/vertrau|misstrau/.test(text)) return 'people'
  if (/umsetz|umgesetzt|nicht befolgt|nicht durchgesetzt/.test(text)) return 'decision'
  return dimension
}

/**
 * Zweite Sicherung, unabhängig vom Prompt: selbst wenn das Modell die
 * Vorgaben ignoriert, wird hier serverseitig geklemmt, bevor die Antwort
 * das Netzwerk verlässt. Ein Modell darf nicht mehr Gewissheit ausliefern
 * dürfen, als das Produkt versprechen will — und keine ungültige Dimension
 * darf das Frontend erreichen, sonst rendert das Dimensions-Label falsch
 * oder gar nicht.
 */
export function clampAiAnalysis(raw: AiAnalysisResult, eingabeText: string): AiAnalysisResult {
  const clampConfidence = (k: string): AiConfidence => (k === 'mittel' ? 'mittel' : 'niedrig')

  const clampDimension = (d: string): TeiDimension =>
    (DIMENSION_ENUM as string[]).includes(d) ? (d as TeiDimension) : 'organisation'

  const stripToTiefenursache = (node: AiRootCauseNode, depth: number): AiRootCauseNode => {
    const ebene: AiRootCauseNode['ebene'] =
      depth === 0 ? 'symptom' : depth === 1 ? 'ursache' : 'tiefenursache'
    const dimension = correctKnownDimensionMisclassifications(
      node.label,
      node.detail,
      clampDimension(node.dimension),
    )
    return {
      id: node.id,
      label: node.label,
      ebene,
      detail: node.detail,
      dimension,
      children:
        depth < 2 && node.children
          ? node.children.slice(0, 3).map((c) => stripToTiefenursache(c, depth + 1))
          : undefined,
    }
  }

  return {
    eingabeText,
    situation: raw.situation,
    symptome: raw.symptome.slice(0, 5),
    organisationssignale: raw.organisationssignale.slice(0, 6).map((s) => ({
      ...s,
      auspraegung: Math.min(5, Math.max(1, Math.round(s.auspraegung))) as 1 | 2 | 3 | 4 | 5,
      dimension: correctKnownDimensionMisclassifications(s.label, s.beschreibung, clampDimension(s.dimension)),
    })),
    hypothesen: raw.hypothesen.slice(0, 4).map((h) => ({
      ...h,
      konfidenz: clampConfidence(h.konfidenz),
    })),
    ursachenbaum: stripToTiefenursache(raw.ursachenbaum, 0),
    gesperrteEntscheidungsfrage: raw.gesperrteEntscheidungsfrage,
    advisoryNote: raw.advisoryNote,
  }
}
