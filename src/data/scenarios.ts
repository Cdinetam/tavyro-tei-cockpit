import type { Scenario } from '../types'

export const scenarios: Scenario[] = [
  {
    id: 'maschinenbau-asien',
    kategorie: 'Internationalisierung',
    titel: 'Maschinenbau-KMU mit Produktionsstandort in Asien',
    unternehmensprofil:
      '210 Mitarbeitende, Hauptsitz Ostschweiz, Fertigungsstandort in Vietnam seit vier Jahren, Exportquote 70%.',
    ceoFrage: 'Ich komme nicht mehr aus dem operativen Tagesgeschäft.',
    symptome: [
      'CEO wird bei praktisch jeder Lieferentscheidung zwischen Zürich und Hanoi eingebunden',
      'Standortleitung Vietnam trifft kaum eigenständige Entscheidungen',
      'Eskalationen erreichen den CEO direkt, unabhängig von Tragweite',
      'Reisetätigkeit des CEO steigt, strategische Themen werden verschoben',
    ],
    situation: {
      ausgangslage:
        'Der Auslandstandort wurde ursprünglich als reine Kostenfertigung aufgebaut. Mit wachsendem Volumen sind dort inzwischen Qualitäts-, Termin- und Lieferantenentscheidungen von strategischer Tragweite zu treffen, ohne dass die Entscheidungskompetenz mitgewachsen ist.',
      entscheidungsdruck:
        'Hoch. Lieferverzögerungen und Qualitätsabweichungen erreichen Kunden in der Schweiz und der EU direkt, der CEO wird zur einzigen glaubwürdigen Eskalationsinstanz.',
      strategischeRelevanz:
        'Der Standort ist für die Kostenposition des Unternehmens im internationalen Wettbewerb entscheidend. Ein Steuerungsdefizit dort wirkt direkt auf Marge und Lieferfähigkeit.',
      fuehrungsdilemma:
        'Der CEO müsste Entscheidungskompetenz abgeben, um wieder Zeit für strategische Führung zu gewinnen, sieht darin aber ein Risiko für Qualität und Kundenbeziehung.',
    },
    organisationssignale: [
      { label: 'Führungsabhängigkeit vom CEO', beschreibung: 'Standortleitung eskaliert auch operative Einzelentscheidungen an den CEO.', auspraegung: 5, dimension: 'decision'  },
      { label: 'Rollenunklarheit', beschreibung: 'Entscheidungsbefugnisse zwischen Hauptsitz und Standort sind nicht dokumentiert.', auspraegung: 4, dimension: 'organisation'  },
      { label: 'Schnittstellenprobleme', beschreibung: 'Qualitätssicherung Schweiz und Produktion Vietnam kommunizieren ohne klaren Prozess.', auspraegung: 4, dimension: 'organisation'  },
      { label: 'Entscheidungsengpässe', beschreibung: 'Freigaben für Lieferantenwechsel oder Nacharbeit laufen ausschliesslich über den CEO.', auspraegung: 4, dimension: 'decision'  },
      { label: 'Operative Überlastung', beschreibung: 'CEO-Kalender ist durch operative Eskalationen dominiert, strategische Termine werden verschoben.', auspraegung: 5, dimension: 'workforce'  },
    ],
    hypothesen: [
      {
        id: 'h1',
        hypothese: 'Entscheidungsrechte am Auslandstandort wurden nie formal definiert.',
        begruendung:
          'Der Standort ist aus einem Projekt entstanden und wurde nie mit einem eigenen Entscheidungsrahmen ausgestattet, während sein operatives Gewicht seither deutlich zugenommen hat.',
        evidenzsignale: [
          'Keine dokumentierte Kompetenzordnung zwischen Hauptsitz und Standort',
          'Standortleitung eskaliert auch Entscheidungen mit geringer finanzieller Tragweite',
        ],
        konfidenz: 'hoch',
        zusatzinformation: 'Organigramm und bestehende Stellenbeschreibung der Standortleitung Vietnam.',
      },
      {
        id: 'h2',
        hypothese: 'Der CEO misstraut der fachlichen Reife der Standortleitung.',
        begruendung:
          'Wiederholte Qualitätsvorfälle könnten dazu geführt haben, dass Entscheidungen bewusst beim CEO zentralisiert wurden, unabhängig von formalen Kompetenzen.',
        evidenzsignale: [
          'CEO reist trotz stellvertretender Standortleitung persönlich zu Kundenreklamationen',
          'Standortleitung wurde in den letzten 18 Monaten nicht in strategische Lieferantengespräche einbezogen',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Historie der letzten fünf eskalierten Qualitätsfälle und wer sie gelöst hat.',
      },
      {
        id: 'h3',
        hypothese: 'Die Qualitätssicherung in der Schweiz ist strukturell nicht auf einen Auslandstandort ausgelegt.',
        begruendung:
          'Prozesse und Prüfstandards wurden für Inlandsfertigung entwickelt und nie an die Bedingungen eines Fertigungsstandorts mit anderer Lieferkette angepasst.',
        evidenzsignale: [
          'Qualitätsabweichungen häufen sich bei neu eingeführten Zulieferteilen aus Asien',
          'Keine lokale Qualitätsfunktion am Standort selbst',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Fehlerstatistik nach Ursprungsort der Komponenten der letzten zwölf Monate.',
      },
    ],
    ursachenbaum: {
      id: 'root',
      label: 'CEO bleibt operativer Flaschenhals zwischen Hauptsitz und Auslandstandort',
      dimension: 'decision',
      ebene: 'symptom',
      detail:
        'Alle Entscheidungen mit Aussenwirkung auf Kunden laufen faktisch über den CEO, unabhängig von ihrer Tragweite.',
      children: [
        {
          id: 'u1',
          label: 'Entscheidungsrechte zwischen Hauptsitz und Standort sind unklar',
          dimension: 'governance',
          ebene: 'ursache',
          detail:
            'Es existiert keine schriftliche Kompetenzordnung, die festlegt, welche Entscheidungen die Standortleitung eigenständig treffen darf.',
          children: [
            {
              id: 'u1a',
              label: 'Standortleitung wurde nie mit einem eigenen Entscheidungsmandat ausgestattet',
              dimension: 'organisation',
              ebene: 'tiefenursache',
              detail:
                'Die Rolle wurde operativ besetzt, aber nie mit definierter Weisungsbefugnis gegenüber Qualität, Lieferanten und Terminplanung versehen.',
              children: [
                {
                  id: 'q1',
                  label: 'Welche Entscheidungen darf die Standortleitung künftig ohne Rückfrage beim CEO treffen?',
                  ebene: 'entscheidungsfrage',
                  detail:
                    'Die Antwort definiert das künftige Mandat der Standortleitung und die Grenze, ab der eine Eskalation an den CEO gerechtfertigt ist.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2',
          label: 'Vertrauen in die fachliche Entscheidungsfähigkeit vor Ort ist begrenzt',
          dimension: 'people',
          ebene: 'ursache',
          detail:
            'Wiederholte Qualitätsvorfälle haben dazu geführt, dass Entscheidungen unabhängig von formaler Zuständigkeit beim CEO landen.',
          children: [
            {
              id: 'u2a',
              label: 'Standortleitung wurde bislang nicht schrittweise in strategische Entscheidungen eingebunden',
              dimension: 'people',
              ebene: 'tiefenursache',
              detail:
                'Es fehlt ein Übergangsmodell, das Entscheidungskompetenz kontrolliert und nachvollziehbar aufbaut.',
              children: [
                {
                  id: 'q2',
                  label: 'Welche Entscheidungen könnten testweise für zwei Quartale an die Standortleitung übergeben werden, mit definierter Berichtspflicht?',
                  ebene: 'entscheidungsfrage',
                  detail:
                    'Ein befristetes Mandat mit Berichtspflicht reduziert das wahrgenommene Risiko und schafft belastbare Evidenz für die weitere Delegation.',
                },
              ],
            },
          ],
        },
      ],
    },
    entscheidungsoptionen: [
      {
        typ: 'Sofortmassnahme',
        titel: 'Eskalationsfilter einführen',
        beschreibung:
          'Alle Anfragen an den CEO aus Vietnam durchlaufen ab sofort eine kurze Vorprüfung durch die Standortleitung mit Kategorisierung nach Tragweite.',
        horizont: '2 Wochen',
        risiko: 'Gering, sofern Kategorien klar definiert sind.',
      },
      {
        typ: 'Strukturelle Massnahme',
        titel: 'Kompetenzordnung Hauptsitz–Standort dokumentieren',
        beschreibung:
          'Schriftliche Festlegung, welche Entscheidungen die Standortleitung eigenständig trifft, welche mit Vorabinformation und welche zwingend eskaliert werden.',
        horizont: '4–6 Wochen',
        risiko: 'Mittel. Erfordert Abstimmung mit Qualitäts- und Vertriebsverantwortung in der Schweiz.',
      },
      {
        typ: 'Führungs- und Governance-Massnahme',
        titel: 'Befristetes erweitertes Mandat für die Standortleitung',
        beschreibung:
          'Zwei Quartale mit erweiterter Entscheidungskompetenz und wöchentlichem Kurzreporting an den CEO, danach Überprüfung und permanente Übertragung bei Bewährung.',
        horizont: '2 Quartale',
        risiko: 'Mittel bis hoch. Erfordert Bereitschaft des CEO, Eskalationen im Testzeitraum bewusst nicht anzunehmen.',
      },
    ],
    advisoryNote:
      'Diese Analyse ersetzt kein Urteil, sondern schafft eine strukturierte Grundlage für ein vertrauliches Executive Sparring. Die finale Einordnung erfolgt durch TaVyro basierend auf C-Level-Erfahrung und Kontextverständnis.',
  },

  {
    id: 'medtech-wachstum',
    kategorie: 'Wachstum & Skalierung',
    titel: 'Medtech-Unternehmen in Wachstumsphase',
    unternehmensprofil:
      '85 Mitarbeitende, Zulassungspflichtige Produkte, Mitarbeiterzahl in 24 Monaten verdoppelt, zwei neue Märkte erschlossen.',
    ceoFrage: 'Entscheidungen werden getroffen, aber nicht konsequent umgesetzt.',
    symptome: [
      'Massnahmen aus Geschäftsleitungssitzungen werden in Folgesitzungen erneut diskutiert',
      'Zwischen Entscheidung und sichtbarer Umsetzung vergehen regelmässig mehrere Monate',
      'Verantwortlichkeiten für Umsetzung sind mündlich vergeben, nicht dokumentiert',
      'Regulatorische Fristen geraten wiederholt unter Druck',
    ],
    situation: {
      ausgangslage:
        'Das Unternehmen ist in kurzer Zeit stark gewachsen, ohne dass Entscheidungs- und Umsetzungsprozesse mitskaliert wurden. Die Geschäftsleitung trifft weiterhin Entscheidungen im Stil eines kleinen Teams, das Unternehmen operiert aber bereits mit der Komplexität eines deutlich grösseren.',
      entscheidungsdruck:
        'Hoch, insbesondere bei regulatorischen und marktbezogenen Entscheidungen mit fixen externen Fristen.',
      strategischeRelevanz:
        'Verzögerte Umsetzung gefährdet Zulassungstermine und damit Markteintrittsfenster in zwei neuen Ländern.',
      fuehrungsdilemma:
        'Der CEO müsste Umsetzungsdisziplin einfordern, ohne das bislang informelle, vertrauensbasierte Führungsklima des Gründerteams zu beschädigen.',
    },
    organisationssignale: [
      { label: 'Geringe Umsetzungsdisziplin', beschreibung: 'Massnahmen ohne Termin, Verantwortlichen oder Statuskontrolle.', auspraegung: 5, dimension: 'decision'  },
      { label: 'Rollenunklarheit', beschreibung: 'Wer eine Entscheidung umsetzt, ist oft implizit statt zugewiesen.', auspraegung: 4, dimension: 'organisation'  },
      { label: 'Konflikt zwischen Wachstum und Steuerungslogik', beschreibung: 'Steuerungsinstrumente stammen aus der Zeit vor der Verdopplung der Belegschaft.', auspraegung: 4, dimension: 'governance'  },
      { label: 'Entscheidungsengpässe', beschreibung: 'Gleiche Themen werden wiederholt neu aufgerollt, da Umsetzungsstand unklar ist.', auspraegung: 3, dimension: 'decision'  },
      { label: 'Schnittstellenprobleme', beschreibung: 'Zwischen Regulatory Affairs und Produktentwicklung fehlt ein verbindlicher Abstimmungstakt.', auspraegung: 3, dimension: 'organisation'  },
    ],
    hypothesen: [
      {
        id: 'h1',
        hypothese: 'Es fehlt ein verbindliches Umsetzungstracking auf Geschäftsleitungsebene.',
        begruendung:
          'Entscheidungen werden protokolliert, aber nicht mit Termin, Owner und Statusverfolgung versehen, wodurch Umsetzung von individueller Priorisierung abhängt.',
        evidenzsignale: [
          'Sitzungsprotokolle enthalten Entscheidungen, aber keine Meilensteine',
          'Gleiche Traktanden erscheinen über mehrere Monate wiederholt auf der Agenda',
        ],
        konfidenz: 'hoch',
        zusatzinformation: 'Sitzungsprotokolle der letzten sechs Geschäftsleitungssitzungen.',
      },
      {
        id: 'h2',
        hypothese: 'Führungskräfte der zweiten Ebene wurden nicht in dem Tempo aufgebaut, in dem das Unternehmen gewachsen ist.',
        begruendung:
          'Umsetzungsverantwortung liegt formal bei Teamleitungen, die jedoch noch stark im Tagesgeschäft der ursprünglichen Unternehmensgrösse verankert sind.',
        evidenzsignale: [
          'Mehrere Teamleitungen wurden in den letzten zwölf Monaten aus Fachrollen befördert, ohne Führungsentwicklung',
          'Eskalationen aus der zweiten Ebene erreichen weiterhin direkt die Geschäftsleitung',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Übersicht Beförderungen und Führungsspanne der letzten 18 Monate.',
      },
      {
        id: 'h3',
        hypothese: 'Das bewusst informelle Führungsklima des Gründerteams verhindert verbindliche Nachverfolgung.',
        begruendung:
          'Um das ursprüngliche Vertrauensklima zu erhalten, wird auf explizites Nachhalten von Zusagen verzichtet, was bei zunehmender Grösse zu Verwässerung führt.',
        evidenzsignale: [
          'Keine strukturierte Nachverfolgung offener Punkte ausserhalb informeller Nachfragen',
          'Gründer äussern explizit den Wunsch, "kein Kontrollklima" aufzubauen',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Kurzgespräche mit den drei Gründungsmitgliedern zur Haltung gegenüber Nachverfolgung.',
      },
    ],
    ursachenbaum: {
      id: 'root',
      label: 'Entscheidungen werden getroffen, aber nicht konsequent umgesetzt',
      dimension: 'decision',
      ebene: 'symptom',
      detail: 'Beschlüsse aus der Geschäftsleitung verlieren zwischen Sitzung und Umsetzung an Verbindlichkeit.',
      children: [
        {
          id: 'u1',
          label: 'Kein verbindliches Umsetzungstracking vorhanden',
          dimension: 'governance',
          ebene: 'ursache',
          detail: 'Entscheidungen werden dokumentiert, aber nicht mit Termin, Owner und Statuskontrolle verknüpft.',
          children: [
            {
              id: 'u1a',
              label: 'Sitzungsstruktur wurde seit der Gründungsphase nicht angepasst',
              dimension: 'organisation',
              ebene: 'tiefenursache',
              detail: 'Format und Rhythmus der Geschäftsleitungssitzungen entsprechen noch der Grösse von vor 24 Monaten.',
              children: [
                {
                  id: 'q1',
                  label: 'Welches minimale, aber verbindliche Format für Entscheidungs- und Umsetzungstracking passt zur aktuellen Unternehmensgrösse?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Die Antwort bestimmt, wie viel Struktur eingeführt wird, ohne das Führungsklima zu überformalisieren.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2',
          label: 'Zweite Führungsebene ist mit Umsetzungsverantwortung überfordert',
          dimension: 'people',
          ebene: 'ursache',
          detail: 'Teamleitungen wurden befördert, aber nicht auf Umsetzungsführung vorbereitet.',
          children: [
            {
              id: 'u2a',
              label: 'Keine strukturierte Einführung in Führungsverantwortung nach Beförderung',
              dimension: 'people',
              ebene: 'tiefenursache',
              detail: 'Beförderungen erfolgten fachlich begründet, ohne begleitende Führungsentwicklung.',
              children: [
                {
                  id: 'q2',
                  label: 'Welche drei Teamleitungen benötigen in den nächsten 90 Tagen gezielte Unterstützung bei Umsetzungsführung?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Priorisierte Unterstützung schafft schneller Wirkung als ein unternehmensweites Programm.',
                },
              ],
            },
          ],
        },
      ],
    },
    entscheidungsoptionen: [
      {
        typ: 'Sofortmassnahme',
        titel: 'Entscheidungsprotokoll mit Owner und Termin',
        beschreibung:
          'Ab der nächsten Sitzung erhält jede Entscheidung verpflichtend einen Verantwortlichen und ein Umsetzungsdatum im Protokoll.',
        horizont: 'Nächste Sitzung',
        risiko: 'Gering.',
      },
      {
        typ: 'Strukturelle Massnahme',
        titel: 'Kurzer wöchentlicher Umsetzungs-Check',
        beschreibung:
          '15-minütiges Format zur Statuskontrolle offener Entscheidungen, getrennt von inhaltlichen Diskussionen.',
        horizont: '3 Wochen bis Einführung',
        risiko: 'Gering bis mittel. Erfordert Disziplin, das Format kurz zu halten.',
      },
      {
        typ: 'Führungs- und Governance-Massnahme',
        titel: 'Gezielte Führungsentwicklung für die zweite Ebene',
        beschreibung:
          'Priorisierte Begleitung der Teamleitungen mit der grössten Umsetzungsverantwortung, fokussiert auf Delegation und Nachhalten.',
        horizont: '1–2 Quartale',
        risiko: 'Mittel. Zeitinvestition konkurriert kurzfristig mit Tagesgeschäft.',
      },
    ],
    advisoryNote:
      'Diese Analyse ersetzt kein Urteil, sondern schafft eine strukturierte Grundlage für ein vertrauliches Executive Sparring. Die finale Einordnung erfolgt durch TaVyro basierend auf C-Level-Erfahrung und Kontextverständnis.',
  },

  {
    id: 'dienstleistung-nachfolge',
    kategorie: 'Nachfolge',
    titel: 'Inhabergeführtes Dienstleistungsunternehmen mit Nachfolgefrage',
    unternehmensprofil:
      '45 Mitarbeitende, Beratungs- und Ingenieurdienstleistungen, Inhaber 61 Jahre, Unternehmen seit 27 Jahren im Alleinbesitz.',
    ceoFrage: 'Ich bin unsicher, ob mein Management-Team richtig aufgestellt ist.',
    symptome: [
      'Schlüsselkundenbeziehungen laufen ausschliesslich über den Inhaber persönlich',
      'Kein Mitglied des Managementteams wurde bislang öffentlich als möglicher Nachfolger positioniert',
      'Strategische Entscheidungen werden weiterhin allein vom Inhaber getroffen',
      'Managementteam agiert überwiegend operativ, kaum unternehmerisch',
    ],
    situation: {
      ausgangslage:
        'Der Inhaber denkt über einen Rückzug in den nächsten drei bis fünf Jahren nach, hat aber weder intern noch extern eine Nachfolgelösung eingeleitet. Das bestehende Managementteam wurde nie mit unternehmerischer Verantwortung ausgestattet.',
      entscheidungsdruck:
        'Mittel bis hoch. Ohne sichtbaren Entwicklungspfad steigt das Risiko, dass geeignete interne Kandidaten das Unternehmen verlassen, bevor eine Entscheidung fällt.',
      strategischeRelevanz:
        'Der Unternehmenswert hängt massgeblich davon ab, ob Kundenbeziehungen und Führung unabhängig vom Inhaber tragfähig sind.',
      fuehrungsdilemma:
        'Der Inhaber müsste Verantwortung und Kundenbeziehungen aktiv abgeben, um Nachfolgekandidaten zu testen, empfindet dies aber als Risiko für bestehende Kundenbindungen.',
    },
    organisationssignale: [
      { label: 'Führungsabhängigkeit vom CEO', beschreibung: 'Schlüsselkundenbeziehungen sind ausschliesslich beim Inhaber verankert.', auspraegung: 5, dimension: 'decision'  },
      { label: 'Rollenunklarheit', beschreibung: 'Managementteam hat keine klar definierte unternehmerische Verantwortung.', auspraegung: 4, dimension: 'organisation'  },
      { label: 'Entscheidungsengpässe', beschreibung: 'Strategische Entscheidungen laufen ausschliesslich über den Inhaber.', auspraegung: 4, dimension: 'decision'  },
      { label: 'Operative Überlastung', beschreibung: 'Managementteam ist mit Tagesgeschäft ausgelastet, kaum Raum für strategische Themen.', auspraegung: 3, dimension: 'workforce'  },
      { label: 'Geringe Umsetzungsdisziplin', beschreibung: 'Entwicklungsschritte für potenzielle Nachfolger wurden wiederholt angekündigt, aber nicht umgesetzt.', auspraegung: 3, dimension: 'decision'  },
    ],
    hypothesen: [
      {
        id: 'h1',
        hypothese: 'Kundenbeziehungen wurden bewusst nie geteilt, um Abhängigkeit als Absicherung zu erhalten.',
        begruendung:
          'Die persönliche Kundenbindung sichert dem Inhaber Einfluss und Verhandlungsposition, auch gegenüber dem eigenen Managementteam.',
        evidenzsignale: [
          'Keine gemeinsamen Kundentermine mit Managementteam in den letzten zwei Jahren dokumentiert',
          'Übergabeversuche einzelner Kundenbeziehungen wurden mehrfach begonnen und wieder zurückgenommen',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Gespräch mit dem Inhaber zu den Beweggründen früherer Übergabeversuche.',
      },
      {
        id: 'h2',
        hypothese: 'Das Managementteam wurde nie systematisch auf unternehmerische Verantwortung geprüft oder entwickelt.',
        begruendung:
          'Rollen im Team sind funktional geprägt, es fehlt eine Einschätzung, wer strategisches und unternehmerisches Potenzial mitbringt.',
        evidenzsignale: [
          'Keine dokumentierte Nachfolge- oder Potenzialeinschätzung im Unternehmen vorhanden',
          'Teammitglieder äussern in informellen Gesprächen Unsicherheit über ihre langfristige Rolle',
        ],
        konfidenz: 'hoch',
        zusatzinformation: 'Kurzprofile der drei dienstältesten Managementteam-Mitglieder inklusive bisheriger Verantwortungsbereiche.',
      },
      {
        id: 'h3',
        hypothese: 'Der Inhaber hat sich emotional noch nicht endgültig für einen Rückzug entschieden.',
        begruendung:
          'Ohne persönliche Klarheit über Zeitpunkt und Form des Rückzugs bleibt jede strukturelle Nachfolgemassnahme halbherzig.',
        evidenzsignale: [
          'Rückzugszeitpunkt wird in Gesprächen wiederholt verschoben, ohne konkrete Begründung',
          'Keine externe Nachfolgeberatung bislang beauftragt',
        ],
        konfidenz: 'niedrig',
        zusatzinformation: 'Vertrauliches Einzelgespräch mit dem Inhaber ausserhalb des operativen Kontexts.',
      },
    ],
    ursachenbaum: {
      id: 'root',
      label: 'Unklarheit, ob das Managementteam für eine Nachfolge tragfähig ist',
      dimension: 'people',
      ebene: 'symptom',
      detail: 'Der Inhaber kann nicht einschätzen, ob das bestehende Team eine Übergabe strategisch und operativ tragen würde.',
      children: [
        {
          id: 'u1',
          label: 'Kundenbeziehungen sind ausschliesslich beim Inhaber verankert',
          dimension: 'business',
          ebene: 'ursache',
          detail: 'Es gibt keine gemeinsame Kundenverantwortung zwischen Inhaber und Managementteam.',
          children: [
            {
              id: 'u1a',
              label: 'Übergabe von Kundenverantwortung wurde nie strukturiert erprobt',
              dimension: 'business',
              ebene: 'tiefenursache',
              detail: 'Frühere Ansätze blieben punktuell und wurden bei ersten Schwierigkeiten zurückgenommen.',
              children: [
                {
                  id: 'q1',
                  label: 'Bei welchen zwei bis drei Kundenbeziehungen könnte eine begleitete Doppelbetreuung in den nächsten sechs Monaten getestet werden?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Ein begrenzter, begleiteter Test reduziert das wahrgenommene Risiko einer vollständigen Übergabe.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2',
          label: 'Unternehmerisches Potenzial im Managementteam wurde nie eingeschätzt',
          dimension: 'people',
          ebene: 'ursache',
          detail: 'Es fehlt eine belastbare Grundlage, um Nachfolgekandidaten zu identifizieren.',
          children: [
            {
              id: 'u2a',
              label: 'Rollen im Team sind rein funktional definiert',
              dimension: 'organisation',
              ebene: 'tiefenursache',
              detail: 'Verantwortung wurde nach fachlicher Notwendigkeit vergeben, nicht nach unternehmerischem Potenzial.',
              children: [
                {
                  id: 'q2',
                  label: 'Welches Teammitglied erhält als erstes eine klar abgegrenzte P&L- oder Ergebnisverantwortung zur Erprobung?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Eine erste konkrete Verantwortungsübertragung liefert belastbare Evidenz für die Nachfolgeeignung.',
                },
              ],
            },
          ],
        },
      ],
    },
    entscheidungsoptionen: [
      {
        typ: 'Sofortmassnahme',
        titel: 'Vertrauliche Standortbestimmung mit dem Inhaber',
        beschreibung:
          'Klärung von Zeithorizont und persönlicher Bereitschaft für einen Rückzug, getrennt von der Frage nach dem Managementteam.',
        horizont: '2 Wochen',
        risiko: 'Gering, erfordert aber Vertraulichkeit gegenüber dem Team.',
      },
      {
        typ: 'Strukturelle Massnahme',
        titel: 'Begleitete Doppelbetreuung ausgewählter Kundenbeziehungen',
        beschreibung:
          'Zwei bis drei Schlüsselkunden werden testweise gemeinsam von Inhaber und einem Managementteam-Mitglied betreut.',
        horizont: '6 Monate',
        risiko: 'Mittel. Erfordert Zustimmung der betroffenen Kunden und klare Rollenverteilung.',
      },
      {
        typ: 'Führungs- und Governance-Massnahme',
        titel: 'Unternehmerische Potenzialeinschätzung des Managementteams',
        beschreibung:
          'Strukturierte, vertrauliche Einschätzung, wer im Team unternehmerisches Potenzial und Interesse an einer Nachfolgerolle mitbringt.',
        horizont: '2–3 Monate',
        risiko: 'Mittel bis hoch. Kann Erwartungen im Team wecken, die sorgfältig gesteuert werden müssen.',
      },
    ],
    advisoryNote:
      'Diese Analyse ersetzt kein Urteil, sondern schafft eine strukturierte Grundlage für ein vertrauliches Executive Sparring. Die finale Einordnung erfolgt durch TaVyro basierend auf C-Level-Erfahrung und Kontextverständnis.',
  },

  {
    id: 'scaleup-fuehrung',
    kategorie: 'Skalierung',
    titel: 'Scale-up mit überlasteter Führungsebene',
    unternehmensprofil:
      '130 Mitarbeitende, drei Finanzierungsrunden in vier Jahren, Belegschaft im letzten Jahr um 60% gewachsen.',
    ceoFrage: 'Die Organisation wächst, aber die Führungsstruktur hält nicht mit.',
    symptome: [
      'Mehrere Führungskräfte der ersten Ebene führen über 12 direkte Mitarbeitende',
      'Krankheitsbedingte Ausfälle im mittleren Management nehmen zu',
      'Neue Mitarbeitende erhalten teilweise erst nach Wochen ein erstes Führungsgespräch',
      'Strategieprojekte verzögern sich, da Führungskräfte im Tagesgeschäft gebunden sind',
    ],
    situation: {
      ausgangslage:
        'Das schnelle Personalwachstum wurde nicht von einem entsprechenden Ausbau der Führungsspanne und -ebenen begleitet. Führungskräfte der ersten Stunde führen heute deutlich grössere Teams als ursprünglich vorgesehen.',
      entscheidungsdruck:
        'Hoch. Erste Anzeichen von Fluktuation im mittleren Management deuten auf ein sich zuspitzendes Risiko hin.',
      strategischeRelevanz:
        'Die Fähigkeit, weiter zu skalieren, hängt direkt davon ab, ob die Führungsstruktur mit dem Wachstum Schritt hält.',
      fuehrungsdilemma:
        'Der CEO müsste in zusätzliche Führungsebenen investieren, was kurzfristig die Kostenstruktur belastet und im Widerspruch zur bisherigen schlanken Kultur steht.',
    },
    organisationssignale: [
      { label: 'Operative Überlastung', beschreibung: 'Führungsspannen von über 12 direkten Mitarbeitenden bei mehreren Führungskräften.', auspraegung: 5, dimension: 'workforce'  },
      { label: 'Konflikt zwischen Wachstum und Steuerungslogik', beschreibung: 'Führungsstruktur wurde für eine deutlich kleinere Organisation konzipiert.', auspraegung: 5, dimension: 'governance'  },
      { label: 'Führungsabhängigkeit vom CEO', beschreibung: 'Strategieprojekte laufen mangels Kapazität der ersten Ebene direkt über den CEO.', auspraegung: 3, dimension: 'decision'  },
      { label: 'Entscheidungsengpässe', beschreibung: 'Priorisierungsentscheidungen zwischen Tagesgeschäft und Strategieprojekten fehlen.', auspraegung: 3, dimension: 'decision'  },
      { label: 'Rollenunklarheit', beschreibung: 'Keine klare zweite Führungsebene zur Entlastung definiert.', auspraegung: 4, dimension: 'organisation'  },
    ],
    hypothesen: [
      {
        id: 'h1',
        hypothese: 'Die Führungsstruktur wurde seit der Gründungsphase nicht mehr grundlegend überarbeitet.',
        begruendung:
          'Führungsspannen sind organisch mit dem Personalwachstum mitgewachsen, ohne bewusste Entscheidung über eine zusätzliche Führungsebene.',
        evidenzsignale: [
          'Organigramm zeigt unveränderte Struktur seit 18 Monaten trotz Verdopplung der Belegschaft',
          'Mehrere Führungsspannen liegen deutlich über gängigen Richtwerten für die jeweilige Funktion',
        ],
        konfidenz: 'hoch',
        zusatzinformation: 'Aktuelles Organigramm mit Führungsspannen pro Führungskraft.',
      },
      {
        id: 'h2',
        hypothese: 'Eine zusätzliche Führungsebene wird als Widerspruch zur schlanken Unternehmenskultur wahrgenommen.',
        begruendung:
          'Im Führungsteam besteht eine ungeprüfte Annahme, dass mehr Führungsebenen automatisch zu mehr Bürokratie und weniger Geschwindigkeit führen.',
        evidenzsignale: [
          'Vorschläge für Teamleitungsrollen wurden in der Vergangenheit intern zurückgewiesen',
          'Unternehmenskultur wird explizit als "flach" kommuniziert, auch extern',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Kurzgespräche mit zwei Führungskräften zur Haltung gegenüber zusätzlichen Führungsebenen.',
      },
      {
        id: 'h3',
        hypothese: 'Es fehlt eine klare Priorisierung zwischen Tagesgeschäft und Strategieprojekten auf Führungsebene.',
        begruendung:
          'Führungskräfte der ersten Ebene erhalten keine explizite Freistellung für strategische Projekte und lösen den Konflikt zulasten der Strategie.',
        evidenzsignale: [
          'Strategieprojekte aus dem letzten Jahresplan sind mehrheitlich verzögert',
          'Keine dokumentierte Kapazitätsplanung für strategische Initiativen',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Statusübersicht laufender Strategieprojekte mit ursprünglicher und aktueller Terminplanung.',
      },
    ],
    ursachenbaum: {
      id: 'root',
      label: 'Führungsstruktur hält nicht mit dem Personalwachstum Schritt',
      dimension: 'workforce',
      ebene: 'symptom',
      detail: 'Führungskräfte der ersten Ebene sind operativ überlastet, strategische Themen bleiben liegen.',
      children: [
        {
          id: 'u1',
          label: 'Keine zusätzliche Führungsebene zur Entlastung eingeführt',
          dimension: 'organisation',
          ebene: 'ursache',
          detail: 'Die Organisation ist gewachsen, die Führungsarchitektur ist unverändert geblieben.',
          children: [
            {
              id: 'u1a',
              label: 'Zusätzliche Führungsebene wird als Kulturrisiko wahrgenommen',
              dimension: 'people',
              ebene: 'tiefenursache',
              detail: 'Eine ungeprüfte Annahme verknüpft mehr Führungsebenen automatisch mit mehr Bürokratie.',
              children: [
                {
                  id: 'q1',
                  label: 'In welchen zwei Bereichen mit der höchsten Führungsspanne wird testweise eine Teamleitungsebene eingeführt?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Ein begrenzter Test in den am stärksten belasteten Bereichen liefert Evidenz, ohne die gesamte Struktur sofort zu verändern.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2',
          label: 'Keine explizite Kapazitätspriorisierung zwischen Tagesgeschäft und Strategie',
          dimension: 'workforce',
          ebene: 'ursache',
          detail: 'Strategische Projekte konkurrieren unstrukturiert mit dem Tagesgeschäft um dieselbe Führungskapazität.',
          children: [
            {
              id: 'u2a',
              label: 'Strategieprojekte wurden ohne dedizierte Kapazität geplant',
              dimension: 'workforce',
              ebene: 'tiefenursache',
              detail: 'Der Jahresplan enthält Strategieprojekte, aber keine entsprechende Freistellung im Kalender der Verantwortlichen.',
              children: [
                {
                  id: 'q2',
                  label: 'Welches Strategieprojekt erhält als erstes eine feste, geschützte Kapazität von einem Tag pro Woche?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Eine geschützte Kapazität für ein priorisiertes Projekt macht Fortschritt sichtbar und testet das Vorgehen im Kleinen.',
                },
              ],
            },
          ],
        },
      ],
    },
    entscheidungsoptionen: [
      {
        typ: 'Sofortmassnahme',
        titel: 'Führungsspannen-Analyse',
        beschreibung:
          'Kurze Erhebung aller Führungsspannen im Unternehmen zur Identifikation der am stärksten belasteten Bereiche.',
        horizont: '1 Woche',
        risiko: 'Gering.',
      },
      {
        typ: 'Strukturelle Massnahme',
        titel: 'Pilot-Teamleitungsebene in zwei Bereichen',
        beschreibung:
          'Einführung einer zusätzlichen Führungsebene in den zwei am stärksten belasteten Bereichen, mit klarer Erfolgsmessung nach einem Quartal.',
        horizont: '1 Quartal',
        risiko: 'Mittel. Erfordert Kommunikation, um Kulturbedenken im Team zu adressieren.',
      },
      {
        typ: 'Führungs- und Governance-Massnahme',
        titel: 'Geschützte Kapazität für priorisierte Strategieprojekte',
        beschreibung:
          'Verbindliche, im Kalender reservierte Kapazität für die Führungskräfte, die die wichtigsten Strategieprojekte verantworten.',
        horizont: 'Laufend ab sofort',
        risiko: 'Mittel. Erfordert Konsequenz gegenüber tagesgeschäftlichen Ablenkungen.',
      },
    ],
    advisoryNote:
      'Diese Analyse ersetzt kein Urteil, sondern schafft eine strukturierte Grundlage für ein vertrauliches Executive Sparring. Die finale Einordnung erfolgt durch TaVyro basierend auf C-Level-Erfahrung und Kontextverständnis.',
  },

  {
    id: 'industriezulieferer-schnittstellen',
    kategorie: 'Zusammenarbeit',
    titel: 'Internationaler Industriezulieferer mit Schnittstellenproblemen',
    unternehmensprofil:
      '340 Mitarbeitende, drei Werke in der Schweiz, Deutschland und Tschechien, matrixartige Produktlinienorganisation.',
    ceoFrage: 'Wir haben gute Leute, aber die Zusammenarbeit funktioniert nicht.',
    symptome: [
      'Werksübergreifende Projekte verzögern sich regelmässig an Übergabepunkten',
      'Produktlinienverantwortliche und Werkleitungen priorisieren unterschiedlich',
      'Informationen zu Kundenänderungen erreichen nicht alle betroffenen Werke gleichzeitig',
      'Konflikte werden häufig erst auf CEO-Ebene sichtbar gemacht',
    ],
    situation: {
      ausgangslage:
        'Die Matrixorganisation aus Produktlinien und Werken wurde eingeführt, um Kundennähe und Skaleneffekte zu verbinden. In der Praxis fehlt eine klare Entscheidungslogik für Situationen, in denen Produktlinien- und Werksinteressen auseinanderlaufen.',
      entscheidungsdruck:
        'Mittel bis hoch. Kunden bemerken zunehmend uneinheitliche Aussagen aus verschiedenen Werken zu Terminen und Kapazitäten.',
      strategischeRelevanz:
        'Die Matrixstruktur ist zentral für das Geschäftsmodell mit mehreren Werken; ein dauerhaftes Steuerungsdefizit gefährdet die Glaubwürdigkeit gegenüber Grosskunden.',
      fuehrungsdilemma:
        'Der CEO müsste eine der beiden Dimensionen der Matrix stärker gewichten, riskiert damit aber Widerstand bei den Verantwortlichen der jeweils anderen Dimension.',
    },
    organisationssignale: [
      { label: 'Schnittstellenprobleme', beschreibung: 'Übergabepunkte zwischen Werken sind nicht mit klaren Verantwortlichkeiten hinterlegt.', auspraegung: 5, dimension: 'organisation'  },
      { label: 'Rollenunklarheit', beschreibung: 'Weisungsverhältnis zwischen Produktlinienverantwortung und Werkleitung ist nicht eindeutig geregelt.', auspraegung: 5, dimension: 'organisation'  },
      { label: 'Entscheidungsengpässe', beschreibung: 'Priorisierungskonflikte zwischen Werken werden nicht auf der jeweils richtigen Ebene gelöst.', auspraegung: 4, dimension: 'decision'  },
      { label: 'Führungsabhängigkeit vom CEO', beschreibung: 'Konflikte zwischen Werken werden erst spät und dann direkt beim CEO sichtbar.', auspraegung: 3, dimension: 'decision'  },
      { label: 'Operative Überlastung', beschreibung: 'Wiederholte Nacharbeit durch Informationslücken bindet Kapazität in allen Werken.', auspraegung: 3, dimension: 'workforce'  },
    ],
    hypothesen: [
      {
        id: 'h1',
        hypothese: 'Die Matrixorganisation wurde eingeführt, ohne eine explizite Entscheidungslogik für Zielkonflikte festzulegen.',
        begruendung:
          'Weder Produktlinien- noch Werksverantwortliche haben eine dokumentierte Grundlage, wer bei widersprechenden Prioritäten den Ausschlag gibt.',
        evidenzsignale: [
          'Keine dokumentierte Eskalations- oder Entscheidungslogik für Zielkonflikte zwischen den Dimensionen',
          'Gleichartige Konflikte wurden in der Vergangenheit unterschiedlich entschieden, je nach beteiligten Personen',
        ],
        konfidenz: 'hoch',
        zusatzinformation: 'Dokumentation der Matrixorganisation und der letzten drei werksübergreifenden Eskalationen.',
      },
      {
        id: 'h2',
        hypothese: 'Informationsflüsse zwischen Werken laufen über persönliche Kontakte statt über definierte Prozesse.',
        begruendung:
          'Kundenänderungen erreichen Werke zu unterschiedlichen Zeitpunkten, abhängig davon, wer wen persönlich informiert.',
        evidenzsignale: [
          'Kein einheitliches System zur Verteilung kundenrelevanter Änderungen an alle Werke',
          'Betroffene Werke berichten wiederholt, "zufällig" oder verspätet informiert worden zu sein',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Ablauf der letzten Kundenänderungsmitteilung von Eingang bis Verteilung an alle Werke.',
      },
      {
        id: 'h3',
        hypothese: 'Werkleitungen werden nach lokalen Kennzahlen gemessen, die werksübergreifende Zusammenarbeit nicht honorieren.',
        begruendung:
          'Zielsysteme belohnen lokale Effizienz, wodurch werksübergreifende Kooperation im Zweifel gegenüber lokalen Zielen zurücksteht.',
        evidenzsignale: [
          'Zielvereinbarungen der Werkleitungen enthalten keine werksübergreifenden Kooperationskennzahlen',
          'Werkleitungen priorisieren in Konfliktfällen nachvollziehbar lokale Kennzahlen',
        ],
        konfidenz: 'mittel',
        zusatzinformation: 'Aktuelle Zielvereinbarungen der drei Werkleitungen.',
      },
    ],
    ursachenbaum: {
      id: 'root',
      label: 'Werksübergreifende Zusammenarbeit funktioniert trotz guter Einzelleistungen nicht',
      dimension: 'organisation',
      ebene: 'symptom',
      detail: 'Projekte verzögern sich an Übergabepunkten zwischen Werken, Konflikte werden spät sichtbar.',
      children: [
        {
          id: 'u1',
          label: 'Keine explizite Entscheidungslogik für Zielkonflikte in der Matrix',
          dimension: 'governance',
          ebene: 'ursache',
          detail: 'Es ist nicht geregelt, wer bei widersprechenden Prioritäten zwischen Produktlinie und Werk entscheidet.',
          children: [
            {
              id: 'u1a',
              label: 'Matrixorganisation wurde strukturell, aber nicht entscheidungslogisch eingeführt',
              dimension: 'governance',
              ebene: 'tiefenursache',
              detail: 'Die Organisationsform wurde definiert, die dazugehörige Governance jedoch nie nachgezogen.',
              children: [
                {
                  id: 'q1',
                  label: 'Welche Dimension der Matrix erhält bei ungelösten Zielkonflikten den Ausschlag, und ab welcher Eskalationsstufe entscheidet der CEO?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Eine klare Vorfahrtsregel reduziert die Zahl der Konflikte, die überhaupt bis zum CEO eskalieren.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2',
          label: 'Zielsysteme der Werkleitungen honorieren keine werksübergreifende Kooperation',
          dimension: 'business',
          ebene: 'ursache',
          detail: 'Lokale Kennzahlen stehen im Zweifel über werksübergreifenden Zielen.',
          children: [
            {
              id: 'u2a',
              label: 'Zielvereinbarungen wurden nie an die Matrixlogik angepasst',
              dimension: 'business',
              ebene: 'tiefenursache',
              detail: 'Zielsysteme stammen aus der Zeit vor Einführung der Matrixorganisation.',
              children: [
                {
                  id: 'q2',
                  label: 'Welche werksübergreifende Kooperationskennzahl wird ab dem nächsten Zielzyklus in die Zielvereinbarung aller Werkleitungen aufgenommen?',
                  ebene: 'entscheidungsfrage',
                  detail: 'Eine gemeinsame Kennzahl richtet die Anreize der drei Werkleitungen auf dasselbe Ziel aus.',
                },
              ],
            },
          ],
        },
      ],
    },
    entscheidungsoptionen: [
      {
        typ: 'Sofortmassnahme',
        titel: 'Verbindlicher Verteiler für Kundenänderungen',
        beschreibung:
          'Einführung eines einzigen, verpflichtenden Kanals, über den kundenrelevante Änderungen zeitgleich an alle Werke gehen.',
        horizont: '1–2 Wochen',
        risiko: 'Gering.',
      },
      {
        typ: 'Strukturelle Massnahme',
        titel: 'Eskalations- und Entscheidungslogik für die Matrix dokumentieren',
        beschreibung:
          'Schriftliche Festlegung, welche Dimension bei Zielkonflikten Vorrang hat und ab welcher Stufe der CEO einbezogen wird.',
        horizont: '4 Wochen',
        risiko: 'Mittel. Erfordert Abstimmung mit allen Produktlinien- und Werksverantwortlichen.',
      },
      {
        typ: 'Führungs- und Governance-Massnahme',
        titel: 'Werksübergreifende Kooperationskennzahl in Zielvereinbarungen',
        beschreibung:
          'Aufnahme einer gemeinsamen, messbaren Kooperationskennzahl in die Zielvereinbarungen aller drei Werkleitungen ab dem nächsten Zyklus.',
        horizont: 'Nächster Zielzyklus',
        risiko: 'Mittel bis hoch. Verändert etablierte Anreizlogik und erfordert Konsequenz in der Umsetzung.',
      },
    ],
    advisoryNote:
      'Diese Analyse ersetzt kein Urteil, sondern schafft eine strukturierte Grundlage für ein vertrauliches Executive Sparring. Die finale Einordnung erfolgt durch TaVyro basierend auf C-Level-Erfahrung und Kontextverständnis.',
  },
]

export const scenarioPrompts: { text: string; scenarioId: string }[] = [
  { text: 'Ich komme nicht mehr aus dem operativen Tagesgeschäft.', scenarioId: 'maschinenbau-asien' },
  { text: 'Entscheidungen werden getroffen, aber nicht konsequent umgesetzt.', scenarioId: 'medtech-wachstum' },
  { text: 'Ich bin unsicher, ob mein Management-Team richtig aufgestellt ist.', scenarioId: 'dienstleistung-nachfolge' },
  { text: 'Die Organisation wächst, aber die Führungsstruktur hält nicht mit.', scenarioId: 'scaleup-fuehrung' },
  { text: 'Wir haben gute Leute, aber die Zusammenarbeit funktioniert nicht.', scenarioId: 'industriezulieferer-schnittstellen' },
  { text: 'Unsere Transformation stockt trotz Workshops und Massnahmen.', scenarioId: 'scaleup-fuehrung' },
]

export function isExactPrompt(input: string): boolean {
  const lower = input.trim().toLowerCase()
  return scenarioPrompts.some((p) => p.text.toLowerCase() === lower)
}

export function findScenarioForText(input: string): Scenario | null {
  const lower = input.trim().toLowerCase()
  const match = scenarioPrompts.find((p) => p.text.toLowerCase() === lower)
  if (match) {
    return scenarios.find((s) => s.id === match.scenarioId) ?? null
  }
  // Score-basierter Abgleich: alle Cluster werden geprüft, nicht nur der
  // erste Treffer. Kein Treffer -> null statt eines zufälligen Fallback-Falls,
  // damit nie ein thematisch fremder Fall mit falscher Überzeugung ausgegeben wird.
  const keywordMap: { keywords: string[]; scenarioId: string }[] = [
    { keywords: ['ausland', 'asien', 'vietnam', 'standort', 'international', 'export'], scenarioId: 'maschinenbau-asien' },
    { keywords: ['umsetzung', 'beschluss', 'nachverfolg', 'wachstum', 'zulassung'], scenarioId: 'medtech-wachstum' },
    {
      keywords: [
        'nachfolge', 'management-team', 'managementteam', 'inhaber', 'ruhestand',
        'cfo', 'ceo', 'gl-mitglied', 'geschäftsleitungsmitglied', 'mitglied',
        'sparring partner', 'sparringpartner', 'kompetenz', 'fehlt es an',
        'richtig aufgestellt', 'nerd',
      ],
      scenarioId: 'dienstleistung-nachfolge',
    },
    { keywords: ['skalier', 'scale', 'führungsspanne', 'überlast', 'team wächst'], scenarioId: 'scaleup-fuehrung' },
    { keywords: ['schnittstelle', 'zusammenarbeit', 'werk', 'matrix', 'kooperation'], scenarioId: 'industriezulieferer-schnittstellen' },
  ]

  const scores = new Map<string, number>()
  for (const entry of keywordMap) {
    const hits = entry.keywords.filter((k) => lower.includes(k)).length
    if (hits > 0) scores.set(entry.scenarioId, (scores.get(entry.scenarioId) ?? 0) + hits)
  }

  let bestId: string | null = null
  let bestScore = 0
  for (const [id, score] of scores) {
    if (score > bestScore) {
      bestScore = score
      bestId = id
    }
  }

  if (!bestId) return null
  return scenarios.find((s) => s.id === bestId) ?? null
}
