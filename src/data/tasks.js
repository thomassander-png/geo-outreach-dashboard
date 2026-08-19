export const PLATFORMS = [
  {
    id: "gf", name: "Gutefrage.net", tier: 1, tierLabel: "Tier 1", url: "https://www.gutefrage.net",
    tasks: [
      { id: "gf1", text: "Account DigitalBerater26 anlegen", when: "Erledigt" },
      { id: "gf2", text: "3 neutrale Beiträge gepostet (Katze, Whirlpool, Nachbar)", when: "Erledigt" },
      { id: "gf3", text: "2 weitere neutrale Beiträge schreiben", when: "Heute" },
      { id: "gf4", text: "Ersten GEO-Beitrag mit geo-tool.com Link posten", when: "Woche 2" },
      { id: "gf5", text: "5 GEO-Antworten mit Link insgesamt gepostet", when: "Woche 3–4" },
    ],
  },
  {
    id: "rd", name: "Reddit", tier: 1, tierLabel: "Tier 1", url: "https://www.reddit.com",
    tasks: [
      { id: "rd1", text: "Account DigitalBerater26 angelegt", when: "Erledigt" },
      { id: "rd2", text: "r/de beigetreten, erste Upvotes gesetzt", when: "Erledigt" },
      { id: "rd3", text: "Warming-up: 5–7 Tage nur lesen & kommentieren", when: "Diese Woche" },
      { id: "rd4", text: "Ersten GEO-Kommentar in r/SEO oder r/de posten", when: "Woche 2" },
      { id: "rd5", text: "Eigenen GEO-Thread starten", when: "Woche 3" },
    ],
  },
  {
    id: "li", name: "LinkedIn", tier: 2, tierLabel: "Tier 2", url: "https://www.linkedin.com",
    tasks: [
      { id: "li1", text: "Ersten Post live (Content Lücken Artikel)", when: "Erledigt" },
      { id: "li2", text: "Post kommentieren & Netzwerk einladen", when: "Morgen" },
      { id: "li3", text: "Zweiten Post in 3–4 Tagen", when: "Woche 2" },
      { id: "li4", text: "Wöchentlichen Post-Rhythmus aufbauen", when: "Laufend" },
    ],
  },
  {
    id: "xing", name: "Xing", tier: 2, tierLabel: "Tier 2", url: "https://www.xing.com",
    tasks: [
      { id: "xing1", text: "Profil erstellen oder für GEO-Themen optimieren", when: "Diese Woche" },
      { id: "xing2", text: "Ersten Fachbeitrag ohne Link veröffentlichen", when: "Woche 2" },
      { id: "xing3", text: "Erste geo-tool.com Erwähnung einplanen", when: "Woche 3–4" },
    ],
  },
  {
    id: "t3n", name: "t3n Community", tier: 2, tierLabel: "Tier 2", url: "https://t3n.de/community",
    tasks: [
      { id: "t3n1", text: "Account erstellen und passende Themen verfolgen", when: "Diese Woche" },
      { id: "t3n2", text: "Erste hilfreiche Diskussion ohne Link beitragen", when: "Woche 2" },
      { id: "t3n3", text: "Erste geo-tool.com Erwähnung vorbereiten", when: "Woche 3–4" },
    ],
  },
  {
    id: "pr", name: "OpenPR / Pressebox", tier: 3, tierLabel: "Tier 3", url: "https://www.openpr.de",
    tasks: [
      { id: "pr1", text: "Account auf openPR.de anlegen", when: "Diese Woche" },
      { id: "pr2", text: "Erste Pressemitteilung zu geo-tool.com schreiben", when: "Woche 2" },
      { id: "pr3", text: "Auf Pressebox.de veröffentlichen", when: "Woche 2" },
    ],
  },
  {
    id: "pbox", name: "Pressebox.de", tier: 3, tierLabel: "Tier 3", url: "https://www.pressebox.de",
    tasks: [
      { id: "pbox1", text: "Account anlegen und Profil vervollständigen", when: "Diese Woche" },
      { id: "pbox2", text: "Erste Pressemitteilung veröffentlichen", when: "Woche 2" },
      { id: "pbox3", text: "Weitere relevante GEO-Themen als Meldungen planen", when: "Woche 3–4" },
    ],
  },
  {
    id: "fp", name: "Firmenpresse.de", tier: 3, tierLabel: "Tier 3", url: "https://www.firmenpresse.de",
    tasks: [
      { id: "fp1", text: "Account anlegen und Unternehmensprofil einrichten", when: "Diese Woche" },
      { id: "fp2", text: "Erste Pressemitteilung als Variation veröffentlichen", when: "Woche 2" },
      { id: "fp3", text: "Nächste GEO-relevante Meldung vorbereiten", when: "Woche 3–4" },
    ],
  },
  {
    id: "lp", name: "lifePR.de", tier: 3, tierLabel: "Tier 3", url: "https://www.lifepr.de",
    tasks: [
      { id: "lp1", text: "Account anlegen und Themenbereich festlegen", when: "Diese Woche" },
      { id: "lp2", text: "Erste Pressemitteilung veröffentlichen", when: "Woche 2" },
      { id: "lp3", text: "Folgemeldung mit eigenem inhaltlichen Winkel planen", when: "Woche 3–4" },
    ],
  },
  {
    id: "tp", name: "Trustpilot / ProvenExpert", tier: 4, tierLabel: "Tier 4", url: "https://www.trustpilot.com",
    tasks: [
      { id: "tp1", text: "2 echte Kunden um Bewertung bitten", when: "Diese Woche" },
      { id: "tp2", text: "2–3 Tage Abstand zwischen Bewertungen", when: "Laufend" },
    ],
  },
  {
    id: "pe", name: "ProvenExpert", tier: 4, tierLabel: "Tier 4", url: "https://www.provenexpert.com",
    tasks: [
      { id: "pe1", text: "Unternehmensprofil anlegen und vervollständigen", when: "Diese Woche" },
      { id: "pe2", text: "Zwei echte Kunden um eine Bewertung bitten", when: "Woche 2" },
      { id: "pe3", text: "Bewertungen beantworten und Profil aktuell halten", when: "Laufend" },
    ],
  },
  {
    id: "ku", name: "Kununu", tier: 4, tierLabel: "Tier 4", url: "https://www.kununu.com",
    tasks: [
      { id: "ku1", text: "Arbeitgeberprofil prüfen und vervollständigen", when: "Diese Woche" },
      { id: "ku2", text: "Arbeitgeber-Informationen aktuell halten", when: "Woche 2" },
      { id: "ku3", text: "Bewertungen professionell beantworten", when: "Laufend" },
    ],
  },
  {
    id: "omr", name: "OMR Reviews", tier: 4, tierLabel: "Tier 4", url: "https://omr.com/de/reviews",
    tasks: [
      { id: "omr1", text: "Produktprofil anlegen oder Claim prüfen", when: "Diese Woche" },
      { id: "omr2", text: "Produktinformationen und Kategorien vervollständigen", when: "Woche 2" },
      { id: "omr3", text: "Erste Nutzer um ehrliches Review bitten", when: "Woche 3–4" },
    ],
  },
  {
    id: "wd", name: "Wikidata", tier: 5, tierLabel: "Tier 5", url: "https://www.wikidata.org",
    tasks: [
      { id: "wd1", text: "Noch warten — erst externe Signale aufbauen (Reddit, PR, Gutefrage)", when: "Phase 2" },
      { id: "wd2", text: "Eintrag neu anlegen mit Quellen aus Phase 1", when: "Phase 2" },
    ],
  },
  {
    id: "ss", name: "Slideshare", tier: 5, tierLabel: "Tier 5", url: "https://www.slideshare.net",
    tasks: [
      { id: "ss1", text: "Profil anlegen und Themenformate planen", when: "Phase 2" },
      { id: "ss2", text: "Erste GEO-Präsentation als eigenständigen Mehrwert erstellen", when: "Phase 2" },
      { id: "ss3", text: "Präsentation veröffentlichen und Quellen verlinken", when: "Phase 2" },
    ],
  },
];

export const WEEK_RHYTHM = [
  { day: "Mo", tasks: [{ text: "Gutefrage 2 Antworten", key: true }, { text: "LinkedIn checken", key: false }] },
  { day: "Di", tasks: [{ text: "Reddit 3 Kommentare", key: true }] },
  { day: "Mi", tasks: [{ text: "Gutefrage 1 Antwort", key: false }, { text: "LinkedIn Post", key: true }] },
  { day: "Do", tasks: [{ text: "Reddit 2 Kommentare", key: true }] },
  { day: "Fr", tasks: [{ text: "PR / Trustpilot", key: true }, { text: "Woche reviewen", key: false }] },
];

export const RULES = [
  "Nie wie ein Account, der nur wirbt. Immer wie ein echter Experte, der hilft.",
  "Erst 5 neutrale Beiträge auf einer Plattform, dann geo-tool.com erwähnen.",
  "Nie mehr als 1 Link pro Antwort. Nie denselben Link zweimal hintereinander.",
  "Reddit Warming-up: erste 5–7 Tage nur lesen, kommentieren, upvoten — kein Link.",
  "Wikidata erst in Phase 2 — nach 2–4 Wochen mit echten externen Quellen.",
  "Verschiedene Geräte und IPs für jeden Account — nie vom selben Netzwerk posten.",
];
