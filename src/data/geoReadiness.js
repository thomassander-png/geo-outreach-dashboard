export const GEO_READINESS_CHECKS = [
  {
    key: "indexing",
    title: "Indexierung & Robots",
    prompt: "Kann die Zielseite öffentlich gecrawlt und indexiert werden – ohne versehentliches noindex oder blockierende robots-Regel?",
    help: "Nicht raten: URL, robots.txt und relevante Meta-Regeln kurz prüfen.",
  },
  {
    key: "visible_content",
    title: "Antwort sichtbar",
    prompt: "Ist die direkte Kernantwort für Besucher und Crawler im sichtbaren Seiteninhalt erreichbar?",
    help: "Wichtige Fakten nicht nur hinter Login, Klickstrecken oder in schwer zugänglichen Skripten verstecken.",
  },
  {
    key: "oai_searchbot",
    title: "ChatGPT Search bereit",
    prompt: "Darf OAI-SearchBot die öffentliche Website prüfen?",
    help: "Das ist getrennt von GPTBot. Eine Freigabe ist keine Zitationsgarantie.",
  },
  {
    key: "search_discovery",
    title: "Google & Bing auffindbar",
    prompt: "Sind Property, Sitemap und die wichtigsten Zielseiten in den Webmaster-Tools nachvollziehbar?",
    help: "Diese Prüfung schafft eine Messbasis – sie ersetzt keine inhaltliche Qualität.",
  },
  {
    key: "accessible_navigation",
    title: "Navigation verständlich",
    prompt: "Sind Navigation, Formulare und wichtige Buttons klar beschriftet und zugänglich?",
    help: "Sinnvolle Labels und Rollen helfen Menschen sowie assistiven und agentischen Systemen.",
  },
  {
    key: "measurement_path",
    title: "Messweg definiert",
    prompt: "Wisst ihr, wo ihr organische Daten, KI-Stichproben und ChatGPT-Referrals getrennt dokumentiert?",
    help: "Erst den Messweg festlegen. Dann aus echten Beobachtungen lernen.",
  },
];

export const READINESS_STATUS = {
  pending: "Offen",
  passed: "Geprüft",
  review: "Erneut prüfen",
  blocked: "Blockiert",
};

export const CITATION_PROTOCOL = [
  ["1", "Sichtbar festhalten", "System, Datum, Prompt und kurze Antwortzusammenfassung dokumentieren."],
  ["2", "Signal trennen", "Markennennung, Domain-Zitation, Fremdquelle und Referral nicht vermischen."],
  ["3", "Quelle öffnen", "Zitierte URL selbst öffnen und prüfen, ob sie die Aussage tatsächlich stützt."],
  ["4", "Entscheidung sichern", "Als bestätigt, erneut prüfen oder nicht relevant markieren – erst dann Folgeaktion ableiten."],
];
