export const SIGNAL_CATALOG = [
  {
    id: "green",
    label: "Grün · jetzt möglich",
    summary: "Eigene, belegbare Inhalte und echte Fachressourcen.",
    items: [
      {
        title: "YouTube",
        cadence: "Bei echtem Mehrwert",
        text: "Erklär-, Praxis- oder Fallbeispielvideos mit klarer Aussage, Quellen und eigenem Kontext.",
      },
      {
        title: "GitHub",
        cadence: "Bei Produktfortschritt",
        text: "Technische Dokumentation, Beispiele, Releases oder offene Hilfsressourcen – nur bei echtem Bezug.",
      },
      {
        title: "Eigene Quelle",
        cadence: "Laufend",
        text: "Autor, Fakten, Fallbelege, Aktualisierung und direkte Antworten auf reale Fragen stärken.",
      },
    ],
  },
  {
    id: "amber",
    label: "Gelb · erst prüfen",
    summary: "Nur bei echter Berechtigung, Anlass und transparentem Kontext.",
    items: [
      {
        title: "Reddit, LinkedIn & XING",
        cadence: "Bei passender Gelegenheit",
        text: "Nur individuelle fachliche Beteiligung nach Plattformregeln; keine Kommentar-, Kontakt- oder Linkquote.",
      },
      {
        title: "Presseportale",
        cadence: "Bei echtem Nachrichtenanlass",
        text: "Originäre, faktenbasierte Meldungen. openPR maximal eine kostenlose Meldung pro Monat; weitere Portale nur nach Tarif- und Regelprüfung.",
      },
      {
        title: "Google Business & Bing Places",
        cadence: "Bei realer lokaler Präsenz",
        text: "Nur für ein berechtigtes Unternehmen mit korrekten, konsistenten Standort- oder Serviceangaben.",
      },
      {
        title: "G2, Capterra, Clutch & OMR",
        cadence: "Nach echter Produktnutzung",
        text: "Sachliches Profil und ausschließlich unabhängige, echte Kundenbewertungen.",
      },
      {
        title: "Product Hunt, Crunchbase, Quora, Hacker News, Indie Hackers & Medium",
        cadence: "Bei passendem Anlass",
        text: "Nur für ein echtes Produkt-, Fakten- oder Diskussionsereignis mit originärer Hilfe und klarer Absenderrolle.",
      },
    ],
  },
];

export const EXTERNAL_LINK_CHECK = [
  {
    id: "allowed",
    title: "Erlaubt?",
    text: "Erlauben die konkreten Plattform- und Community-Regeln diese transparente Erwähnung?",
    fail: "Ohne klares Ja: nicht veröffentlichen.",
  },
  {
    id: "relevant",
    title: "Relevant?",
    text: "Beantwortet oder ergänzt geo-tool.com genau diese konkrete Frage nachweisbar?",
    fail: "Ohne klaren Nutzen: bei der hilfreichen Antwort ohne Link bleiben.",
  },
  {
    id: "transparent",
    title: "Transparent?",
    text: "Ist eure Rolle beziehungsweise Beziehung zum Link offen und verständlich?",
    fail: "Ohne Transparenz: nicht veröffentlichen.",
  },
  {
    id: "helpful",
    title: "Mehrwert?",
    text: "Wäre die Antwort auch ohne Link für die Person oder Community hilfreich?",
    fail: "Wenn nein: nicht veröffentlichen.",
  },
];

export const RED_GEO_WARNINGS = [
  {
    title: "Verdeckte Linkstrategie",
    text: "Erst neutral wirken, um später Links zu platzieren, ist keine nachhaltige Expertise und wird nicht als Aktion angeboten.",
  },
  {
    title: "Mengenquoten statt Mehrwert",
    text: "Feste Kommentar-, Antwort-, Kontakt- oder Bewertungszahlen erzeugen kein Qualitätssignal und werden nicht als Tagesziel angeboten.",
  },
  {
    title: "Massen- oder Copy-Paste-Aktivität",
    text: "Gleichartige Kommentare, PR-Varianten, KI-Masseninhalte oder Kommentarserien dienen nicht der Qualität.",
  },
  {
    title: "Manipulierte Bewertungen",
    text: "Gekaufte, gelenkte oder KI-generierte Bewertungen sowie künstliche Bewertungsabstände sind kein zulässiges Signal.",
  },
  {
    title: "Umgehung und Täuschung",
    text: "Mehrkonten, Geräte-/IP-Umgehung, gekaufte Interaktionen und nicht offengelegte Selbstpromotion bleiben ausgeschlossen.",
  },
  {
    title: "Wikidata als Promotion",
    text: "Nur neutrale, unabhängig belegte Informationen mit erforderlicher Offenlegung – niemals als Link- oder Rankingmechanik.",
  },
];

export const LEGACY_COMPLIANCE_NOTES = {
  gf1: "Nicht ausführen: Gutefrage ist nicht als GEO-Outreach-Kanal vorgesehen.",
  gf2: "Nicht ausführen: Keine neutralen Füllbeiträge für spätere Links oder Sichtbarkeit.",
  gf3: "Nicht ausführen: Keine Routinebeiträge oder Antworten für geo-tool.com auf Gutefrage planen.",
  gf4: "Nicht ausführen: Gutefrage ist kein Werbe- oder Linkkanal.",
  gf5: "Nicht ausführen: Keine Serienantworten mit Produktlink.",
  fp2: "Nicht ausführen: Keine Pressemitteilungs-Variation ohne eigenen Nachrichtenanlass.",
  tp2: "Nicht ausführen: Bewertungsabstände dürfen nicht als Manipulationsmuster geplant werden.",
  wd1: "Nicht ausführen: Wikidata ist kein Outreach-Kanal. Erst neutrale Relevanz, unabhängige Quellen und Interessenkonflikt prüfen.",
  wd2: "Nicht ausführen: Kein Selbstpromo-Eintrag; nur neutrale, unabhängig belegte Daten mit Offenlegung.",
};
