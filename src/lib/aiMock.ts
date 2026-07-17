import type { AiAnalysisResult } from '../types'

/**
 * Simuliert eine TEI® Trust Room-Antwort lokal, ohne Azure OpenAI aufzurufen.
 *
 * Dieser Pfad wird ausschliesslich verwendet, wenn VITE_API_BASE_URL nicht
 * gesetzt ist (siehe aiClient.ts). Sobald die Azure Function angebunden ist,
 * kommt diese Datei nicht mehr zum Einsatz — die echte Azure-OpenAI-Antwort
 * geht inhaltlich auf die konkrete Eingabe ein, was ein lokaler Mock nicht
 * ehrlich simulieren kann. Deshalb bewusst generisch statt vorgetäuscht
 * präzise.
 */
export async function mockAnalyze(question: string): Promise<AiAnalysisResult> {
  // simulierte Latenz, damit der Ladezustand im UI realistisch wirkt
  await new Promise((resolve) => setTimeout(resolve, 1400 + Math.random() * 900))

  return {
    eingabeText: question,
    verstaendnis:
      'Im lokalen Demo-Modus ohne Azure-OpenAI-Anbindung kann TEI® Ihre Eingabe nicht wirklich ' +
      'lesen und spiegeln — mit angebundenem Azure OpenAI würde hier eine Reflexion stehen, die ' +
      'erkennbar auf Ihre konkrete Formulierung eingeht, statt auf diesen Platzhaltertext.',
    einordnung:
      'Dass Sie eine Führungs- oder Organisationsfrage überhaupt in eigenen Worten aufschreiben ' +
      'und sich dafür einen Moment nehmen, ist bereits ein guter Ausgangspunkt — unabhängig davon, ' +
      'ob dieser Demo-Modus die Situation gerade inhaltlich erfassen kann oder nicht.',
    rueckfragen: [
      'Was hat Sie dazu bewogen, genau jetzt eine Antwort auf diese Frage zu suchen?',
      'Wie würde es sich anfühlen, wenn diese Situation gelöst wäre?',
    ],
    teaserGespraech:
      'Was diese Situation für Sie persönlich schwierig macht, lässt sich nur in einem echten ' +
      'Gespräch tragen — nicht in einem technischen Platzhalter wie diesem.',
    advisoryNote:
      'Dies ist der lokale Demo-Modus ohne Azure-OpenAI-Anbindung — keine inhaltliche Reflexion ' +
      'Ihrer Eingabe, sondern ein technischer Platzhalter. Sobald Azure OpenAI verdrahtet ist ' +
      '(siehe api/README.md), verschwindet dieser Hinweis und jede Eingabe wird echt gespiegelt.',
  }
}
