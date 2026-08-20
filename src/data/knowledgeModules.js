export const PLAYBOOK_STAGES = [
  {
    id: "questions",
    number: "01",
    title: "Fragen verstehen",
    summary: "Finde echte Nutzerfragen und priorisiere die Lücken, bei denen geo-tool.com wirklich helfen kann.",
    next: "Eine konkrete Frage oder Themenlücke dokumentieren.",
    cards: [
      { title: "Themen vor Einzel-Keywords", text: "Baue Antworten zu einem zusammenhängenden Thema auf. Eine starke Quelle beantwortet mehrere wichtige Teilfragen nachvollziehbar." },
      { title: "Relevanz zuerst", text: "Prüfe: Hilft diese Frage der Zielgruppe und passt sie wirklich zum Angebot? Nur dann wird sie Teil des Plans." },
    ],
  },
  {
    id: "source",
    number: "02",
    title: "Quelle aufbauen",
    summary: "Mache Antworten klar, belegbar und nützlich – mit Fakten, Praxisbeispielen und echten Nachweisen.",
    next: "Eine Antwort, Quelle oder einen Praxisbeleg verbessern.",
    cards: [
      { title: "Eine Antwort pro Seite", text: "Eine klare Frage verdient eine direkte, vollständige Antwort. Ergänze Kontext nur dort, wo er die Entscheidung wirklich erleichtert." },
      { title: "Belege statt Behauptungen", text: "Nutze überprüfbare Quellen, reale Erfahrungen und transparente Fallbeispiele. Markiere offene Recherche statt etwas zu behaupten." },
    ],
  },
  {
    id: "outreach",
    number: "03",
    title: "Sauber verbreiten",
    summary: "Beteilige dich fachlich auf passenden Kanälen. Reichweite entsteht aus Relevanz und Vertrauen, nicht aus Wiederholung.",
    next: "Eine passende Gelegenheit prüfen und nur bei echtem Kontext handeln.",
    cards: [
      { title: "Mehrwert vor Link", text: "Hilf zuerst konkret. Eine Erwähnung von geo-tool.com ist nur sinnvoll, wenn sie erlaubt, transparent und für die konkrete Frage nützlich ist." },
      { title: "Kanalregeln respektieren", text: "Jede Community hat eigene Regeln. Keine Massenbeiträge, verdeckte Werbung, Fake-Profile oder automatisierte Interaktionen." },
    ],
  },
  {
    id: "improve",
    number: "04",
    title: "Wirkung verbessern",
    summary: "Halte echte Signale fest und verbessere nur auf Basis dessen, was du beobachtet hast.",
    next: "Ein Ergebnis dokumentieren und daraus eine bessere Folgeaktion ableiten.",
    cards: [
      { title: "Systeme getrennt beobachten", text: "Google-Suche, AI Overviews, Perplexity und ChatGPT Search sind unterschiedliche Beobachtungsfelder. Prüfe, wo echte Fragen, Erwähnungen oder Signale entstehen." },
      { title: "Kleiner Wochenreview", text: "Frage einmal pro Woche: Was behalten wir? Was verbessern wir? Was ersetzen wir? Der Kalender liefert die Nachweise dafür." },
    ],
  },
];

const guide = (why, how, avoid, done) => ({ why, how, avoid, done });

export const DAILY_ACTION_GUIDES = {
  "daily-source-fact": guide("Nachvollziehbare Aussagen machen eine Quelle vertrauenswürdiger.", "Lies den Satz, ergänze die belastbare Primärquelle oder markiere die offene Recherche.", "Keine unbelegten Superlative, erfundenen Zahlen oder Quellen ohne Bezug.", "Die Aussage hat eine passende Quelle oder ist bewusst als offen markiert."),
  "daily-source-clarity": guide("Klare, vollständige Antworten helfen Menschen schneller.", "Formuliere zuerst die direkte Antwort und ergänze nur entscheidungsrelevanten Kontext.", "Keine Einleitung ohne Antwort, keine Keyword-Wiederholung und keine Fülltexte.", "Eine reale Frage wird klar beantwortet und der nächste Schritt ist verständlich."),
  "daily-topic-gap": guide("Themenautorität entsteht aus sinnvoll verbundenen Fragen.", "Notiere Frage, fehlenden Teilaspekt und Nutzen. Verknüpfe die Lücke mit einer bestehenden Antwort.", "Keine Themen nur wegen Suchvolumen ohne Bezug zur Zielgruppe.", "Die Lücke hat Frage, Nutzen und eine mögliche nächste Quelle oder Antwort."),
  "daily-proof": guide("Echte Nachweise sind stärker als bloße Behauptungen.", "Sichere ein reales Ergebnis, eine Erfahrung oder einen überprüfbaren Screenshot-Hinweis mit Kontext.", "Keine geschönten Ergebnisse, fremden Belege ohne Einordnung oder erfundenen Testimonials.", "Der Nachweis ist nachvollziehbar, datiert und der passenden Aussage zugeordnet."),
  "daily-reddit-listen": guide("Fachliche Beteiligung kann Vertrauen aufbauen, wenn sie eine echte Frage besser beantwortet.", "Lies die Diskussion vollständig und antworte nur, wenn du individuell helfen kannst und Regeln es erlauben.", "Keine Copy-Paste-Antworten, Link-Drops, Mehrkonten oder künstliche Interaktionen.", "Eine passende Diskussion ist geprüft oder ein individueller, hilfreicher Beitrag ist geleistet."),
  "daily-linkedin-engage": guide("Individuelle Fachbeiträge zeigen Kompetenz und schaffen Beziehungen.", "Reagiere auf eine konkrete Aussage, ergänze eine Beobachtung oder beantworte eine echte Rückfrage.", "Keine Standard-Kommentare, Engagement-Pods oder automatischen Kontaktanfragen.", "Der Beitrag ist individuell, fachlich und auch ohne Erwähnung nützlich."),
  "daily-qa-monitor": guide("Q&A-Prüfungen zeigen reale Fragen und Sprachmuster der Zielgruppe.", "Prüfe echten Hilfebedarf und lies die Plattformregeln, bevor du etwas schreibst.", "Keine Produktwerbung, Dienstleistungsangebote oder Links gegen Plattformregeln.", "Die Chance ist sauber verworfen oder als zulässige, hilfreiche Antwort vorbereitet."),
  "daily-mention-check": guide("Eine Erwähnung ist nur mit echtem Kontext ein gutes Signal.", "Prüfe Kontext, Plattformregel und Transparenz, bevor du eine Erwähnung überhaupt erwägst.", "Keine verdeckte Werbung, Linktausch ohne Mehrwert oder Erwähnung nur für einen Backlink.", "Die Gelegenheit ist grün freigegeben, gelb zur Prüfung markiert oder bewusst verworfen."),
  "daily-measurement": guide("Ein System verbessert sich aus beobachteten Signalen statt aus Bauchgefühl.", "Notiere eine echte Reaktion, Erwähnung, Suchanfrage oder Erkenntnis und leite einen Folgeschritt ab.", "Keine Kennzahl ohne Kontext und keine Schlussfolgerung aus einem Zufallssignal.", "Das Signal ist datiert, verständlich beschrieben und hat eine begründete Folgeaktion."),
  "daily-review": guide("Ein kurzer Abschluss macht den nächsten Arbeitstag leichter.", "Halte fest: Was hat funktioniert? Was bleibt offen? Was hat morgen echte Priorität?", "Keine lange Rückschau ohne konkrete Folgeentscheidung.", "Eine Entscheidung für den nächsten sinnvollen Schritt ist dokumentiert."),
};

export const CONTENT_SOP = [
  ["1", "Frage", "Welche konkrete Nutzerfrage beantworten wir?"],
  ["2", "Antwort", "Die direkte Antwort zuerst formulieren."],
  ["3", "Quelle", "Fakten oder Aussagen belegbar machen."],
  ["4", "Praxisbeleg", "Ein echtes Beispiel, Ergebnis oder eine Grenze ergänzen."],
  ["5", "Freigabe", "Verständlichkeit, Nutzen und Transparenz vor Veröffentlichung prüfen."],
];

export const WEEKLY_REVIEW = [
  ["Behalten", "Welche Aktion oder Quelle hatte erkennbaren Nutzen?"],
  ["Verbessern", "Wo war die Antwort, der Nachweis oder der Kontext noch schwach?"],
  ["Ersetzen", "Welche Routine passt nicht mehr und wird bewusst durch eine bessere ersetzt?"],
];
