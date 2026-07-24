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

/**
 * Eine einzelne Nachricht im echten, mehrteiligen Trust-Room-Gespräch
 * (api/src/functions/chat.ts) — im Unterschied zur Einmal-Analyse unten,
 * die kein Gesprächsverlauf ist, sondern ein festes 5-Felder-Ergebnis.
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /**
   * Nur bei role: 'assistant' gesetzt — markiert eine Antwort, die bewusst
   * mit einem klaren Cliffhanger Richtung echtes Gespräch abschliesst (siehe
   * CLIFFHANGER-Logik in chat.ts/prompt.ts). Rein für die Darstellung im
   * Frontend, hat keine Bedeutung für das Modell selbst.
   */
  cliffhanger?: boolean
}

/**
 * Strukturierte Antwort des Modells für eine einzelne Nachricht im
 * mehrteiligen Gespräch-Flow (chat.ts) — anders als bei der Einmal-Analyse
 * ist "reply" weiterhin natürlicher Fliesstext, nur das Antwort-Envelope
 * selbst ist JSON, damit "themenwechsel" strukturiert mitgeliefert wird.
 */
export interface ChatReplyResult {
  reply: string
  /**
   * true, wenn die neueste Nutzer-Nachricht ein inhaltlich neues,
   * eigenständiges Thema einführt statt das bisherige Gespräch fortzusetzen.
   */
  themenwechsel: boolean
}

export const chatReplyJsonSchema = {
  name: 'tei_chat_reply',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'themenwechsel'],
    properties: {
      reply: {
        type: 'string',
        description:
          'Eine einzelne, natürliche Chat-Nachricht als Fliesstext — keine Feldstruktur, kein ' +
          'Markdown, kein eingebettetes JSON.',
      },
      themenwechsel: {
        type: 'boolean',
        description:
          'true, wenn die neueste Nutzer-Nachricht ein inhaltlich neues, eigenständiges Thema ' +
          'einführt statt das bisherige Gespräch fortzusetzen; sonst false.',
      },
    },
  },
} as const

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
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['frage', 'reflexion'],
          properties: {
            frage: {
              type: 'string',
              description:
                'Offene, einfühlsame Frage, die zum Weiterdenken einlädt — keine Checkliste, ' +
                'keine Ja/Nein-Frage, keine eingebettete Antwort oder Wertung.',
            },
            reflexion: {
              type: 'string',
              description:
                'Ein bis zwei Sätze, die einordnen, warum diese Frage für die Situation etwas ' +
                'trägt — keine Antwort auf die Frage selbst, keine Empfehlung, kein Lösungsansatz.',
            },
          },
        },
        description:
          'Offene, einfühlsame Fragen mit kurzer Reflexion, die zum Weiterdenken einladen — keine ' +
          'Checkliste, keine Ja/Nein-Fragen, keine eingebettete Antwort oder Wertung.',
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
    rueckfragen: (raw.rueckfragen ?? []).slice(0, 5),
    teaserGespraech: raw.teaserGespraech,
    advisoryNote: raw.advisoryNote,
  }
}
