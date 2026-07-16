import type { TeiDimension } from '../types'

/**
 * Die sechs Dimensionen der TaVyro Executive Intelligence® Methodik.
 * Icon, Bezeichnung und Definition wörtlich übernommen von
 * https://tavyro.ch/de/executive-intelligence, damit das Cockpit exakt
 * die Sprache der Website spiegelt statt eine eigene Variante zu erfinden.
 */
export const dimensionMeta: Record<
  TeiDimension,
  { icon: string; label: string; definition: string }
> = {
  people: {
    icon: '👥',
    label: 'People Intelligence',
    definition: 'HRIS, Rollen, Skills, Fluktuation – Talentrisiken werden proaktiv erkannt.',
  },
  organisation: {
    icon: '🏛',
    label: 'Organisation Intelligence',
    definition: 'Organigramme, Entscheidungswege, Führungsspannen – strukturelle Engpässe sichtbar machen.',
  },
  workforce: {
    icon: '🔄',
    label: 'Workforce Intelligence',
    definition: 'Kapazitäten, Auslastung, Transformation – AI-Auswirkungen messbar machen.',
  },
  governance: {
    icon: '⚖️',
    label: 'Governance Intelligence',
    definition: 'Policies, AI Richtlinien, Entscheidungsmodelle – Compliance auf einen Blick.',
  },
  business: {
    icon: '📊',
    label: 'Business Intelligence',
    definition: 'CRM, Pipeline, Projektstatus – Verbindung zwischen People-Mustern und Business Performance.',
  },
  decision: {
    icon: '🧭',
    label: 'Decision Intelligence',
    definition: 'Entscheidungsqualität, Geschwindigkeit und Klarheit auf CEO- und GL-Ebene.',
  },
}

export const dimensionOrder: TeiDimension[] = [
  'people',
  'organisation',
  'workforce',
  'governance',
  'business',
  'decision',
]
