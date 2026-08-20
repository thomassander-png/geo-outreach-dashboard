import { useEffect, useMemo, useState } from "react";
import {
  linkClaimSource,
  linkQuestionContent,
  prepareGoogleIntegration,
  saveEvidenceClaim,
  saveEvidenceSource,
  saveIntelligenceProfile,
  saveMetricSnapshot,
  saveMetricSnapshots,
  savePromptMonitor,
  savePromptSnapshot,
  saveResearchQuestion,
  saveTopicCluster,
} from "./data/intelligenceStore";

const today = () => new Date().toISOString().slice(0, 10);
const emptyProfile = { domain: "", targetMarket: "Deutschland", targetAudience: "", primaryGoal: "Organische Sichtbarkeit", primaryConversion: "", baselineNotes: "" };
const emptyTopic = { name: "", description: "", businessWeight: "3", status: "active" };
const emptyQuestion = { question: "", topicId: "", searchIntent: "informational", businessWeight: "3", visibilityGap: "50", impactScore: "0", effortScore: "3", riskLevel: "green", status: "backlog", targetUrl: "", coverageStatus: "missing", linkedTaskId: "" };
const emptySource = { sourceUrl: "", title: "", publisher: "", sourceType: "official", publishedAt: "", verifiedAt: today(), reviewDueAt: "", evidenceStrength: "4", note: "" };
const emptyClaim = { claimText: "", topicId: "", importance: "3", status: "needs_evidence", lastVerifiedAt: "", reviewDueAt: "", sourceId: "" };
const emptyMetric = { metricDate: today(), source: "manual", metricType: "impressions", metricValue: "", pageUrl: "", queryText: "", country: "Deutschland", device: "", note: "" };
const emptyMonitor = { questionId: "", promptText: "", systemName: "Manuelle Prüfung", languageCode: "de", priority: "3", status: "active" };
const emptySnapshot = { checkedAt: today(), answerSummary: "", brandMentioned: false, domainCited: false, citedDomains: "", evidenceUrl: "", reviewerNote: "" };

function formatDate(value) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function scoreQuestion(question, claimLinksByTopic, contentLinksByQuestion) {
  const evidenceGap = claimLinksByTopic.get(question.topic_id) || 0;
  const coverageGap = contentLinksByQuestion.has(question.id) ? 0 : 25;
  const riskPenalty = question.risk_level === "amber" ? 8 : 0;
  return Math.max(0, Math.round((question.business_weight * 12) + (question.visibility_gap * 0.34) + (question.impact_score * 0.24) + evidenceGap + coverageGap - (question.effort_score * 5) - riskPenalty));
}

function splitCsvLine(line, delimiter) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseMetricCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("Die CSV braucht eine Kopfzeile und mindestens einen Messwert.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(value => value.toLowerCase().trim());
  const column = (...names) => headers.findIndex(header => names.includes(header));
  const dateIndex = column("date", "datum", "metric_date");
  const typeIndex = column("metric", "metric_type", "kennzahl");
  const valueIndex = column("value", "wert", "metric_value");
  if ([dateIndex, typeIndex, valueIndex].includes(-1)) throw new Error("Pflichtspalten fehlen: date, metric und value.");
  const pageIndex = column("page_url", "page", "url", "seite");
  const queryIndex = column("query", "query_text", "suchfrage");
  const countryIndex = column("country", "land");
  const deviceIndex = column("device", "geraet", "gerät");
  const noteIndex = column("note", "notiz");
  const allowedTypes = new Set(["clicks", "impressions", "ctr", "position", "sessions", "referrals", "conversions", "mentions", "citations"]);

  const rows = lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line, delimiter);
    const metricType = values[typeIndex]?.toLowerCase();
    const metricValue = Number(String(values[valueIndex] || "").replace(",", "."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values[dateIndex] || "") || !allowedTypes.has(metricType) || Number.isNaN(metricValue)) {
      throw new Error(`Zeile ${index + 2} ist nicht gültig. Datum, Kennzahl und Wert prüfen.`);
    }
    return {
      metricDate: values[dateIndex],
      metricType,
      metricValue,
      source: "csv",
      pageUrl: pageIndex >= 0 ? values[pageIndex] || "" : "",
      queryText: queryIndex >= 0 ? values[queryIndex] || "" : "",
      country: countryIndex >= 0 ? values[countryIndex] || "" : "",
      device: deviceIndex >= 0 ? values[deviceIndex] || "" : "",
      note: noteIndex >= 0 ? values[noteIndex] || "" : "",
    };
  });
  return rows;
}

function googleStatusCopy(integration) {
  if (!integration) return { title: "Noch nicht vorbereitet", text: "Die read-only Verbindung kann schon heute technisch vorbereitet werden. Die Google-Freigabe bleibt für morgen offen.", tone: "pending" };
  if (integration.status === "connected") return { title: "Verbunden", text: integration.last_synced_at ? `Letzter Import: ${formatDate(integration.last_synced_at.slice(0, 10))}` : "Wartet auf den ersten sicheren Import.", tone: "connected" };
  if (integration.status === "error") return { title: "Aufmerksamkeit nötig", text: integration.last_error_message || "Die Verbindung braucht eine erneute Prüfung.", tone: "error" };
  return { title: "Für morgen vorbereitet", text: "Die Google-Kontoauswahl und die read-only Zustimmung sind der einzige verbleibende Freigabeschritt.", tone: "pending" };
}

function FormNotice({ notice }) {
  return notice ? <p className={`intelligence-notice ${notice.type}`}>{notice.text}</p> : null;
}

export default function IntelligenceView({ workspace, data, onRefresh }) {
  const [section, setSection] = useState("focus");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [sourceForm, setSourceForm] = useState(emptySource);
  const [claimForm, setClaimForm] = useState(emptyClaim);
  const [metricForm, setMetricForm] = useState(emptyMetric);
  const [monitorForm, setMonitorForm] = useState(emptyMonitor);
  const [snapshotForm, setSnapshotForm] = useState(emptySnapshot);

  const canConfigure = workspace.role === "admin";
  const topicsById = useMemo(() => new Map(data.topics.map(item => [item.id, item])), [data.topics]);
  const sourceCountByClaim = useMemo(() => {
    const result = new Map();
    data.claimLinks.forEach(link => result.set(link.claim_id, (result.get(link.claim_id) || 0) + 1));
    return result;
  }, [data.claimLinks]);
  const unsupportedClaimsByTopic = useMemo(() => {
    const result = new Map();
    data.claims.filter(claim => claim.status !== "supported" || !sourceCountByClaim.get(claim.id)).forEach(claim => {
      result.set(claim.topic_id, (result.get(claim.topic_id) || 0) + 10);
    });
    return result;
  }, [data.claims, sourceCountByClaim]);
  const linkedQuestions = useMemo(() => new Set(data.questionLinks.map(link => link.question_id)), [data.questionLinks]);
  const rankedQuestions = useMemo(() => data.questions
    .filter(question => ["backlog", "in_progress", "paused"].includes(question.status))
    .map(question => ({ ...question, priorityScore: scoreQuestion(question, unsupportedClaimsByTopic, linkedQuestions) }))
    .sort((first, second) => second.priorityScore - first.priorityScore), [data.questions, unsupportedClaimsByTopic, linkedQuestions]);
  const sourcesDue = useMemo(() => data.sources.filter(source => source.review_due_at && source.review_due_at <= today()), [data.sources]);
  const activeMonitors = useMemo(() => data.monitors.filter(monitor => monitor.status === "active"), [data.monitors]);
  const coveredMonitors = useMemo(() => new Set(data.snapshots.map(snapshot => snapshot.monitor_id)), [data.snapshots]);
  const selectedMonitor = data.monitors.find(item => item.id === selectedMonitorId) || activeMonitors[0] || null;
  const selectedMonitorSnapshots = useMemo(() => data.snapshots.filter(item => item.monitor_id === selectedMonitor?.id).slice(0, 4), [data.snapshots, selectedMonitor]);

  useEffect(() => {
    if (!data.profile) {
      setProfileForm(emptyProfile);
      return;
    }
    setProfileForm({
      domain: data.profile.domain || "",
      targetMarket: data.profile.target_market || "Deutschland",
      targetAudience: data.profile.target_audience || "",
      primaryGoal: data.profile.primary_goal || "Organische Sichtbarkeit",
      primaryConversion: data.profile.primary_conversion || "",
      baselineNotes: data.profile.baseline_notes || "",
    });
  }, [data.profile]);

  useEffect(() => {
    if (selectedMonitor && selectedMonitor.id !== selectedMonitorId) setSelectedMonitorId(selectedMonitor.id);
  }, [selectedMonitor, selectedMonitorId]);

  const submit = async (key, operation, successText, reset) => {
    setBusy(key);
    setNotice(null);
    try {
      await operation();
      await onRefresh();
      if (reset) reset();
      setNotice({ type: "success", text: successText });
    } catch (error) {
      setNotice({ type: "error", text: error?.message || "Speichern nicht möglich. Bitte prüfe die Eingabe." });
    } finally {
      setBusy("");
    }
  };

  const focus = useMemo(() => {
    if (!data.profile?.domain) return { type: "measurement", title: "Messbasis für deine Domain anlegen", text: "Ohne Domain, Zielgruppe und Conversion-Ziel kann das System keine sinnvolle Wirkung bewerten.", action: "Messbasis öffnen" };
    if (!data.metrics.length) return { type: "measurement", title: "Ersten Baseline-Wert eintragen", text: "Trage einen echten Ausgangswert ein, damit spätere Arbeit mit einem Vergleich startet.", action: "Messwert eintragen" };
    if (sourcesDue.length) return { type: "evidence", title: "Eine wichtige Quelle ist fällig", text: `„${sourcesDue[0].title}“ sollte heute erneut geprüft oder ersetzt werden.`, action: "Quelle prüfen" };
    const unsupported = data.claims.find(claim => claim.status !== "supported" || !sourceCountByClaim.get(claim.id));
    if (unsupported) return { type: "evidence", title: "Einen Claim belastbar belegen", text: `„${unsupported.claim_text}“ braucht noch eine nachvollziehbare Quelle.`, action: "Evidenz öffnen" };
    if (rankedQuestions.length) return { type: "evidence", title: "Die wichtigste offene Nutzerfrage bearbeiten", text: `„${rankedQuestions[0].question}“ hat aktuell den höchsten erklärbaren Prioritätsscore.`, action: "Frage öffnen" };
    if (!activeMonitors.length) return { type: "monitor", title: "Ersten GEO-Prompt festlegen", text: "Lege eine echte Zielgruppenfrage fest, die ihr regelmäßig und transparent prüft.", action: "Prompt anlegen" };
    const uncovered = activeMonitors.find(monitor => !coveredMonitors.has(monitor.id));
    if (uncovered) return { type: "monitor", title: "Erste GEO-Antwort dokumentieren", text: `Prüfe den Prompt „${uncovered.prompt_text}“ manuell und dokumentiere nur das, was tatsächlich sichtbar war.`, action: "Antwort erfassen" };
    return { type: "focus", title: "Deine Intelligence-Basis ist aktuell", text: "Prüfe heute eine offene Frage, eine Quelle oder einen Prompt. Das System zeigt die Nachweise zentral.", action: "Übersicht ansehen" };
  }, [activeMonitors, coveredMonitors, data.claims, data.metrics.length, data.profile?.domain, rankedQuestions, sourceCountByClaim, sourcesDue]);

  const openFocus = () => setSection(focus.type === "focus" ? "evidence" : focus.type);
  const handleCsvUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy("csv");
    setNotice(null);
    try {
      const metrics = parseMetricCsv(await file.text());
      await saveMetricSnapshots({ workspaceId: workspace.id, metrics });
      await onRefresh();
      setNotice({ type: "success", text: `${metrics.length} echte Messwerte aus der CSV importiert.` });
    } catch (error) {
      setNotice({ type: "error", text: error?.message || "CSV konnte nicht importiert werden." });
    } finally {
      event.target.value = "";
      setBusy("");
    }
  };
  const googleStatus = googleStatusCopy(data.googleIntegration);
  const sourceFreshness = data.sources.length ? Math.round(((data.sources.length - sourcesDue.length) / data.sources.length) * 100) : 0;
  const citationRate = data.snapshots.length ? Math.round((data.snapshots.filter(item => item.domain_cited).length / data.snapshots.length) * 100) : 0;

  return <section className="view-stack intelligence-view">
    <div className="intro-copy compact"><div className="gradient-pill">GEO INTELLIGENCE · NUR DAS WICHTIGSTE</div><h1>Was wirkt? Was fehlt? Was ist jetzt der beste nächste Schritt?</h1><p>Messwerte, Quellen und Prompt-Prüfungen liegen hier als ruhige Entscheidungsbasis zusammen. Keine Automatisierung veröffentlicht externe Inhalte.</p></div>

    <article className="focus-card intelligence-focus-card"><div className="focus-orb" /><div className="focus-content"><p className="eyebrow">DEIN INTELLIGENCE-FOKUS</p><h2>{focus.title}</h2><p className="focus-meta">{focus.text}</p><div className="focus-actions"><button className="primary-button" onClick={openFocus}>{focus.action}</button></div></div><p className="completion-note">Erst Daten und Nachweise. Dann entscheiden.</p></article>

    <section className="intelligence-score-grid"><article><p className="eyebrow">MESSBASIS</p><strong>{data.metrics.length}</strong><span>gespeicherte Werte</span></article><article><p className="eyebrow">EVIDENZ</p><strong>{sourceFreshness}%</strong><span>Quellen aktuell</span></article><article><p className="eyebrow">GEO-CITATION</p><strong>{data.snapshots.length ? `${citationRate}%` : "–"}</strong><span>in dokumentierten Stichproben</span></article></section>

    <div className="intelligence-tabs" role="tablist" aria-label="GEO Intelligence Bereiche">{[["focus", "Übersicht"], ["measurement", "Messbasis"], ["evidence", "Evidenz"], ["monitor", "GEO-Monitor"]].map(([id, label]) => <button key={id} role="tab" aria-selected={section === id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>{label}</button>)}</div>
    <FormNotice notice={notice} />

    {section === "focus" && <section className="intelligence-overview">
      <article className="intelligence-panel"><div className="panel-heading"><div><p className="eyebrow">PRIORITÄTSLÜCKEN</p><h2>Nicht mehr raten.</h2></div><span>{rankedQuestions.length}</span></div>{rankedQuestions.length ? <div className="intelligence-list">{rankedQuestions.slice(0, 3).map(question => <article key={question.id}><div><b>{question.question}</b><small>{topicsById.get(question.topic_id)?.name || "Ohne Themencluster"} · Score {question.priorityScore}</small></div><em>{question.status === "covered" ? "Abgedeckt" : "Offen"}</em></article>)}</div> : <p className="empty-copy">Lege zuerst eine Nutzerfrage an. Dann kann das System eine klare Priorität berechnen.</p>}</article>
      <article className="intelligence-panel"><div className="panel-heading"><div><p className="eyebrow">DATENFRISCHE</p><h2>Was braucht Aufmerksamkeit?</h2></div><span>{sourcesDue.length}</span></div>{sourcesDue.length ? <div className="intelligence-list">{sourcesDue.slice(0, 3).map(source => <article key={source.id}><div><b>{source.title}</b><small>Prüfdatum: {formatDate(source.review_due_at)}</small></div><em className="amber">Fällig</em></article>)}</div> : <p className="empty-copy">Noch keine fälligen Quellen. Prüftermine werden hier sichtbar, sobald Quellen angelegt sind.</p>}</article>
    </section>}

    {section === "measurement" && <section className="intelligence-section"><div className="section-copy"><p className="eyebrow">STUFE A · MESSFUNDAMENT</p><h2>Ein Ausgangswert. Dann wird Wirkung sichtbar.</h2><p>Starte mit echten Werten aus deinen bestehenden Tools oder einer CSV. Die Google-Anbindung folgt sicher und read-only, sobald du sie freigibst.</p></div><article className={`google-integration-card ${googleStatus.tone}`}><div><p className="eyebrow">SEARCH CONSOLE + GA4 · READ-ONLY</p><h3>{googleStatus.title}</h3><p>{googleStatus.text}</p>{data.googleImportRuns.length > 0 && <small>{data.googleImportRuns.filter(run => run.status === "succeeded").length} erfolgreiche Importläufe dokumentiert.</small>}</div>{canConfigure && !data.googleIntegration && <button className="quiet-button" disabled={busy === "google"} onClick={() => submit("google", () => prepareGoogleIntegration({ workspaceId: workspace.id }), "Google-Verbindung ist vorbereitet. Morgen fehlt nur die Konto-Zustimmung.")}>{busy === "google" ? "Wird vorbereitet …" : "Für morgen vorbereiten"}</button>}</article>{canConfigure ? <form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("profile", () => saveIntelligenceProfile({ workspaceId: workspace.id, ...profileForm }), "Messbasis gespeichert."); }}><div className="form-grid two"><label>Domain<input required placeholder="https://geo-tool.com" value={profileForm.domain} onChange={event => setProfileForm(current => ({ ...current, domain: event.target.value }))} /></label><label>Zielmarkt<input value={profileForm.targetMarket} onChange={event => setProfileForm(current => ({ ...current, targetMarket: event.target.value }))} /></label><label>Zielgruppe<input placeholder="z. B. Marketing-Teams" value={profileForm.targetAudience} onChange={event => setProfileForm(current => ({ ...current, targetAudience: event.target.value }))} /></label><label>Hauptziel<input value={profileForm.primaryGoal} onChange={event => setProfileForm(current => ({ ...current, primaryGoal: event.target.value }))} /></label><label>Wichtigste Conversion<input placeholder="Demo, Lead, Kauf …" value={profileForm.primaryConversion} onChange={event => setProfileForm(current => ({ ...current, primaryConversion: event.target.value }))} /></label><label>Notiz zur Baseline<input placeholder="Zeitraum oder Annahme" value={profileForm.baselineNotes} onChange={event => setProfileForm(current => ({ ...current, baselineNotes: event.target.value }))} /></label></div><button className="primary-button" disabled={busy === "profile"}>{busy === "profile" ? "Wird gespeichert …" : "Messbasis speichern"}</button></form> : <article className="intelligence-panel"><p className="empty-copy">Die Messbasis wird vom Admin gepflegt. Du kannst aber Messwerte, Quellen und Fragen als Teammitglied ergänzen.</p></article>}
      <form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("metric", () => saveMetricSnapshot({ workspaceId: workspace.id, metric: metricForm }), "Messwert zur Baseline ergänzt.", () => setMetricForm(emptyMetric)); }}><div className="form-heading"><div><p className="eyebrow">MANUELLER BASELINE-WERT</p><h3>Nur echte Daten eintragen.</h3></div><span>Read-only vorbereitet</span></div><div className="form-grid three"><label>Datum<input required type="date" value={metricForm.metricDate} onChange={event => setMetricForm(current => ({ ...current, metricDate: event.target.value }))} /></label><label>Kennzahl<select value={metricForm.metricType} onChange={event => setMetricForm(current => ({ ...current, metricType: event.target.value }))}><option value="impressions">Impressionen</option><option value="clicks">Klicks</option><option value="ctr">CTR</option><option value="position">Position</option><option value="sessions">Sitzungen</option><option value="referrals">Referral-Traffic</option><option value="conversions">Conversions</option></select></label><label>Wert<input required type="number" step="any" value={metricForm.metricValue} onChange={event => setMetricForm(current => ({ ...current, metricValue: event.target.value }))} /></label><label>Seite oder URL<input value={metricForm.pageUrl} onChange={event => setMetricForm(current => ({ ...current, pageUrl: event.target.value }))} /></label><label>Suchfrage, falls bekannt<input value={metricForm.queryText} onChange={event => setMetricForm(current => ({ ...current, queryText: event.target.value }))} /></label><label>Quelle<select value={metricForm.source} onChange={event => setMetricForm(current => ({ ...current, source: event.target.value }))}><option value="manual">Manuell geprüft</option><option value="csv">CSV-Import</option><option value="gsc">Search Console</option><option value="ga4">GA4</option></select></label></div><label>Kurze Einordnung<input value={metricForm.note} onChange={event => setMetricForm(current => ({ ...current, note: event.target.value }))} placeholder="Was bedeutet dieser Wert?" /></label><button className="primary-button" disabled={busy === "metric"}>{busy === "metric" ? "Wird gespeichert …" : "Echten Messwert speichern"}</button><div className="csv-import-box"><div><b>Oder mehrere echte Werte als CSV importieren</b><span>Pflichtspalten: <code>date, metric, value</code>. Optional: <code>page_url, query, country, device, note</code>.</span></div><label className="csv-upload-label">CSV auswählen<input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} disabled={busy === "csv"} /><small>{busy === "csv" ? "Import läuft …" : "Nur Daten importieren, die du selbst geprüft oder exportiert hast."}</small></label></div></form>
      <article className="intelligence-panel metric-history"><p className="eyebrow">LETZTE WERTE</p>{data.metrics.length ? <div className="intelligence-list">{data.metrics.slice(0, 5).map(metric => <article key={metric.id}><div><b>{metric.metric_type} · {metric.metric_value}</b><small>{formatDate(metric.metric_date)} · {metric.source}{metric.page_url ? ` · ${metric.page_url}` : ""}</small></div></article>)}</div> : <p className="empty-copy">Noch keine Werte. Ein einziger sauberer Ausgangswert reicht für den Start.</p>}</article>
    </section>}

    {section === "evidence" && <section className="intelligence-section"><div className="section-copy"><p className="eyebrow">STUFE B · EVIDENZGRAPH</p><h2>Eine Frage. Ein Claim. Ein belastbarer Nachweis.</h2><p>Die Verbindungen laufen im Hintergrund. Du siehst immer nur die nächste Wissenslücke, die geschlossen werden sollte.</p></div><div className="intelligence-two-column"><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("topic", () => saveTopicCluster({ workspaceId: workspace.id, topic: topicForm }), "Themencluster gespeichert.", () => setTopicForm(emptyTopic)); }}><div className="form-heading"><div><p className="eyebrow">1 · THEMA</p><h3>Worüber wollt ihr sichtbar sein?</h3></div></div><label>Name<input required value={topicForm.name} onChange={event => setTopicForm(current => ({ ...current, name: event.target.value }))} placeholder="GEO-Strategie" /></label><label>Kurze Abgrenzung<textarea rows="3" value={topicForm.description} onChange={event => setTopicForm(current => ({ ...current, description: event.target.value }))} placeholder="Was gehört zu diesem Thema?" /></label><label>Geschäftsrelevanz<select value={topicForm.businessWeight} onChange={event => setTopicForm(current => ({ ...current, businessWeight: event.target.value }))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} von 5</option>)}</select></label><button className="quiet-button" disabled={busy === "topic"}>{busy === "topic" ? "Speichern …" : "Thema anlegen"}</button></form><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("question", async () => { const saved = await saveResearchQuestion({ workspaceId: workspace.id, question: questionForm }); if (questionForm.targetUrl || questionForm.linkedTaskId) await linkQuestionContent({ questionId: saved.id, targetUrl: questionForm.targetUrl, taskId: questionForm.linkedTaskId, coverageStatus: questionForm.coverageStatus }); }, "Nutzerfrage gespeichert und priorisiert.", () => setQuestionForm(emptyQuestion)); }}><div className="form-heading"><div><p className="eyebrow">2 · NUTZERFRAGE</p><h3>Welche Frage soll beantwortet werden?</h3></div></div><label>Frage<input required value={questionForm.question} onChange={event => setQuestionForm(current => ({ ...current, question: event.target.value }))} placeholder="Wie wird man in KI-Antworten sichtbar?" /></label><div className="form-grid two"><label>Thema<select value={questionForm.topicId} onChange={event => setQuestionForm(current => ({ ...current, topicId: event.target.value }))}><option value="">Noch offen</option>{data.topics.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}</select></label><label>Intention<select value={questionForm.searchIntent} onChange={event => setQuestionForm(current => ({ ...current, searchIntent: event.target.value }))}><option value="informational">Informational</option><option value="commercial">Commercial</option><option value="transactional">Transactional</option><option value="navigational">Navigational</option></select></label><label>Sichtbarkeitslücke (0–100)<input type="number" min="0" max="100" value={questionForm.visibilityGap} onChange={event => setQuestionForm(current => ({ ...current, visibilityGap: event.target.value }))} /></label><label>Wirkungshinweis (0–100)<input type="number" min="0" max="100" value={questionForm.impactScore} onChange={event => setQuestionForm(current => ({ ...current, impactScore: event.target.value }))} /></label><label>Aufwand<select value={questionForm.effortScore} onChange={event => setQuestionForm(current => ({ ...current, effortScore: event.target.value }))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} von 5</option>)}</select></label><label>Risiko<select value={questionForm.riskLevel} onChange={event => setQuestionForm(current => ({ ...current, riskLevel: event.target.value }))}><option value="green">Grün · eigene Quelle</option><option value="amber">Gelb · zuerst prüfen</option></select></label></div><label>Zielseite, falls vorhanden<input value={questionForm.targetUrl} onChange={event => setQuestionForm(current => ({ ...current, targetUrl: event.target.value }))} placeholder="https://geo-tool.com/…" /></label><label>Abdeckung<select value={questionForm.coverageStatus} onChange={event => setQuestionForm(current => ({ ...current, coverageStatus: event.target.value }))}><option value="missing">Fehlt noch</option><option value="planned">Geplant</option><option value="covered">Abgedeckt</option><option value="refresh_needed">Aktualisieren</option></select></label><button className="quiet-button" disabled={busy === "question"}>{busy === "question" ? "Speichern …" : "Frage priorisieren"}</button></form></div>
      <div className="intelligence-two-column"><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("source", () => saveEvidenceSource({ workspaceId: workspace.id, source: sourceForm }), "Quelle als Nachweis gespeichert.", () => setSourceForm(emptySource)); }}><div className="form-heading"><div><p className="eyebrow">3 · QUELLE</p><h3>Was belegt die Aussage?</h3></div></div><label>Quelle / URL<input required type="url" value={sourceForm.sourceUrl} onChange={event => setSourceForm(current => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://…" /></label><label>Titel<input required value={sourceForm.title} onChange={event => setSourceForm(current => ({ ...current, title: event.target.value }))} /></label><div className="form-grid two"><label>Herausgeber<input value={sourceForm.publisher} onChange={event => setSourceForm(current => ({ ...current, publisher: event.target.value }))} /></label><label>Typ<select value={sourceForm.sourceType} onChange={event => setSourceForm(current => ({ ...current, sourceType: event.target.value }))}><option value="official">Offizielle Quelle</option><option value="primary">Primärquelle</option><option value="study">Studie</option><option value="industry">Branchenquelle</option><option value="first_party">Eigene Daten</option><option value="other">Andere</option></select></label><label>Geprüft am<input type="date" value={sourceForm.verifiedAt} onChange={event => setSourceForm(current => ({ ...current, verifiedAt: event.target.value }))} /></label><label>Nächster Check<input type="date" value={sourceForm.reviewDueAt} onChange={event => setSourceForm(current => ({ ...current, reviewDueAt: event.target.value }))} /></label></div><label>Einordnung<textarea rows="3" value={sourceForm.note} onChange={event => setSourceForm(current => ({ ...current, note: event.target.value }))} placeholder="Welchen Claim oder welche Frage stützt diese Quelle?" /></label><button className="quiet-button" disabled={busy === "source"}>{busy === "source" ? "Speichern …" : "Quelle sichern"}</button></form><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("claim", async () => { const saved = await saveEvidenceClaim({ workspaceId: workspace.id, claim: claimForm }); if (claimForm.sourceId) await linkClaimSource({ claimId: saved.id, sourceId: claimForm.sourceId }); }, "Claim gespeichert und mit Evidenz verknüpft.", () => setClaimForm(emptyClaim)); }}><div className="form-heading"><div><p className="eyebrow">4 · CLAIM</p><h3>Welche Aussage muss stimmen?</h3></div></div><label>Konkrete Aussage<textarea required rows="3" value={claimForm.claimText} onChange={event => setClaimForm(current => ({ ...current, claimText: event.target.value }))} placeholder="Zum Beispiel: …" /></label><div className="form-grid two"><label>Thema<select value={claimForm.topicId} onChange={event => setClaimForm(current => ({ ...current, topicId: event.target.value }))}><option value="">Noch offen</option>{data.topics.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}</select></label><label>Status<select value={claimForm.status} onChange={event => setClaimForm(current => ({ ...current, status: event.target.value }))}><option value="needs_evidence">Nachweis fehlt</option><option value="supported">Belegt</option><option value="needs_review">Neu prüfen</option><option value="retired">Nicht mehr verwenden</option></select></label><label>Wichtigkeit<select value={claimForm.importance} onChange={event => setClaimForm(current => ({ ...current, importance: event.target.value }))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} von 5</option>)}</select></label><label>Quelle verknüpfen<select value={claimForm.sourceId} onChange={event => setClaimForm(current => ({ ...current, sourceId: event.target.value }))}><option value="">Noch keine</option>{data.sources.map(source => <option value={source.id} key={source.id}>{source.title}</option>)}</select></label></div><button className="quiet-button" disabled={busy === "claim"}>{busy === "claim" ? "Speichern …" : "Claim speichern"}</button></form></div>
      <article className="intelligence-panel"><p className="eyebrow">WISSENSSTATUS</p><div className="evidence-status-grid"><div><b>{data.topics.length}</b><span>Themen</span></div><div><b>{data.questions.length}</b><span>Fragen</span></div><div><b>{data.sources.length}</b><span>Quellen</span></div><div><b>{data.claims.filter(claim => claim.status === "supported" && sourceCountByClaim.get(claim.id)).length} / {data.claims.length}</b><span>Claims belegt</span></div></div></article>
    </section>}

    {section === "monitor" && <section className="intelligence-section"><div className="section-copy"><p className="eyebrow">STUFE C · GEO-MONITORING</p><h2>Definierte Prompts statt zufälliger Beispiele.</h2><p>Dokumentiere nur Antworten, die du selbst geprüft hast. Das ist eine Stichprobe für Trends – keine Garantie für Rankings oder KI-Zitate.</p></div><div className="intelligence-two-column"><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("monitor", () => savePromptMonitor({ workspaceId: workspace.id, monitor: monitorForm }), "Prompt für die wiederkehrende Prüfung gespeichert.", () => setMonitorForm(emptyMonitor)); }}><div className="form-heading"><div><p className="eyebrow">PROMPT-BIBLIOTHEK</p><h3>Eine echte Zielgruppenfrage.</h3></div></div><label>Prompt<input required value={monitorForm.promptText} onChange={event => setMonitorForm(current => ({ ...current, promptText: event.target.value }))} placeholder="Welche Tools helfen bei GEO?" /></label><div className="form-grid two"><label>Zugehörige Nutzerfrage<select value={monitorForm.questionId} onChange={event => setMonitorForm(current => ({ ...current, questionId: event.target.value }))}><option value="">Optional</option>{data.questions.map(question => <option value={question.id} key={question.id}>{question.question}</option>)}</select></label><label>Prüfsystem<input value={monitorForm.systemName} onChange={event => setMonitorForm(current => ({ ...current, systemName: event.target.value }))} /></label><label>Sprache<input value={monitorForm.languageCode} onChange={event => setMonitorForm(current => ({ ...current, languageCode: event.target.value }))} /></label><label>Priorität<select value={monitorForm.priority} onChange={event => setMonitorForm(current => ({ ...current, priority: event.target.value }))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} von 5</option>)}</select></label></div><button className="quiet-button" disabled={busy === "monitor"}>{busy === "monitor" ? "Speichern …" : "Prompt anlegen"}</button></form><form className="intelligence-form" onSubmit={event => { event.preventDefault(); if (!selectedMonitor) return setNotice({ type: "error", text: "Lege zuerst einen Prompt an." }); submit("snapshot", () => savePromptSnapshot({ monitorId: selectedMonitor.id, snapshot: snapshotForm }), "Prüfergebnis dokumentiert.", () => setSnapshotForm(emptySnapshot)); }}><div className="form-heading"><div><p className="eyebrow">MANUELLE PRÜFUNG</p><h3>Was war tatsächlich sichtbar?</h3></div></div><label>Prompt<select value={selectedMonitor?.id || ""} onChange={event => setSelectedMonitorId(event.target.value)}><option value="">Prompt auswählen …</option>{activeMonitors.map(monitor => <option key={monitor.id} value={monitor.id}>{monitor.prompt_text}</option>)}</select></label><div className="form-grid two"><label>Prüfdatum<input type="date" value={snapshotForm.checkedAt} onChange={event => setSnapshotForm(current => ({ ...current, checkedAt: event.target.value }))} /></label><label>Wurde die Marke genannt?<select value={snapshotForm.brandMentioned ? "yes" : "no"} onChange={event => setSnapshotForm(current => ({ ...current, brandMentioned: event.target.value === "yes" }))}><option value="no">Nein</option><option value="yes">Ja</option></select></label><label>Wurde geo-tool.com zitiert?<select value={snapshotForm.domainCited ? "yes" : "no"} onChange={event => setSnapshotForm(current => ({ ...current, domainCited: event.target.value === "yes" }))}><option value="no">Nein</option><option value="yes">Ja</option></select></label></div><label>Antwort kurz zusammenfassen<textarea required rows="3" value={snapshotForm.answerSummary} onChange={event => setSnapshotForm(current => ({ ...current, answerSummary: event.target.value }))} placeholder="Was wurde in der Antwort gesagt?" /></label><label>Genannte Domains, durch Komma trennen<input value={snapshotForm.citedDomains} onChange={event => setSnapshotForm(current => ({ ...current, citedDomains: event.target.value }))} /></label><label>Öffentlicher Nachweis, falls vorhanden<input type="url" value={snapshotForm.evidenceUrl} onChange={event => setSnapshotForm(current => ({ ...current, evidenceUrl: event.target.value }))} placeholder="https://…" /></label><label>Notiz<textarea rows="2" value={snapshotForm.reviewerNote} onChange={event => setSnapshotForm(current => ({ ...current, reviewerNote: event.target.value }))} /></label><button className="primary-button" disabled={busy === "snapshot"}>{busy === "snapshot" ? "Wird gespeichert …" : "Prüfergebnis sichern"}</button></form></div>
      <article className="intelligence-panel"><p className="eyebrow">AKTIVE PROMPTS</p>{activeMonitors.length ? <div className="intelligence-list">{activeMonitors.map(monitor => { const latest = data.snapshots.find(snapshot => snapshot.monitor_id === monitor.id); return <article className={selectedMonitor?.id === monitor.id ? "selected" : ""} key={monitor.id}><button onClick={() => setSelectedMonitorId(monitor.id)}><b>{monitor.prompt_text}</b><small>{monitor.system_name} · {latest ? `letzte Prüfung: ${formatDate(latest.checked_at.slice(0, 10))}` : "noch nicht geprüft"}</small></button><em>{latest?.domain_cited ? "Zitiert" : latest ? "Geprüft" : "Offen"}</em></article>; })}</div> : <p className="empty-copy">Lege einen Prompt an. Er wird erst nach manueller Prüfung als Signal gezählt.</p>}</article>
      {selectedMonitor && selectedMonitorSnapshots.length > 0 && <article className="intelligence-panel"><p className="eyebrow">LETZTE PRÜFUNGEN</p><div className="intelligence-list">{selectedMonitorSnapshots.map(snapshot => <article key={snapshot.id}><div><b>{snapshot.domain_cited ? "geo-tool.com wurde zitiert" : "Keine Domain-Zitation dokumentiert"}</b><small>{formatDate(snapshot.checked_at.slice(0, 10))} · {snapshot.answer_summary}</small></div></article>)}</div></article>}
    </section>}
  </section>;
}

