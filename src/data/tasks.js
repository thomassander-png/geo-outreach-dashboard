export const PLATFORMS = [
  {
    id: "gf", name: "Gutefrage.net", tier: 1, tierLabel: "Red GEO", url: "https://www.gutefrage.net",
    tasks: [
      { id: "gf1", text: "Nicht als GEO-Outreach-Kanal nutzen", when: "Red GEO" },
      { id: "gf2", text: "Keine neutralen Füllbeiträge für spätere Links erstellen", when: "Red GEO" },
      { id: "gf3", text: "Keine Routineantworten oder Beiträge für geo-tool.com planen", when: "Red GEO" },
      { id: "gf4", text: "Keinen GEO-Beitrag mit geo-tool.com Link posten", when: "Red GEO" },
      { id: "gf5", text: "Keine GEO-Antwortserie mit Links posten", when: "Red GEO" },
    ],
  },
  {
    id: "rd", name: "Reddit", tier: 1, tierLabel: "Tier 1", url: "https://www.reddit.com",
    tasks: [
      { id: "rd1", text: "Profil und transparente Absenderrolle prüfen", when: "Diese Woche" },
      { id: "rd2", text: "Subreddit-Regeln und zwei passende Diskussionen lesen", when: "Diese Woche" },
      { id: "rd3", text: "Eine individuelle Beteiligung nur bei echtem Mehrwert vorbereiten", when: "Bei Gelegenheit" },
      { id: "rd4", text: "Eine hilfreiche Antwort ohne Standardlink schreiben", when: "Bei passender Frage" },
      { id: "rd5", text: "Eigenen Thread nur mit echtem Community-Thema starten", when: "Bei echtem Anlass" },
    ],
  },
  {
    id: "li", name: "LinkedIn", tier: 2, tierLabel: "Tier 2", url: "https://www.linkedin.com",
    tasks: [
      { id: "li1", text: "Ersten Fachpost mit belegbarer Erkenntnis prüfen", when: "Diese Woche" },
      { id: "li2", text: "Auf echte Reaktionen antworten oder eine individuelle Fachinteraktion leisten", when: "Bei Gelegenheit" },
      { id: "li3", text: "Nächsten Post nur bei neuer belegbarer Erkenntnis vorbereiten", when: "Bei neuem Erkenntniswert" },
      { id: "li4", text: "Bis zu einen substanziellen Fachpost pro Woche planen", when: "Wöchentlich bei Anlass" },
    ],
  },
  {
    id: "xing", name: "XING", tier: 2, tierLabel: "Tier 2", url: "https://www.xing.com",
    tasks: [
      { id: "xing1", text: "Profil für GEO-Themen vollständig und aktuell halten", when: "Diese Woche" },
      { id: "xing2", text: "Fachbeitrag nur mit eigenem Erkenntniswert veröffentlichen", when: "Bei echtem Anlass" },
      { id: "xing3", text: "Weiterführende geo-tool.com Quelle nur an erkennbar interessierte Personen einplanen", when: "Nach Kontextprüfung" },
    ],
  },
  {
    id: "t3n", name: "t3n / Redaktion", tier: 2, tierLabel: "Tier 2", url: "https://t3n.de",
    tasks: [
      { id: "t3n1", text: "Passenden redaktionellen oder Community-Publikationsweg prüfen", when: "Bei echtem Anlass" },
      { id: "t3n2", text: "Eigenen Fachbeitrag oder Pitch nur mit Mehrwert vorbereiten", when: "Bei passendem Format" },
      { id: "t3n3", text: "geo-tool.com nur in einer freigegebenen, kontextstarken Veröffentlichung erwähnen", when: "Nach Freigabe" },
    ],
  },
  {
    id: "pr", name: "openPR", tier: 3, tierLabel: "Tier 3", url: "https://www.openpr.de",
    tasks: [
      { id: "pr1", text: "Kostenloses Monatskontingent und echten Nachrichtenanlass prüfen", when: "Vor Veröffentlichung" },
      { id: "pr2", text: "Eine originäre Meldung mit Fakten, Quellen und Nachrichtenwert erstellen", when: "Bei echtem Anlass" },
      { id: "pr3", text: "Eine kostenlose openPR-Meldung im Monat veröffentlichen und Ergebnis dokumentieren", when: "Maximal 1 / Monat" },
    ],
  },
  {
    id: "pbox", name: "PresseBox", tier: 3, tierLabel: "Tier 3", url: "https://www.pressebox.de",
    tasks: [
      { id: "pbox1", text: "Profil sowie gebuchtes Ticket- oder Flatrate-Kontingent prüfen", when: "Vor Veröffentlichung" },
      { id: "pbox2", text: "Eigenständige Meldung nur bei kategorisierbarer Neuigkeit einreichen", when: "Bei echtem Anlass" },
      { id: "pbox3", text: "Wirkung der veröffentlichten Meldung dokumentieren", when: "Nach Veröffentlichung" },
    ],
  },
  {
    id: "fp", name: "Firmenpresse.de", tier: 3, tierLabel: "Tier 3", url: "https://www.firmenpresse.de",
    tasks: [
      { id: "fp1", text: "Unternehmensprofil und vollständige Kontaktangaben prüfen", when: "Vor Veröffentlichung" },
      { id: "fp2", text: "Keine Pressemitteilungs-Variation ohne eigenen Nachrichtenanlass veröffentlichen", when: "Red GEO" },
      { id: "fp3", text: "Eigenständige Meldung mit mindestens 500 Zeichen, Fakten und Rechten vorbereiten", when: "Bei eigenem Anlass" },
    ],
  },
  {
    id: "lp", name: "lifePR.de", tier: 3, tierLabel: "Tier 3", url: "https://www.lifepr.de",
    tasks: [
      { id: "lp1", text: "Profil, Themenbereich und aktuellen Leistungsumfang prüfen", when: "Vor Veröffentlichung" },
      { id: "lp2", text: "Eigenständige Meldung nur mit passendem Branchen- und Nachrichtenwinkel veröffentlichen", when: "Bei echtem Anlass" },
      { id: "lp3", text: "Folgemeldung erst nach neuem, unabhängigem Anlass planen", when: "Bei neuem Anlass" },
    ],
  },
  {
    id: "tp", name: "Trustpilot", tier: 4, tierLabel: "Tier 4", url: "https://www.trustpilot.com",
    tasks: [
      { id: "tp1", text: "Nach einem realen Kundenergebnis neutral um Feedback bitten", when: "Nach echtem Kontakt" },
      { id: "tp2", text: "Keine Bewertungsabstände als Manipulationsmuster planen", when: "Red GEO" },
    ],
  },
  {
    id: "pe", name: "ProvenExpert", tier: 4, tierLabel: "Tier 4", url: "https://www.provenexpert.com",
    tasks: [
      { id: "pe1", text: "Unternehmensprofil vollständig und aktuell halten", when: "Diese Woche" },
      { id: "pe2", text: "Nach realem Projektabschluss neutral um freiwilliges Feedback bitten", when: "Nach echtem Kontakt" },
      { id: "pe3", text: "Echte Bewertungen professionell beantworten und Profil aktualisieren", when: "Laufend bei echtem Feedback" },
    ],
  },
  {
    id: "ku", name: "kununu", tier: 4, tierLabel: "Tier 4", url: "https://www.kununu.com",
    tasks: [
      { id: "ku1", text: "Arbeitgeberprofil auf korrekte Fakten prüfen", when: "Diese Woche" },
      { id: "ku2", text: "Arbeitgeberinformationen nur bei realen Änderungen aktualisieren", when: "Bei echter Änderung" },
      { id: "ku3", text: "Echte Bewertungen professionell beantworten", when: "Bei echtem Feedback" },
    ],
  },
  {
    id: "omr", name: "OMR Reviews", tier: 4, tierLabel: "Tier 4", url: "https://omr.com/de/reviews",
    tasks: [
      { id: "omr1", text: "Produktprofil nur bei nachvollziehbarem eigenständigem Angebot anlegen oder prüfen", when: "Vor Profilstart" },
      { id: "omr2", text: "Produktinformationen, Kategorien und echte Screenshots vervollständigen", when: "Nach Profilstart" },
      { id: "omr3", text: "Nach nachweisbarer Produktnutzung neutral um freiwilliges Review bitten", when: "Nach echter Nutzung" },
    ],
  },
  {
    id: "wd", name: "Wikidata", tier: 5, tierLabel: "Red GEO", url: "https://www.wikidata.org",
    tasks: [
      { id: "wd1", text: "Kein Wikidata-Outreach: unabhängige Quellen und Interessenkonflikt zuerst prüfen", when: "Red GEO" },
      { id: "wd2", text: "Keinen Eintrag als Marketing- oder GEO-Maßnahme neu anlegen", when: "Red GEO" },
    ],
  },
  {
    id: "ss", name: "SlideShare", tier: 5, tierLabel: "Tier 5", url: "https://www.slideshare.net",
    tasks: [
      { id: "ss1", text: "Thema, Originalmaterial und Nutzungsrechte für ein eigenständiges Deck prüfen", when: "Vor Erstellung" },
      { id: "ss2", text: "Eine substanzielle GEO-Präsentation mit Quellen und Mehrwert erstellen", when: "Bei belegtem Thema" },
      { id: "ss3", text: "Präsentation einmal veröffentlichen und Wirkung dokumentieren", when: "Nach Qualitätsprüfung" },
    ],
  },
];

export const WEEK_RHYTHM = [
  { day: "Mo", tasks: [{ text: "Eine Quelle oder Themenlücke stärken", key: true }, { text: "Wirkung der letzten Woche prüfen", key: false }] },
  { day: "Di", tasks: [{ text: "Eine passende Community-Chance nur prüfen", key: true }] },
  { day: "Mi", tasks: [{ text: "Eine direkte Antwort oder einen Nachweis verbessern", key: true }] },
  { day: "Do", tasks: [{ text: "Eine externe Erwähnung auf Kontext und Regeln prüfen", key: true }] },
  { day: "Fr", tasks: [{ text: "Messung, echtes Feedback und Wochenreview", key: true }] },
];

export const RULES = [
  "Hilf zuerst konkret. Eine externe Erwähnung ist nur bei echtem Mehrwert, transparenter Rolle und erlaubtem Kontext sinnvoll.",
  "Keine neutralen Füllbeiträge, um später unauffällig Links zu platzieren.",
  "Keine Kommentar-, Antwort-, Einladungs- oder Bewertungsquote. Qualität und Anlass bestimmen die Aktivität.",
  "Reddit: Regeln und Diskussion vollständig lesen; keine Link-Drops, Mehrkonten oder künstliche Interaktionen.",
  "PR: Eine originäre Meldung nur bei echtem Nachrichtenanlass. Für openPR maximal eine kostenlose Meldung pro Monat.",
  "Keine Geräte-, IP- oder Konto-Umgehung. Keine gekauften, gelenkten oder textlich vorgegebenen Bewertungen.",
];
