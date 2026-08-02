/**
 * Übersetzungs-Wörterbuch für die englische Demo-Version (/en, /en/gespraech)
 * neben der deutschen Standardversion. Bewusst ein einziges, zentrales
 * Wörterbuch statt verstreuter Strings in jeder Komponente — Header.tsx,
 * Landing.tsx und TrustRoomChat.tsx importieren `getCopy(lang)` und lesen
 * daraus, statt selbst zu verzweigen. Die Konversation mit der KI selbst
 * wird separat lokalisiert (siehe api/src/lib/prompt.ts →
 * getChatSystemPrompt), dieses Modul deckt nur die UI-Texte ab.
 */

export type Lang = 'de' | 'en'

/** Erstgespräch-Buchungslink — hat auf tavyro.ch eine eigene EN-Route. */
export const BOOKING_URL: Record<Lang, string> = {
  de: 'https://tavyro.ch/de/erstgespraech-buchen',
  en: 'https://tavyro.ch/en/erstgespraech-buchen',
}

/** Locale für Datum/Zeit-Formatierung (z.B. gespeicherte Gespräche). */
export const DATE_LOCALE: Record<Lang, string> = {
  de: 'de-CH',
  en: 'en-GB',
}

// Bewusst mit Grenzprüfung (exakt "/en" oder "/en/...") statt blossem
// startsWith('/en') — sonst würde z.B. ein zukünftiger Pfad wie "/english"
// fälschlich als englische Version erkannt. Zentral hier statt in App.tsx
// definiert, damit auch AccessGate.tsx (rendert VOR App.tsx, siehe
// main.tsx) dieselbe Logik nutzen kann, ohne sie zu duplizieren — sonst
// bliebe die Zugangscode-Gate immer Deutsch, selbst bei einem Deep-Link auf
// /en/gespraech.
export function hasEnPrefix(pathname: string): boolean {
  return pathname === '/en' || pathname.startsWith('/en/')
}

/** Ermittelt die Sprache anhand des URL-Pfads (siehe App.tsx: pathToView
 * verwendet dieselbe hasEnPrefix-Grenze für den View-Teil des Pfads). */
export function getLangFromPath(pathname: string): Lang {
  return hasEnPrefix(pathname) ? 'en' : 'de'
}

interface Copy {
  gate: {
    kicker: string
    heading: string
    body: string
    noCode: string
    inputPlaceholder: string
    invalidCode: string
    checking: string
    submit: string
    footer: string
    autoAccessCta: string
    autoAccessChecking: string
    autoAccessError: string
    autoAccessEmailPlaceholder: string
    autoAccessSent: (email: string) => string
    orDivider: string
  }
  header: {
    ariaHome: string
    confidential: string
    booking: string
    langToggleAria: string
  }
  landing: {
    kicker: string
    titlePrefix: string
    titleSuffix: string
    subheading: string
    intro: string
    startButton: string
    demoNote: string
    questionsKicker: string
    questions: string[]
  }
  chat: {
    charCounterSuffix: string
    charCounterOverLimit: string
    cliffhangerLabel: string
    cliffhangerBooking: string
    exitDialog: {
      title: string
      body: string
      saveAndLeave: string
      leaveWithoutSaving: string
      cancel: string
    }
    limitReached: {
      kicker: string
      headingWithLimit: (limit: number) => string
      headingWithoutLimit: string
      body: string
      booking: string
      backToStart: string
    }
    conversationLimitReached: {
      kicker: string
      heading: string
      body: string
      newDialog: string
      booking: string
    }
    demoExpired: {
      kicker: string
      heading: string
      booking: string
    }
    empty: {
      kicker: string
      heading: string
      body: string
      demoNote: string
      placeholder: string
      startButton: string
      savedKicker: string
      savedEmptyLabel: string
      deleteAria: string
    }
    active: {
      statusMock: string
      statusLive: string
      booking: string
      newDialog: string
      placeholder: string
      send: string
    }
  }
}

const de: Copy = {
  gate: {
    kicker: 'Vertrauliche Pilotphase',
    heading: 'Diese Vorschau ist auf ausgewählte Kontakte begrenzt.',
    body: 'Den Zugangscode haben Sie von Tam Nguyen persönlich erhalten.',
    noCode: 'Kein Zugangscode?',
    inputPlaceholder: 'Zugangscode',
    invalidCode: 'Dieser Code ist nicht gültig. Bitte prüfen Sie Gross-/Kleinschreibung.',
    checking: 'Wird geprüft…',
    submit: 'Zugang bestätigen',
    footer: "Processed within TaVyro's protected Azure OpenAI environment",
    autoAccessCta: 'Code per E-Mail anfordern →',
    autoAccessChecking: 'Wird verschickt…',
    autoAccessError: 'Der Code konnte gerade nicht verschickt werden. Bitte in Kürze erneut versuchen.',
    autoAccessEmailPlaceholder: 'Ihre E-Mail-Adresse',
    autoAccessSent: (email) =>
      `Ein Zugangscode wurde an ${email} verschickt. Bitte prüfen Sie Ihr Postfach und geben Sie den Code unten ein.`,
    orDivider: 'oder',
  },
  header: {
    ariaHome: 'Zur Startseite',
    confidential: 'Vertraulich',
    booking: 'Erstgespräch buchen →',
    langToggleAria: 'Sprache wechseln',
  },
  landing: {
    kicker: 'TEI® Trust Room',
    titlePrefix: 'TaVyro Executive Intelligence',
    titleSuffix: ' – Trust Room',
    subheading: 'Executive Sparring und Organisationsdiagnostik — basierend auf C-Level-Erfahrung.',
    intro:
      'Es gibt Fragen, die sich in keinem internen KI-System stellen lassen: Kann ich meinem ' +
      'CFO noch vertrauen? Verschweigt mir die Geschäftsleitung etwas? Muss ich mich von ' +
      'einer Führungskraft trennen? Der TEI® Trust Room ist ein unabhängiger, vertraulicher ' +
      'Raum ausserhalb Ihrer eigenen Systeme — für genau diese Fragen, einfühlsam begleitet ' +
      'durch TaVyro Executive Intelligence®. Die volle Tiefe dieser Methodik entsteht im ' +
      'persönlichen Gespräch mit Tam Nguyen.',
    startButton: 'Dialog starten',
    demoNote: 'Demo-Prototyp · keine echten Kundendaten',
    questionsKicker: 'Typische Fragen von CEOs und Geschäftsleitungen',
    questions: [
      'Meine Geschäftsleitung zieht nicht am selben Strang — wo genau bricht es?',
      'Ich delegiere immer mehr, aber die Ergebnisse werden nicht besser.',
      'Ein Nachfolge- oder Besetzungsentscheid steht an, und ich bin mir nicht sicher.',
      'Wachstum bringt Reibung ins Führungsteam, die vorher nicht da war.',
    ],
  },
  chat: {
    charCounterSuffix: 'Zeichen',
    charCounterOverLimit: ' — bitte kürzen',
    cliffhangerLabel: 'Für das persönliche Gespräch',
    cliffhangerBooking: 'Erstgespräch buchen →',
    exitDialog: {
      title: 'Gespräch verlassen?',
      body:
        'Der bisherige Verlauf geht sonst verloren. Möchten Sie dieses Gespräch vorher lokal auf ' +
        'diesem Gerät speichern?',
      saveAndLeave: 'Speichern & verlassen',
      leaveWithoutSaving: 'Ohne Speichern verlassen',
      cancel: 'Abbrechen',
    },
    limitReached: {
      kicker: 'Demo-Version · Kontingent erreicht',
      headingWithLimit: (limit) =>
        `Die Demo-Version ist auf ${limit} Gespräche pro Woche begrenzt — Ihr Kontingent ist erreicht.`,
      headingWithoutLimit: 'Ihr Kontingent in der Demo-Version ist für diese Woche erreicht.',
      body:
        'Das ist bewusst so begrenzt: ein erstes Gespräch, alles Weitere gehört in einen echten ' +
        'Austausch — nicht in eine endlose Demo-Schleife.',
      booking: 'Erstgespräch buchen →',
      backToStart: 'Zurück zum Start',
    },
    conversationLimitReached: {
      kicker: 'Maximale Gesprächslänge erreicht',
      heading: 'Dieses Gespräch hat seine maximale Länge erreicht.',
      body:
        'Das ist eine rein technische Obergrenze pro einzelnem Gespräch, unabhängig von Ihrem ' +
        'Wochenkontingent — Sie können sofort ein neues Gespräch starten.',
      newDialog: 'Neues Gespräch starten',
      booking: 'Erstgespräch buchen →',
    },
    demoExpired: {
      kicker: 'Pilotphase abgeschlossen',
      heading: 'Dieser Trust Room ist aktuell nicht verfügbar.',
      booking: 'Erstgespräch buchen →',
    },
    empty: {
      kicker: 'TEI® Trust Room · Gespräch',
      heading: 'Worüber möchten Sie nachdenken?',
      body:
        'Anders als die kurze Analyse: hier entsteht ein echtes, mehrteiliges Gespräch — TEI® hört ' +
        'zu, ordnet ein und bleibt mit Ihnen im Austausch.',
      demoNote: 'Demo-Version · kostenlose Testphase, begrenzt auf wenige Gespräche pro Woche',
      placeholder: 'Beschreiben Sie in ein paar Sätzen, was Sie beschäftigt…',
      startButton: 'Dialog starten →',
      savedKicker: 'Lokal gespeicherte Gespräche auf diesem Gerät',
      savedEmptyLabel: '(ohne Text)',
      deleteAria: 'Gespeichertes Gespräch löschen',
    },
    active: {
      statusMock: 'Demo-Modus lokal · kein Live-Modell verbunden',
      statusLive: 'Demo-Version · vertrauliches Gespräch',
      booking: 'Erstgespräch buchen →',
      newDialog: 'Neuer Dialog',
      placeholder: 'Antworten…',
      send: 'Senden',
    },
  },
}

const en: Copy = {
  gate: {
    kicker: 'Confidential pilot phase',
    heading: 'This preview is limited to selected contacts.',
    body: 'You received your access code personally from Tam Nguyen.',
    noCode: "Don't have an access code?",
    inputPlaceholder: 'Access code',
    invalidCode: 'This code is not valid. Please check upper/lower case.',
    checking: 'Checking…',
    submit: 'Confirm access',
    footer: "Processed within TaVyro's protected Azure OpenAI environment",
    autoAccessCta: 'Request code by email →',
    autoAccessChecking: 'Sending…',
    autoAccessError: 'The code could not be sent right now. Please try again shortly.',
    autoAccessEmailPlaceholder: 'Your email address',
    autoAccessSent: (email) =>
      `An access code was sent to ${email}. Please check your inbox and enter the code below.`,
    orDivider: 'or',
  },
  header: {
    ariaHome: 'Back to homepage',
    confidential: 'Confidential',
    booking: 'Book an intro call →',
    langToggleAria: 'Switch language',
  },
  landing: {
    kicker: 'TEI® Trust Room',
    titlePrefix: 'TaVyro Executive Intelligence',
    titleSuffix: ' – Trust Room',
    subheading: 'Executive sparring and organisational diagnostics — grounded in C-level experience.',
    intro:
      'There are questions no internal AI system can hold: Can I still trust my CFO? Is my ' +
      'leadership team keeping something from me? Do I need to part ways with an executive? ' +
      'The TEI® Trust Room is an independent, confidential space outside your own systems — for ' +
      'exactly these questions, thoughtfully guided by TaVyro Executive Intelligence®. The full ' +
      'depth of this methodology unfolds in a personal conversation with Tam Nguyen.',
    startButton: 'Start dialogue',
    demoNote: 'Demo prototype · no real client data',
    questionsKicker: 'Typical questions from CEOs and executive teams',
    questions: [
      "My leadership team isn't pulling in the same direction — where exactly is it breaking down?",
      "I keep delegating more, but the results aren't improving.",
      "A succession or hiring decision is coming up, and I'm not sure about it.",
      'Growth is creating friction in the leadership team that wasn\'t there before.',
    ],
  },
  chat: {
    charCounterSuffix: 'characters',
    charCounterOverLimit: ' — please shorten',
    cliffhangerLabel: 'For the personal conversation',
    cliffhangerBooking: 'Book an intro call →',
    exitDialog: {
      title: 'Leave this conversation?',
      body:
        'The conversation so far will otherwise be lost. Would you like to save it locally on this ' +
        'device first?',
      saveAndLeave: 'Save & leave',
      leaveWithoutSaving: 'Leave without saving',
      cancel: 'Cancel',
    },
    limitReached: {
      kicker: 'Demo version · quota reached',
      headingWithLimit: (limit) =>
        `The demo version is limited to ${limit} conversations per week — your quota is reached.`,
      headingWithoutLimit: 'Your quota for the demo version is reached for this week.',
      body:
        "That's a deliberate limit: a first conversation — everything beyond that belongs in a real " +
        'exchange, not an endless demo loop.',
      booking: 'Book an intro call →',
      backToStart: 'Back to start',
    },
    conversationLimitReached: {
      kicker: 'Maximum conversation length reached',
      heading: 'This conversation has reached its maximum length.',
      body:
        "That's a purely technical cap per individual conversation, independent of your weekly " +
        'quota — you can start a new conversation right away.',
      newDialog: 'Start new conversation',
      booking: 'Book an intro call →',
    },
    demoExpired: {
      kicker: 'Pilot phase concluded',
      heading: 'This Trust Room is currently unavailable.',
      booking: 'Book an intro call →',
    },
    empty: {
      kicker: 'TEI® Trust Room · Conversation',
      heading: "What's on your mind?",
      body:
        'Unlike the short analysis, this is a real, multi-turn conversation — TEI® listens, reflects, ' +
        'and stays in dialogue with you.',
      demoNote: 'Demo version · free trial phase, limited to a few conversations per week',
      placeholder: "Describe in a few sentences what's on your mind…",
      startButton: 'Start dialogue →',
      savedKicker: 'Conversations saved locally on this device',
      savedEmptyLabel: '(no text)',
      deleteAria: 'Delete saved conversation',
    },
    active: {
      statusMock: 'Local demo mode · no live model connected',
      statusLive: 'Demo version · confidential conversation',
      booking: 'Book an intro call →',
      newDialog: 'New dialogue',
      placeholder: 'Reply…',
      send: 'Send',
    },
  },
}

const dictionaries: Record<Lang, Copy> = { de, en }

export function getCopy(lang: Lang): Copy {
  return dictionaries[lang]
}
