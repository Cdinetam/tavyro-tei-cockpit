import type { AiAnalysisResult, AiHypothesis, AiRootCauseNode } from '../types'
import { findScenarioForText } from '../data/scenarios'

/**
 * Simuliert eine KI-Analyse lokal, ohne Azure OpenAI aufzurufen.
 *
 * Zweck: Der Cliffhanger-Flow (gedeckelte Konfidenz, Baum endet bei
 * Tiefenursache, gesperrte Entscheidungsfrage, Lead-Capture) soll sich
 * testen und zeigen lassen, bevor die Azure Function verdrahtet ist. Die
 * Ausgabe wird aus den bestehenden, sorgfältig ausgearbeiteten Referenzfällen
 * abgeleitet — inhaltlich plausibel, aber ausdrücklich nicht live generiert.
 *
 * Dieser Pfad wird ausschliesslich verwendet, wenn VITE_API_BASE_URL nicht
 * gesetzt ist (siehe aiClient.ts). Sobald die Azure Function angebunden ist,
 * kommt diese Datei nicht mehr zum Einsatz.
 */

function toAiConfidence(k: string): 'niedrig' | 'mittel' {
  return k === 'hoch' ? 'mittel' : (k as 'niedrig' | 'mittel')
}

function stopAtTiefenursache(node: {
  id: string
  label: string
  ebene: string
  detail: string
  dimension?: string
  children?: unknown[]
}): AiRootCauseNode {
  const children = (node.children as typeof node[]) ?? []
  return {
    id: node.id,
    label: node.label,
    ebene: node.ebene as AiRootCauseNode['ebene'],
    detail: node.detail,
    dimension: node.dimension as AiRootCauseNode['dimension'],
    children:
      node.ebene === 'tiefenursache'
        ? undefined
        : children
            .filter((c) => c.ebene !== 'entscheidungsfrage')
            .map((c) => stopAtTiefenursache(c)),
  }
}

function findEntscheidungsfrage(node: {
  ebene: string
  label: string
  children?: unknown[]
}): string | undefined {
  if (node.ebene === 'entscheidungsfrage') return node.label
  const children = (node.children as typeof node[]) ?? []
  for (const child of children) {
    const found = findEntscheidungsfrage(child)
    if (found) return found
  }
  return undefined
}

export async function mockAnalyze(question: string): Promise<AiAnalysisResult> {
  // simulierte Latenz, damit der Ladezustand im UI realistisch wirkt
  await new Promise((resolve) => setTimeout(resolve, 1400 + Math.random() * 900))

  const scenario = findScenarioForText(question)

  if (!scenario) {
    return buildGenericFallback(question)
  }

  const hypothesen: AiHypothesis[] = scenario.hypothesen.slice(0, 3).map((h) => ({
    id: h.id,
    hypothese: h.hypothese,
    begruendung: h.begruendung,
    evidenzsignale: h.evidenzsignale,
    konfidenz: toAiConfidence(h.konfidenz),
    zusatzinformation: h.zusatzinformation,
  }))

  const originalQuestionInTree = findEntscheidungsfrage(scenario.ursachenbaum)

  return {
    eingabeText: question,
    situation: scenario.situation,
    symptome: scenario.symptome,
    organisationssignale: scenario.organisationssignale,
    hypothesen,
    ursachenbaum: stopAtTiefenursache(scenario.ursachenbaum),
    gesperrteEntscheidungsfrage:
      originalQuestionInTree ??
      'Welche Entscheidung sich daraus konkret ergibt, hängt von Informationen ab, die sich aus einer kurzen Beschreibung nicht seriös beurteilen lassen.',
    advisoryNote:
      'Dies ist eine automatisierte Ersteinschätzung auf Basis weniger Sätze — keine geprüfte ' +
      'Organisationsanalyse. Muster und Hypothesen sind plausibel, aber nicht verifiziert. Die ' +
      'Einordnung der eigentlichen Entscheidungsfrage erfordert Kenntnis Ihrer Organisation und ' +
      'ein vertrauliches Gespräch.',
  }
}

/**
 * Ehrlicher Fallback für den lokalen Mock, wenn keiner der fünf Referenzfälle
 * thematisch passt. Wird ausschliesslich verwendet, solange kein Azure-
 * Backend verdrahtet ist (siehe aiClient.ts) — die echte Azure-OpenAI-Antwort
 * kann jede Eingabe verstehen und braucht diesen Pfad nicht. Bewusst generisch
 * formuliert anhand der tatsächlichen Eingabe, statt einen unpassenden Fall
 * mit falscher Überzeugung auszugeben.
 */
function buildGenericFallback(question: string): AiAnalysisResult {
  return {
    eingabeText: question,
    situation: {
      ausgangslage:
        'Für diese Eingabe ist im lokalen Demo-Modus kein passender Referenzfall hinterlegt. ' +
        'Diese Ersteinschätzung ist deshalb bewusst allgemein gehalten — mit angebundenem Azure ' +
        'OpenAI würde TEI® hier auf Ihre konkrete Formulierung eingehen.',
      entscheidungsdruck: 'Ohne weiteren Kontext nicht seriös einschätzbar.',
      strategischeRelevanz: 'Ohne weiteren Kontext nicht seriös einschätzbar.',
      fuehrungsdilemma: 'Ohne weiteren Kontext nicht seriös einschätzbar.',
    },
    symptome: [
      'Eingabe deutet auf eine Führungs- oder Organisationsfrage hin, die im lokalen Demo-Modus ' +
        'nicht tiefer strukturiert werden kann',
    ],
    organisationssignale: [
      {
        label: 'Demo-Modus ohne Live-Modell',
        beschreibung:
          'Diese Sitzung läuft ohne Verbindung zu Azure OpenAI. Für eine inhaltlich passende ' +
          'Analyse muss das Backend angebunden werden (siehe api/README.md).',
        auspraegung: 1,
        dimension: 'governance',
      },
    ],
    hypothesen: [],
    ursachenbaum: {
      id: 'fallback-root',
      label: 'Kein passender Referenzfall im lokalen Demo-Modus gefunden',
      ebene: 'symptom',
      dimension: 'governance',
      detail:
        'Der lokale Mock ordnet Eingaben nur groben Themen-Clustern zu. Mit angebundenem Azure ' +
        'OpenAI entfällt diese Einschränkung vollständig.',
    },
    gesperrteEntscheidungsfrage:
      'Diese konkrete Frage lässt sich erst mit einer echten Modellanbindung oder im persönlichen Gespräch einordnen.',
    advisoryNote:
      'Dies ist der lokale Demo-Modus ohne Azure-OpenAI-Anbindung — keine inhaltliche Analyse ' +
      'Ihrer Eingabe, sondern ein technischer Platzhalter. Sobald Azure OpenAI verdrahtet ist ' +
      '(siehe api/README.md), verschwindet dieser Hinweis und jede Eingabe wird echt analysiert.',
  }
}
