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
        title: "Google Business & Bing Places",
        cadence: "Bei realer lokaler Präsenz",
        text: "Nur für ein berechtigtes Unternehmen mit korrekten, konsistenten Standort- oder Serviceangaben.",
      },
      {
        title: "G2, Capterra & Clutch",
        cadence: "Nach Kundenprojekt",
        text: "Sachliches Profil und ausschließlich unabhängige, echte Kundenbewertungen.",
      },
      {
        title: "Product Hunt & Crunchbase",
        cadence: "Zum echten Produktanlass",
        text: "Für eine reale Veröffentlichung, Iteration oder überprüfbare Unternehmensinformation.",
      },
      {
        title: "Quora, Hacker News, Indie Hackers & Medium",
        cadence: "Bei passender Diskussion",
        text: "Nur mit originärer Hilfe, klarer Absenderrolle und einem echten Beitrag zur Diskussion.",
      },
    ],
  },
];

export const RED_GEO_WARNINGS = [
  {
    title: "Verdeckte Linkstrategie",
    text: "Erst neutral wirken, um später Links zu platzieren, ist keine nachhaltige Expertise und wird nicht als Aktion angeboten.",
  },
  {
    title: "Massen- oder Copy-Paste-Aktivität",
    text: "Gleichartige Kommentare, PR-Varianten, KI-Masseninhalte oder Kommentarserien dienen nicht der Qualität.",
  },
  {
    title: "Manipulierte Bewertungen",
    text: "Gekaufte, gelenkte oder KI-generierte Bewertungen sind kein zulässiges Signal. Nur echte Kundenerfahrungen zählen.",
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
  gf4: "Nicht ausführen: Gutefrage ist kein Werbe- oder Linkkanal.",
  gf5: "Nicht ausführen: Keine Serienantworten mit Produktlink.",
  fp2: "Nicht ausführen: Keine Pressemitteilungs-Variation ohne eigenen Nachrichtenanlass.",
  tp2: "Nicht ausführen: Bewertungsabstände dürfen nicht als Manipulationsmuster geplant werden.",
  wd2: "Nicht ausführen: Kein Selbstpromo-Eintrag; nur neutrale, unabhängig belegte Daten mit Offenlegung.",
};
