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

/** Datenschutzerklärung auf tavyro.ch — deckt den Trust Room bereits
 * explizit ab (eigener Abschnitt zur Azure-OpenAI-Verarbeitung in der
 * Schweiz, kein KI-Modell-Training). Verlinkt aus der Live-Registrierung
 * (Zustimmungs-Checkbox) und als Fussnote auf allen Live-Bildschirmen. */
export const PRIVACY_URL: Record<Lang, string> = {
  de: 'https://tavyro.ch/de/datenschutz',
  en: 'https://tavyro.ch/en/datenschutz',
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

/**
 * Ermittelt die Sprache für den ALLERERSTEN Seitenaufruf. Hat die URL einen
 * expliziten /en-Präfix, gilt dieser immer (siehe hasEnPrefix) — explizite
 * Navigation hat Vorrang. Fehlt der Präfix (z.B. ein Homepage-Link, der
 * immer fest auf die Wurzel https://tei.tavyro.ch verlinkt, unabhängig von
 * der Sprache der Homepage selbst — siehe CLAUDE.md), wird ersatzweise die
 * bevorzugte Browsersprache herangezogen (navigator.languages), damit
 * englischsprachige Besucher nicht erst manuell auf /en umschalten müssen.
 * Bewusst getrennt von getLangFromPath: der popstate-Handler in App.tsx
 * (Browser Vor-/Zurück) soll bei einer bereits sichtbaren, expliziten URL
 * immer nur die URL lesen, ohne bei jeder Navigation erneut die
 * Browsersprache heranzuziehen.
 */
export function detectInitialLang(pathname: string): Lang {
  if (hasEnPrefix(pathname)) return 'en'
  if (typeof navigator === 'undefined') return 'de'
  // Bewusst NUR die PRIMÄRE Browsersprache (navigator.languages[0], mit
  // navigator.language als Fallback), NICHT .some() über die gesamte Liste —
  // live gemeldeter Bug: viele Browser führen "en-US" o.ä. irgendwo weiter
  // hinten in der Sprachliste als Rückfall mit, selbst wenn die tatsächlich
  // eingestellte, bevorzugte Sprache Deutsch ist. Ein .some()-Check über die
  // ganze Liste erkannte dieses "en" fälschlich als Präferenz und zwang die
  // Seite bei JEDEM Neuladen auf Englisch, obwohl die Person tatsächlich
  // Deutsch bevorzugt (siehe navigator.languages-Dokumentation: die Liste ist
  // nach Präferenz sortiert, nur der erste Eintrag zählt als "bevorzugt").
  const primary =
    (navigator.languages && navigator.languages.length > 0 ? navigator.languages[0] : navigator.language) ?? ''
  return primary.toLowerCase().startsWith('en') ? 'en' : 'de'
}

interface Copy {
  meta: {
    htmlLang: string
    title: string
    description: string
  }
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
  /** Dokument-/Bild-Anhang im Chat (siehe attachments.ts/
   * useDocumentAttachment.ts) — ein einziger, geteilter Block statt
   * Duplikation unter chat/live.room, da Demo und Live denselben
   * Anhang-Button bekommen. */
  attachment: {
    buttonAria: string
    uploading: string
    truncatedNote: string
    remove: string
    expand: string
    collapse: string
    /** Alt-Text für ein als Bild-Anhang gerenderten Chat-Thumbnail. */
    imageAlt: string
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
    liveLoginLink: string
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
  live: {
    footer: string
    privacyLinkText: string
    welcome: {
      kicker: string
      heading: string
      body: string
      trustPoints: string[]
    }
    login: {
      emailPlaceholder: string
      passwordPlaceholder: string
      submit: string
      checking: string
      invalidCredentials: string
      notVerified: string
      forgotPasswordLink: string
      activateLink: string
      registerPrompt: string
      registerLink: string
    }
    register: {
      kicker: string
      heading: string
      body: string
      emailPlaceholder: string
      passwordPlaceholder: string
      passwordHint: string
      privacyBefore: string
      privacyLinkText: string
      privacyAfter: string
      submit: string
      checking: string
      successHeading: string
      successBody: (email: string) => string
      loginPrompt: string
      loginLink: string
    }
    verify: {
      checking: string
      successHeading: string
      successBody: string
      errorHeading: string
      errorBody: string
      loginButton: string
    }
    activate: {
      kicker: string
      heading: string
      body: string
      emailPlaceholder: string
      codePlaceholder: string
      submit: string
      checking: string
      successHeading: string
      successBody: string
      errorHeading: string
      loginButton: string
      backToLogin: string
    }
    forgotPassword: {
      kicker: string
      heading: string
      body: string
      emailPlaceholder: string
      submit: string
      checking: string
      sentHeading: string
      sentBody: string
      backToLogin: string
    }
    resetPassword: {
      kicker: string
      heading: string
      body: string
      passwordPlaceholder: string
      submit: string
      checking: string
      successHeading: string
      successBody: string
      errorHeading: string
      errorBody: string
      loginButton: string
      loginPrompt: string
    }
    room: {
      statusLabel: string
      logout: string
      newDialog: string
      savedKicker: string
      savedEmptyLabel: string
      deleteAria: string
      /** Button im aktiven Chat-Header, öffnet historyEmpty/savedKicker-Panel
       * direkt — ohne den Umweg über "Neues Gespräch" (das reset() aufruft). */
      historyButton: string
      historyEmpty: string
      historyCloseAria: string
      empty: {
        heading: string
        body: string
        placeholder: string
        startButton: string
      }
      active: {
        placeholder: string
        send: string
      }
    }
  }
}

const de: Copy = {
  meta: {
    htmlLang: 'de-CH',
    title: 'TaVyro Executive Intelligence® — TEI® Trust Room',
    description: 'Vertraulicher Reflexionsraum für Schweizer KMU-CEOs auf Basis der TaVyro Executive Intelligence® Methodik.',
  },
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
  attachment: {
    buttonAria: 'Dokument oder Bild anhängen',
    uploading: 'Wird gelesen…',
    truncatedNote: '(gekürzt — nur die ersten Seiten wurden berücksichtigt)',
    remove: 'Anhang entfernen',
    expand: 'Dokumenttext anzeigen',
    collapse: 'Dokumenttext ausblenden',
    imageAlt: 'Angehängtes Bild',
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
    liveLoginLink: 'Bereits Live-Zugang? Hier einloggen →',
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
      kicker: 'Demo-Version · Limite erreicht',
      heading: 'Die Limite der Demo-Version für dieses Gespräch ist erreicht.',
      body:
        'Dieses Gespräch endet hier bewusst — die volle Tiefe entsteht im persönlichen ' +
        'Erstgespräch mit Tam Nguyen. Sie können jederzeit auch ein neues Gespräch starten.',
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
  live: {
    footer: "Verarbeitet innerhalb der geschützten Azure-OpenAI-Umgebung von TaVyro",
    privacyLinkText: 'Datenschutzerklärung',
    welcome: {
      kicker: 'TaVyro Executive Intelligence® Trust Room',
      heading: 'Willkommen.',
      body:
        'Der Trust Room unterstützt Sie dabei, sensible Führungs- und Organisationsfragen ' +
        'strukturiert zu reflektieren. Er ersetzt keine Entscheidungen, sondern hilft Ihnen, ' +
        'Perspektiven zu erweitern, Risiken sichtbar zu machen und fundierte Entscheidungen ' +
        'vorzubereiten.',
      trustPoints: [
        'Vertrauliche Datenverarbeitung',
        'Verarbeitung über dedizierte Azure OpenAI Umgebung',
        'Keine Nutzung Ihrer Daten zum Training von KI-Modellen',
        'Für CEO, Geschäftsleitung und Verwaltungsrat',
      ],
    },
    login: {
      emailPlaceholder: 'E-Mail-Adresse',
      passwordPlaceholder: 'Passwort',
      submit: 'Einloggen',
      checking: 'Wird geprüft…',
      invalidCredentials: 'E-Mail oder Passwort falsch.',
      notVerified: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse (Link in der Registrierungs-E-Mail).',
      forgotPasswordLink: 'Passwort vergessen?',
      activateLink: 'Zugangscode erhalten? Konto aktivieren →',
      registerPrompt: 'Noch kein Konto?',
      registerLink: 'Konto erstellen',
    },
    register: {
      kicker: 'Konto erstellen',
      heading: 'Live-Zugang anlegen.',
      body: 'Für Konto und dauerhaften Zugang — ohne Limits, mit automatisch gespeicherten Gesprächen.',
      emailPlaceholder: 'E-Mail-Adresse',
      passwordPlaceholder: 'Passwort',
      passwordHint: 'Mindestens 8 Zeichen.',
      privacyBefore: 'Ich akzeptiere die ',
      privacyLinkText: 'Datenschutzerklärung',
      privacyAfter: '.',
      submit: 'Konto erstellen',
      checking: 'Wird angelegt…',
      successHeading: 'Fast geschafft.',
      successBody: (email) =>
        `Wir haben einen Bestätigungslink an ${email} geschickt. Bitte klicken Sie auf den Link, um Ihre E-Mail-Adresse zu bestätigen. Ihr Konto wird danach von uns geprüft — Sie erhalten im Anschluss einen Zugangscode per E-Mail, sobald es freigeschaltet ist.`,
      loginPrompt: 'Bereits ein Konto?',
      loginLink: 'Einloggen',
    },
    verify: {
      checking: 'Wird bestätigt…',
      successHeading: 'E-Mail-Adresse bestätigt.',
      successBody:
        'Ihr Konto wird nun geprüft. Sie erhalten einen Zugangscode per E-Mail, sobald es freigeschaltet ist — geben Sie ihn danach unter „Konto aktivieren“ ein.',
      errorHeading: 'Link ungültig oder abgelaufen.',
      errorBody: 'Bitte fordern Sie einen neuen Bestätigungslink an, indem Sie sich erneut registrieren.',
      loginButton: 'Jetzt einloggen',
    },
    activate: {
      kicker: 'Konto aktivieren',
      heading: 'Zugangscode eingeben.',
      body: 'Geben Sie Ihre E-Mail-Adresse und den Zugangscode ein, den Sie nach der Freigabe Ihres Kontos per E-Mail erhalten haben.',
      emailPlaceholder: 'E-Mail-Adresse',
      codePlaceholder: 'Zugangscode',
      submit: 'Konto aktivieren',
      checking: 'Wird aktiviert…',
      successHeading: 'Konto aktiviert.',
      successBody: 'Ihr Konto ist jetzt aktiv. Sie können sich einloggen.',
      errorHeading: 'E-Mail oder Code falsch, oder der Code ist abgelaufen.',
      loginButton: 'Jetzt einloggen',
      backToLogin: 'Zurück zum Login',
    },
    forgotPassword: {
      kicker: 'Passwort vergessen',
      heading: 'Neues Passwort anfordern.',
      body: 'Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort setzen können.',
      emailPlaceholder: 'E-Mail-Adresse',
      submit: 'Link anfordern',
      checking: 'Wird verschickt…',
      sentHeading: 'E-Mail verschickt.',
      sentBody: 'Falls zu dieser Adresse ein Konto existiert, finden Sie in Kürze einen Reset-Link in Ihrem Postfach.',
      backToLogin: 'Zurück zum Login',
    },
    resetPassword: {
      kicker: 'Neues Passwort',
      heading: 'Neues Passwort setzen.',
      body: 'Bitte wählen Sie ein neues Passwort für Ihr Konto.',
      passwordPlaceholder: 'Neues Passwort',
      submit: 'Passwort speichern',
      checking: 'Wird gespeichert…',
      successHeading: 'Passwort geändert.',
      successBody: 'Sie können sich jetzt mit Ihrem neuen Passwort einloggen.',
      errorHeading: 'Link ungültig oder abgelaufen.',
      errorBody: 'Bitte fordern Sie einen neuen Link über "Passwort vergessen" an.',
      loginButton: 'Zum Login',
      loginPrompt: 'Passwort geändert —',
    },
    room: {
      statusLabel: 'Live · vertrauliches Gespräch',
      logout: 'Logout',
      newDialog: 'Neues Gespräch',
      savedKicker: 'Gespeicherte Gespräche',
      savedEmptyLabel: '(ohne Text)',
      deleteAria: 'Gespeichertes Gespräch löschen',
      historyButton: 'Verlauf',
      historyEmpty: 'Noch keine gespeicherten Gespräche.',
      historyCloseAria: 'Verlauf schliessen',
      empty: {
        heading: 'Worüber möchten Sie nachdenken?',
        body: 'Ihr Gespräch wird automatisch gespeichert und ist bei jedem Login wieder abrufbar.',
        placeholder: 'Beschreiben Sie in ein paar Sätzen, was Sie beschäftigt…',
        startButton: 'Dialog starten →',
      },
      active: {
        placeholder: 'Antworten…',
        send: 'Senden',
      },
    },
  },
}

const en: Copy = {
  meta: {
    htmlLang: 'en',
    title: 'TaVyro Executive Intelligence® — TEI® Trust Room',
    description:
      'A confidential reflection space for Swiss SME CEOs, grounded in the TaVyro Executive Intelligence® methodology.',
  },
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
  attachment: {
    buttonAria: 'Attach document or image',
    uploading: 'Reading…',
    truncatedNote: '(truncated — only the first pages were included)',
    remove: 'Remove attachment',
    expand: 'Show document text',
    collapse: 'Hide document text',
    imageAlt: 'Attached image',
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
    liveLoginLink: 'Already have live access? Log in here →',
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
      kicker: 'Demo version · limit reached',
      heading: 'This conversation has reached the demo version limit.',
      body:
        'This conversation deliberately ends here — the full depth unfolds in a personal intro ' +
        'call with Tam Nguyen. You can also start a new conversation any time.',
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
  live: {
    footer: "Processed within TaVyro's protected Azure OpenAI environment",
    privacyLinkText: 'Privacy policy',
    welcome: {
      kicker: 'TaVyro Executive Intelligence® Trust Room',
      heading: 'Welcome.',
      body:
        'The Trust Room helps you reflect on sensitive leadership and organizational questions in ' +
        "a structured way. It doesn't replace decisions — it helps you broaden perspectives, " +
        'surface risks, and prepare well-founded decisions.',
      trustPoints: [
        'Confidential data processing',
        'Processed via a dedicated Azure OpenAI environment',
        'Your data is never used to train AI models',
        'For CEOs, executive teams, and boards of directors',
      ],
    },
    login: {
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      submit: 'Log in',
      checking: 'Checking…',
      invalidCredentials: 'Email or password incorrect.',
      notVerified: 'Please confirm your email address first (see the link in your registration email).',
      forgotPasswordLink: 'Forgot password?',
      activateLink: 'Got an activation code? Activate account →',
      registerPrompt: "Don't have an account yet?",
      registerLink: 'Create account',
    },
    register: {
      kicker: 'Create account',
      heading: 'Set up live access.',
      body: 'For a permanent account and access — no limits, with automatically saved conversations.',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      passwordHint: 'At least 8 characters.',
      privacyBefore: 'I accept the ',
      privacyLinkText: 'privacy policy',
      privacyAfter: '.',
      submit: 'Create account',
      checking: 'Creating…',
      successHeading: 'Almost there.',
      successBody: (email) =>
        `We've sent a confirmation link to ${email}. Please click the link to confirm your email address. Your account will then be reviewed by us — you'll receive an activation code by email once it has been approved.`,
      loginPrompt: 'Already have an account?',
      loginLink: 'Log in',
    },
    verify: {
      checking: 'Confirming…',
      successHeading: 'Email address confirmed.',
      successBody:
        "Your account is now being reviewed. You'll receive an activation code by email once it has been approved — enter it on the \"Activate account\" screen.",
      errorHeading: 'Link invalid or expired.',
      errorBody: 'Please request a new confirmation link by registering again.',
      loginButton: 'Log in now',
    },
    activate: {
      kicker: 'Activate account',
      heading: 'Enter your activation code.',
      body: 'Enter your email address and the activation code you received by email once your account was approved.',
      emailPlaceholder: 'Email address',
      codePlaceholder: 'Activation code',
      submit: 'Activate account',
      checking: 'Activating…',
      successHeading: 'Account activated.',
      successBody: 'Your account is now active. You can log in.',
      errorHeading: 'Email or code incorrect, or the code has expired.',
      loginButton: 'Log in now',
      backToLogin: 'Back to login',
    },
    forgotPassword: {
      kicker: 'Forgot password',
      heading: 'Request a new password.',
      body: "We'll send you a link to set a new password.",
      emailPlaceholder: 'Email address',
      submit: 'Request link',
      checking: 'Sending…',
      sentHeading: 'Email sent.',
      sentBody: "If this address has a registered account, you'll find a reset link in your inbox shortly.",
      backToLogin: 'Back to login',
    },
    resetPassword: {
      kicker: 'New password',
      heading: 'Set a new password.',
      body: 'Please choose a new password for your account.',
      passwordPlaceholder: 'New password',
      submit: 'Save password',
      checking: 'Saving…',
      successHeading: 'Password changed.',
      successBody: 'You can now log in with your new password.',
      errorHeading: 'Link invalid or expired.',
      errorBody: 'Please request a new link via "Forgot password".',
      loginButton: 'Go to login',
      loginPrompt: 'Password changed —',
    },
    room: {
      statusLabel: 'Live · confidential conversation',
      logout: 'Log out',
      newDialog: 'New conversation',
      savedKicker: 'Saved conversations',
      savedEmptyLabel: '(no text)',
      deleteAria: 'Delete saved conversation',
      historyButton: 'History',
      historyEmpty: 'No saved conversations yet.',
      historyCloseAria: 'Close history',
      empty: {
        heading: "What's on your mind?",
        body: 'Your conversation is saved automatically and available again every time you log in.',
        placeholder: "Describe in a few sentences what's on your mind…",
        startButton: 'Start dialogue →',
      },
      active: {
        placeholder: 'Reply…',
        send: 'Send',
      },
    },
  },
}

const dictionaries: Record<Lang, Copy> = { de, en }

export function getCopy(lang: Lang): Copy {
  return dictionaries[lang]
}

/**
 * Setzt html[lang], <title> und die Meta-Description passend zur aktuellen
 * Sprache — index.html liefert dafür nur einen statischen deutschen
 * Startwert (Server-Rendering gibt es hier nicht), ohne diesen Aufruf bliebe
 * das Dokument z.B. auf /en dauerhaft als lang="de-CH" markiert. Wird sowohl
 * von AccessGate.tsx (Zugangscode-Gate, rendert vor App.tsx) als auch von
 * App.tsx (nach Freischaltung, inkl. D | EN-Umschaltung) aufgerufen, damit
 * die Sprache in JEDER Phase des Flows korrekt im Dokument hinterlegt ist.
 */
export function applyDocumentMeta(lang: Lang): void {
  const meta = getCopy(lang).meta
  document.documentElement.lang = meta.htmlLang
  document.title = meta.title
  const descriptionTag = document.querySelector('meta[name="description"]')
  if (descriptionTag) descriptionTag.setAttribute('content', meta.description)
}
