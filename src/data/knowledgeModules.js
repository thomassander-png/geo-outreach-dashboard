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
      { title: "Erst die Gliederung", text: "Lege vor dem Schreiben fest: direkte Antwort, nötige Teilfragen, Quelle und Praxisbeleg. So bleibt der Inhalt klar statt aufgebläht." },
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
      { title: "Leicht auffindbar", text: "Prüfe nach wichtigen Änderungen: verständliche Überschriften, interne Verknüpfung, technische Erreichbarkeit und ob die Seite wirklich öffentlich zugänglich ist." },
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
      { title: "Nachweisbare Präsenz", text: "Fallstudien, sichtbare Expertise und echte Rückmeldungen sind stärker als eine bloße Anzahl an Erwähnungen." },
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
      { title: "Keine Schnellversprechen", text: "Eine Beobachtung ist noch kein Beweis. Dokumentiere Datum, Frage, Quelle und nächste Prüfung statt ein Ranking zu versprechen." },
    ],
  },
];

const guide = (why, how, avoid, done) => ({ why, how, avoid, done });

export const DAILY_ACTION_GUIDES = {
  "daily-source-fact": guide("Nachvollziehbare Aussagen machen eine Quelle vertrauenswürdiger.", "Lies den Satz, ergänze die belastbare Primärquelle oder markiere die offene Recherche.", "Keine unbelegten Superlative, erfundenen Zahlen oder Quellen ohne Bezug.", "Die Aussage hat eine passende Quelle oder ist bewusst als offen markiert."),
  "daily-source-clarity": guide("Klare, vollständige Antworten helfen Menschen schneller.", "Formuliere zuerst die direkte Antwort. Lege danach Überschriften, nötige Teilfragen und entscheidungsrelevanten Kontext fest.", "Keine Einleitung ohne Antwort, keine Keyword-Wiederholung und keine Fülltexte.", "Eine reale Frage wird klar beantwortet, die Struktur ist nachvollziehbar und der nächste Schritt verständlich."),
  "daily-topic-gap": guide("Themenautorität entsteht aus sinnvoll verbundenen Fragen.", "Notiere Frage, fehlenden Teilaspekt und Nutzen. Verknüpfe die Lücke mit einer bestehenden Antwort und einer möglichen Gliederung.", "Keine Themen nur wegen Suchvolumen ohne Bezug zur Zielgruppe.", "Die Lücke hat Frage, Nutzen, Bezug zum Thema und eine mögliche nächste Quelle oder Antwort."),
  "daily-proof": guide("Echte Nachweise sind stärker als bloße Behauptungen.", "Sichere ein reales Ergebnis, eine Erfahrung oder einen überprüfbaren Screenshot-Hinweis mit Kontext und Datum.", "Keine geschönten Ergebnisse, fremden Belege ohne Einordnung oder erfundenen Testimonials.", "Der Nachweis ist nachvollziehbar, datiert und der passenden Aussage zugeordnet."),
  "daily-reddit-listen": guide("Eine passende Diskussion kann echte Nutzerfragen sichtbar machen; eine Antwort ist nie Pflicht.", "Lies Diskussion und Subreddit-Regeln vollständig. Dokumentiere die Frage oder beteilige dich nur individuell, wenn du wirklich helfen kannst.", "Keine Copy-Paste-Antworten, Link-Drops, Mehrkonten, künstliche Interaktionen oder Kommentarquote.", "Die Diskussion ist als passend, unpassend oder regelbedingt ausgeschlossen dokumentiert – oder ein individueller hilfreicher Beitrag ist geleistet."),
  "daily-linkedin-engage": guide("Eine individuelle Fachinteraktion kann Kompetenz zeigen, wenn ein konkreter Anlass vorliegt.", "Prüfe zuerst Relevanz und eigene Erkenntnis. Reagiere nur auf eine konkrete Aussage oder echte Rückfrage.", "Keine Standard-Kommentare, Engagement-Pods, Kontaktquote oder automatischen Anfragen.", "Die Chance ist bewusst verworfen oder der Beitrag ist individuell, fachlich und auch ohne Erwähnung nützlich."),
  "daily-qa-monitor": guide("Fragenportale zeigen reale Sprachmuster und Themenlücken für die eigene Quelle.", "Erfasse die Nutzerfrage, den fehlenden Teilaspekt und eine mögliche Antwort für geo-tool.com. Lies Plattformregeln nur zur Einordnung.", "Keine Produktwerbung, Dienstleistungsangebote, Linkantworten oder Plattformroutine auf Gutefrage.", "Die Frage ist als Themenlücke für die eigene Quelle dokumentiert oder bewusst verworfen."),
  "daily-mention-check": guide("Eine externe Erwähnung ist nur bei echtem Anlass und klarer Plattformfreigabe ein gutes Signal.", "Prüfe Nachrichtenwert oder Diskussionskontext, Plattformregel, Transparenz und echten Mehrwert, bevor du eine Erwähnung erwägst.", "Keine verdeckte Werbung, Linktausch ohne Mehrwert, PR-Variation oder Erwähnung nur für einen Backlink.", "Die Gelegenheit ist grün freigegeben, gelb zur Prüfung markiert oder bewusst verworfen."),
  "daily-measurement": guide("Ein System verbessert sich aus beobachteten Signalen statt aus Bauchgefühl.", "Notiere Frage, Datum, System, Beobachtung und begründete Folgeaktion. Prüfe auch, ob Inhalt technisch erreichbar und aktuell ist.", "Keine Kennzahl ohne Kontext und keine Schlussfolgerung aus einem Zufallssignal.", "Das Signal ist datiert, verständlich beschrieben und hat eine begründete Folgeaktion."),
  "daily-review": guide("Ein kurzer Abschluss macht den nächsten Arbeitstag leichter.", "Halte fest: Was hat funktioniert? Was bleibt offen? Welche Erkenntnis oder Quelle prüfen wir als Nächstes?", "Keine lange Rückschau ohne konkrete Folgeentscheidung.", "Eine Entscheidung für den nächsten sinnvollen Schritt ist dokumentiert."),
};

export const CONTENT_SOP = [
  ["1", "Frage & Ziel", "Welche konkrete Nutzerfrage beantworten wir und warum hilft sie der Zielgruppe?"],
  ["2", "Recherche & Gliederung", "Direkte Antwort, Teilfragen, relevante Quelle und sinnvolle Überschriften vorab festlegen."],
  ["3", "Antwort", "Die direkte, verständliche Antwort zuerst formulieren – ohne Fülltext."],
  ["4", "Beleg & Praxis", "Fakten belegbar machen und ein echtes Beispiel, Ergebnis oder eine klare Grenze ergänzen."],
  ["5", "Freigabe & Auffindbarkeit", "Nutzen, Transparenz, technische Erreichbarkeit und den nächsten Messpunkt vor Veröffentlichung prüfen."],
];

export const WEEKLY_REVIEW = [
  ["Behalten", "Welche Aktion oder Quelle hatte erkennbaren Nutzen?"],
  ["Verbessern", "Wo war die Antwort, der Nachweis oder der Kontext noch schwach?"],
  ["Ersetzen", "Welche Routine passt nicht mehr und wird bewusst durch eine bessere ersetzt?"],
  ["Beobachten", "Welche Zielfrage, Quelle oder Suchoberfläche prüfen wir mit Datum erneut?"],
];
