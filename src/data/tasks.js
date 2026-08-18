export const PLATFORMS = [
  {
    id: 'gf', name: 'Gutefrage.net', tier: 1, tierLabel: 'Top Signal', url: 'https://www.gutefrage.net',
    tasks: [
      { id: 'gf1', text: 'Account anlegen', when: 'Einmalig' },
      { id: 'gf2', text: '3 neutrale Beiträge posten', when: 'Woche 1' },
      { id: 'gf3', text: '2 weitere neutrale Beiträge — dann sind es 5', when: 'Woche 1' },
      { id: 'gf4', text: 'Ersten GEO-Beitrag mit geo-tool.com Link posten', when: 'Woche 2' },
      { id: 'gf5', text: '5 GEO-Antworten mit Link insgesamt gepostet', when: 'Woche 3-4' },
    ]
  },
  {
    id: 'rd', name: 'Reddit', tier: 1, tierLabel: 'Top Signal', url: 'https://www.reddit.com',
    tasks: [
      { id: 'rd1', text: 'Account anlegen (neutral, kein Firmenbezug)', when: 'Einmalig' },
      { id: 'rd2', text: 'Subreddits beitreten und erste Upvotes setzen', when: 'Tag 1' },
      { id: 'rd3', text: 'Warming-up: 5-7 Tage nur lesen und kommentieren', when: 'Woche 1' },
      { id: 'rd4', text: 'Ersten GEO-Kommentar in r/SEO oder r/de posten', when: 'Woche 2' },
      { id: 'rd5', text: 'Eigenen GEO-Thread starten', when: 'Woche 3' },
    ]
  },
  {
    id: 'li', name: 'LinkedIn', tier: 2, tierLabel: 'Content', url: 'https://www.linkedin.com',
    tasks: [
      { id: 'li1', text: 'Ersten Blogpost teilen mit Link', when: 'Woche 1' },
      { id: 'li2', text: 'Post kommentieren und Netzwerk einladen', when: 'Tag danach' },
      { id: 'li3', text: 'Zweiten Post in 3-4 Tagen', when: 'Woche 2' },
      { id: 'li4', text: 'Woechentlichen Post-Rhythmus aufbauen', when: 'Laufend' },
    ]
  },
  {
    id: 'pr', name: 'OpenPR / Pressebox', tier: 3, tierLabel: 'PR', url: 'https://www.openpr.de',
    tasks: [
      { id: 'pr1', text: 'Account auf openPR.de anlegen', when: 'Woche 1' },
      { id: 'pr2', text: 'Erste Pressemitteilung zu geo-tool.com schreiben', when: 'Woche 2' },
      { id: 'pr3', text: 'Auf Pressebox.de veroeffentlichen', when: 'Woche 2' },
    ]
  },
  {
    id: 'tp', name: 'Trustpilot / ProvenExpert', tier: 4, tierLabel: 'Trust', url: 'https://www.trustpilot.com',
    tasks: [
      { id: 'tp1', text: '2 echte Kunden um Bewertung bitten', when: 'Woche 1' },
      { id: 'tp2', text: '2-3 Tage Abstand zwischen Bewertungen', when: 'Laufend' },
      { id: 'tp3', text: 'ProvenExpert-Profil anlegen', when: 'Woche 2' },
    ]
  },
  {
    id: 'wd', name: 'Wikidata', tier: 5, tierLabel: 'Knowledge', url: 'https://www.wikidata.org',
    tasks: [
      { id: 'wd1', text: 'Warten - erst externe Signale aufbauen in Phase 1', when: 'Phase 2' },
      { id: 'wd2', text: 'Eintrag neu anlegen mit Quellen aus Phase 1', when: 'Phase 2' },
    ]
  },
];

export const WEEK_RHYTHM = [
  { day: 'Mo', tasks: [{ text: 'Gutefrage 2 Antworten', key: true }, { text: 'LinkedIn checken', key: false }] },
  { day: 'Di', tasks: [{ text: 'Reddit 3 Kommentare', key: true }] },
  { day: 'Mi', tasks: [{ text: 'Gutefrage 1 Antwort', key: false }, { text: 'LinkedIn Post', key: true }] },
  { day: 'Do', tasks: [{ text: 'Reddit 2 Kommentare', key: true }] },
  { day: 'Fr', tasks: [{ text: 'PR / Trustpilot', key: true }, { text: 'Woche reviewen', key: false }] },
];

export const RULES = [
  'Nie wie ein Account der nur wirbt. Immer wie ein echter Experte der hilft.',
  'Erst 5 neutrale Beitraege auf einer Plattform, dann geo-tool.com erwaehnen.',
  'Nie mehr als 1 Link pro Antwort. Nie denselben Link zweimal hintereinander.',
  'Reddit Warming-up: erste 5-7 Tage nur lesen, kommentieren, upvoten - kein Link.',
  'Wikidata erst in Phase 2 - nach 2-4 Wochen mit echten externen Quellen.',
  'Verschiedene Geraete und IPs fuer jeden Account - nie vom selben Netzwerk posten.',
];
