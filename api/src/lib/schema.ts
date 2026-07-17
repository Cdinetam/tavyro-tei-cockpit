/**
 * Kanonisches Schema für den KI-Antwort-Contract zwischen Azure Function und
 * Frontend. Bewusst hier dupliziert statt aus src/types.ts importiert, da
 * `func pack` beim Deployment nur den Inhalt von /api bündelt — ein Import
 * ausserhalb dieses Ordners würde beim Deploy stillschweigend brechen.
 *
 * WICHTIG: Wird dieses Schema geändert, muss src/types.ts (AiAnalysisResult)
 * manuell synchron gehalten werden.
 *
 * Produktentscheidung: TEI® Trust Room liefert keine strukturierte Analyse
 * mehr (keine sechs Dimensionen, keine Hypothesen, kein Ursachenbaum, keine
 * Konfidenzwerte). Stattdessen ein kurzes, einfühlsames Verstehen der
 * Eingabe — psychologische Sicherheit statt Beratung. Siehe prompt.ts für
 * die inhaltliche Haltung dahinter.
 */

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

/**
 * JSON-Schema für Azure OpenAI structured outputs (response_format:
 * json_schema, strict: true). Erfordert ein Modell/Deployment, das strict
 * structured outputs unterstützt (z.B. gpt-4o, gpt-4o-mini, aktuelle
 * API-Version). Falls das Deployment das nicht unterstützt, siehe
 * openaiClient.ts für den Fallback auf response_format: json_object.
 */
export const aiAnalysisJsonSchema = {
  name: 'tei_ai_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['verstaendnis', 'einordnung', 'rueckfragen', 'teaserGespraech', 'advisoryNote'],
    properties: {
      verstaendnis: {
        type: 'string',
        description:
          'Empathische, paraphrasierende Reflexion der Eingabe in eigenen Worten — zeigt, dass ' +
          'die Situation verstanden wurde. Kein Zitat, keine Analyse, keine Bewertung.',
      },
      einordnung: {
        type: 'string',
        description:
          'Unterstützende, normalisierende Einordnung, die auf die konkrete Eingabe eingeht — ' +
          'ohne Diagnose, ohne Bewertung, ohne Lösungsvorschlag.',
      },
      rueckfragen: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string' },
        description:
          'Offene, einfühlsame Fragen, die zum Weiterdenken einladen — keine Checkliste, keine ' +
          'Ja/Nein-Fragen, keine eingebettete Antwort oder Wertung.',
      },
      teaserGespraech: {
        type: 'string',
        description:
          'Ein Satz, der benennt, was sich nur im persönlichen Gespräch klären oder tragen ' +
          'lässt — ohne es zu beantworten, ohne Empfehlung, ohne Lösungsansatz.',
      },
      advisoryNote: { type: 'string' },
    },
  },
} as const

/**
 * Serverseitige Absicherung, unabhängig vom Prompt: begrenzt die Anzahl
 * Rückfragen und stellt sicher, dass eingabeText immer aus der tatsächlichen
 * Anfrage stammt, nicht aus dem Modell-Output.
 */
export function clampAiAnalysis(raw: AiAnalysisResult, eingabeText: string): AiAnalysisResult {
  return {
    eingabeText,
    verstaendnis: raw.verstaendnis,
    einordnung: raw.einordnung,
    rueckfragen: (raw.rueckfragen ?? []).slice(0, 4),
    teaserGespraech: raw.teaserGespraech,
    advisoryNote: raw.advisoryNote,
  }
}
