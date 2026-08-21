import { useEffect, useMemo, useState } from "react";
import {
  prepareReportRun,
  runPremiumReport,
  saveReportRecipient,
  saveReportingKpi,
  saveReportingProfile,
} from "./data/reportingStore";

const defaultReportProfile = {
  clientDisplayName: "",
  reportTitle: "GEO-Wirkungsreport",
  reportLanguage: "de",
  timezone: "Europe/Berlin",
  weeklyReviewWeekday: "1",
  monthlyReportDay: "3",
  internalApprovalRequired: true,
  automaticDeliveryEnabled: false,
  reportingStatus: "setup",
};

const defaultRecipient = { name: "", email: "", role: "client", active: true };

const defaultKpi = {
  key: "",
  label: "",
  metricType: "clicks",
  preferredSource: "gsc",
  targetUrl: "",
  direction: "up",
  targetValue: "",
  position: "1",
  active: true,
};

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysBefore(amount) {
  const date = new Date();
  date.setDate(date.getDate() - amount);
  return dateKey(date);
}

function formatDate(value) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function statusCopy(status) {
  const map = {
    draft: "Entwurf",
    generating: "Wird erstellt",
    ready_for_review: "Zur Prüfung",
    approved: "Freigegeben",
    delivered: "Zugestellt",
    failed: "Aufmerksamkeit nötig",
    superseded: "Ersetzt",
  };
  return map[status] || status;
}

function freshnessCopy(status) {
  const map = { pending: "Daten stehen noch aus", fresh: "Daten aktuell", delayed: "Daten verzögert", incomplete: "Daten unvollständig", error: "Datenfehler" };
  return map[status] || "Datenstatus offen";
}

function FormNotice({ notice }) {
  return notice ? <p className={`intelligence-notice ${notice.type}`}>{notice.text}</p> : null;
}

export default function PremiumReportView({ workspace, intelligence, reportData, onRefresh, onOpenIntelligence }) {
  const [section, setSection] = useState("overview");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [profileForm, setProfileForm] = useState(defaultReportProfile);
  const [kpiForm, setKpiForm] = useState(defaultKpi);
  const [recipientForm, setRecipientForm] = useState(defaultRecipient);
  const [reportWindow, setReportWindow] = useState({ reportType: "monthly", periodStart: daysBefore(28), periodEnd: daysBefore(1) });
  const canConfigure = workspace.role === "admin";

  useEffect(() => {
    if (!reportData.profile) {
      setProfileForm(defaultReportProfile);
      return;
    }
    setProfileForm({
      clientDisplayName: reportData.profile.client_display_name || "",
      reportTitle: reportData.profile.report_title || "GEO-Wirkungsreport",
      reportLanguage: reportData.profile.report_language || "de",
      timezone: reportData.profile.timezone || "Europe/Berlin",
      weeklyReviewWeekday: String(reportData.profile.weekly_review_weekday ?? 1),
      monthlyReportDay: String(reportData.profile.monthly_report_day ?? 3),
      internalApprovalRequired: reportData.profile.internal_approval_required !== false,
      automaticDeliveryEnabled: Boolean(reportData.profile.automatic_delivery_enabled),
      reportingStatus: reportData.profile.reporting_status || "setup",
    });
  }, [reportData.profile]);

  const latestMetricByType = useMemo(() => {
    const map = new Map();
    intelligence.metrics.forEach(metric => {
      if (!map.has(metric.metric_type)) map.set(metric.metric_type, metric);
    });
    return map;
  }, [intelligence.metrics]);

  const activeKpis = reportData.kpis.filter(kpi => kpi.active).slice(0, 5);
  const latestReport = reportData.reports[0] || null;
  const latestReportInsights = latestReport ? reportData.insights.filter(insight => insight.report_id === latestReport.id) : [];
  const dataIsConnected = intelligence.googleIntegration?.status === "connected";

  const focus = useMemo(() => {
    if (!reportData.profile) return { title: "Premiumreport kurz einrichten", text: "Lege Kundenname, Berichtstitel und Freigaberegel fest. Danach ist die Reportingbasis klar.", action: "Reporting einrichten", target: "setup" };
    if (!intelligence.metrics.length) return { title: "Echte Baseline für den Report hinterlegen", text: "Einige echte Messwerte reichen, damit der erste Report später einen Vergleich hat.", action: "Messbasis öffnen", target: "intelligence" };
    if (!activeKpis.length) return { title: "Drei Kernkennzahlen festlegen", text: "Der Kunde soll nicht zwanzig Zahlen sehen. Lege die wichtigsten Erfolgskennzahlen fest.", action: "KPI-Glossar öffnen", target: "setup" };
    if (!latestReport) return { title: "Ersten Reportentwurf vorbereiten", text: "Der Entwurf legt Zeitraum und Version fest. Automatisierte Daten und Freigabe folgen kontrolliert.", action: "Report vorbereiten", target: "archive" };
    if (latestReport.status === "ready_for_review") return { title: "Report prüfen und freigeben", text: "Die Datenfassung wartet auf die interne Managementprüfung.", action: "Reportarchiv öffnen", target: "archive" };
    return { title: "Reportingbasis ist bereit", text: "Prüfe Datenfrische und die nächste priorisierte GEO-Maßnahme. Der Monatsreport wird daraus nachvollziehbar aufgebaut.", action: "Übersicht ansehen", target: "overview" };
  }, [activeKpis.length, intelligence.metrics.length, latestReport, reportData.profile]);

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

  const openFocus = () => {
    if (focus.target === "intelligence") onOpenIntelligence();
    else setSection(focus.target);
  };

  const runReport = report => submit(
    `run-report-${report.id}`,
    () => runPremiumReport({ workspaceId: workspace.id, reportRunId: report.id }),
    "Reportentwurf wurde mit den aktuell gespeicherten Daten ausgewertet.",
  );

  return <section className="view-stack premium-report-view">
    <div className="intro-copy compact"><div className="gradient-pill">GEO PREMIUM REPORT · KUNDENFÄHIG</div><h1>Was wurde getan? Was hat sich entwickelt? Was ist jetzt wichtig?</h1><p>Ein klarer Report verbindet eure GEO-Arbeit mit echten Messdaten – ohne Datenwand und ohne falsche Kausalitätsversprechen.</p></div>

    <article className="focus-card report-focus-card"><div className="focus-orb" /><div className="focus-content"><p className="eyebrow">DEIN REPORTING-FOKUS</p><h2>{focus.title}</h2><p className="focus-meta">{focus.text}</p><div className="focus-actions"><button className="primary-button" onClick={openFocus}>{focus.action}</button></div></div><p className="completion-note">Erst Datenqualität. Dann Kundenreport.</p></article>

    <section className="report-score-grid"><article><p className="eyebrow">DATENSTATUS</p><strong>{dataIsConnected ? "Live" : intelligence.metrics.length ? "Basis" : "Offen"}</strong><span>{dataIsConnected ? "Google-Import verbunden" : intelligence.metrics.length ? `${intelligence.metrics.length} echte Werte gespeichert` : "Erste Messwerte fehlen"}</span></article><article><p className="eyebrow">KERN-KPIs</p><strong>{activeKpis.length}</strong><span>klar definierte Erfolgskennzahlen</span></article><article><p className="eyebrow">LETZTER REPORT</p><strong>{latestReport ? statusCopy(latestReport.status) : "–"}</strong><span>{latestReport ? `${formatDate(latestReport.period_start)} – ${formatDate(latestReport.period_end)}` : "Noch kein Reportentwurf"}</span></article></section>

    <div className="intelligence-tabs" role="tablist" aria-label="Premiumreport Bereiche">{[["overview", "Übersicht"], ["setup", "Reportingbasis"], ["archive", "Reportarchiv"]].map(([id, label]) => <button key={id} role="tab" aria-selected={section === id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>{label}</button>)}</div>
    <FormNotice notice={notice} />

    {section === "overview" && <section className="report-overview">
      <article className="intelligence-panel"><div className="panel-heading"><div><p className="eyebrow">KERNZAHLEN</p><h2>Wenige Zahlen. Klare Bedeutung.</h2></div><span>{activeKpis.length}</span></div>{activeKpis.length ? <div className="report-kpi-list">{activeKpis.map(kpi => { const value = latestMetricByType.get(kpi.metric_type); return <article key={kpi.id}><div><b>{kpi.label}</b><small>{kpi.preferred_source.toUpperCase()} · {kpi.target_url || "Gesamtdomain"}</small></div><strong>{value ? value.metric_value : "–"}</strong><em>{value ? `${formatDate(value.metric_date)}` : "Wert fehlt"}</em></article>; })}</div> : <p className="empty-copy">Lege später drei bis fünf Kern-KPIs fest. So bleibt der Kundenreport entscheidungsfähig statt überladen.</p>}</article>
      <article className="intelligence-panel"><div className="panel-heading"><div><p className="eyebrow">DATENFRISCHE</p><h2>Was darf der Report sicher sagen?</h2></div><span>{intelligence.googleIntegration?.data_freshness === "fresh" ? "Aktuell" : "Prüfen"}</span></div><p className="report-data-copy">{intelligence.googleIntegration?.status === "connected" ? `Google-Verbindung aktiv. ${intelligence.googleIntegration.last_synced_at ? `Letzter Import: ${formatDate(intelligence.googleIntegration.last_synced_at.slice(0, 10))}.` : "Erster Import steht noch aus."}` : "Die Google-Verbindung ist noch nicht aktiviert. Bis dahin verwendet der Report nur manuell geprüfte oder per CSV importierte Daten."}</p><button className="quiet-button" onClick={onOpenIntelligence}>Messbasis öffnen</button></article>
      <article className="intelligence-panel report-next-priorities"><p className="eyebrow">NÄCHSTE REPORTING-PRIORITÄTEN</p><div className="report-priority-list"><div><b>1 · Echte Messwerte sichern</b><span>Baseline und Datenfrische sichtbar halten.</span></div><div><b>2 · Wirkung dokumentieren</b><span>Maßnahmen mit Zielseite und Zeitraum verknüpfen.</span></div><div><b>3 · Managementstory freigeben</b><span>Nur geprüfte Aussagen und klare nächste Schritte berichten.</span></div></div></article>
    </section>}

    {section === "setup" && <section className="intelligence-section"><div className="section-copy"><p className="eyebrow">REPORTINGBASIS</p><h2>Einheitliche Ziele. Wenige relevante Kennzahlen.</h2><p>Diese Angaben steuern später die Kundenansicht und den Report. Sie verändern keine Google-Daten und keine Inhalte.</p></div>{canConfigure ? <><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("report-profile", () => saveReportingProfile({ workspaceId: workspace.id, report: profileForm }), "Reportingprofil gespeichert."); }}><div className="form-heading"><div><p className="eyebrow">REPORTPROFIL</p><h3>So erscheint der Premiumreport beim Kunden.</h3></div><span>Nur Admin</span></div><div className="form-grid two"><label>Kunden-/Markenname<input value={profileForm.clientDisplayName} onChange={event => setProfileForm(current => ({ ...current, clientDisplayName: event.target.value }))} placeholder="geo-tool.com" /></label><label>Reporttitel<input value={profileForm.reportTitle} onChange={event => setProfileForm(current => ({ ...current, reportTitle: event.target.value }))} /></label><label>Zeitzone<input value={profileForm.timezone} onChange={event => setProfileForm(current => ({ ...current, timezone: event.target.value }))} /></label><label>Monatsreport ab Tag<select value={profileForm.monthlyReportDay} onChange={event => setProfileForm(current => ({ ...current, monthlyReportDay: event.target.value }))}>{[1,2,3,4,5,6,7].map(value => <option value={value} key={value}>{value}. des Monats</option>)}</select></label><label>Interne Freigabe<select value={profileForm.internalApprovalRequired ? "yes" : "no"} onChange={event => setProfileForm(current => ({ ...current, internalApprovalRequired: event.target.value === "yes" }))}><option value="yes">Immer zuerst intern prüfen</option><option value="no">Später nach Regel automatisieren</option></select></label><label>Versandstatus<select value={profileForm.automaticDeliveryEnabled ? "yes" : "no"} onChange={event => setProfileForm(current => ({ ...current, automaticDeliveryEnabled: event.target.value === "yes" }))}><option value="no">Noch kein automatischer Versand</option><option value="yes">Versand später aktivieren</option></select></label></div><button className="primary-button" disabled={busy === "report-profile"}>{busy === "report-profile" ? "Wird gespeichert …" : "Reportingprofil speichern"}</button></form><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("recipient", () => saveReportRecipient({ workspaceId: workspace.id, recipient: recipientForm }), "Reportempfänger gespeichert. Der automatische Versand bleibt bis zur expliziten Aktivierung aus.", () => setRecipientForm(defaultRecipient)); }}><div className="form-heading"><div><p className="eyebrow">REPORTEMPÄNGER</p><h3>Wer darf später eine freigegebene Fassung erhalten?</h3></div><span>Versand noch aus</span></div><div className="form-grid two"><label>Name<input value={recipientForm.name} onChange={event => setRecipientForm(current => ({ ...current, name: event.target.value }))} placeholder="Ansprechperson" /></label><label>E-Mail-Adresse<input required type="email" value={recipientForm.email} onChange={event => setRecipientForm(current => ({ ...current, email: event.target.value }))} placeholder="kontakt@kunde.de" /></label><label>Rolle<select value={recipientForm.role} onChange={event => setRecipientForm(current => ({ ...current, role: event.target.value }))}><option value="client">Kunde</option><option value="executive">Management</option><option value="internal">Intern</option></select></label></div><button className="quiet-button" disabled={busy === "recipient"}>{busy === "recipient" ? "Wird gespeichert …" : "Empfänger hinzufügen"}</button>{reportData.recipients.length > 0 && <div className="report-recipient-list">{reportData.recipients.map(recipient => <p key={recipient.id}><b>{recipient.recipient_name || "Ohne Namen"}</b><span>{recipient.recipient_role} · {recipient.active ? "bereit" : "pausiert"}</span></p>)}</div>}</form><form className="intelligence-form" onSubmit={event => { event.preventDefault(); submit("kpi", () => saveReportingKpi({ workspaceId: workspace.id, kpi: kpiForm }), "Kern-KPI gespeichert.", () => setKpiForm(defaultKpi)); }}><div className="form-heading"><div><p className="eyebrow">KPI-GLOSSAR</p><h3>Eine Kennzahl. Eine eindeutige Bedeutung.</h3></div><span>Maximal fünf starten</span></div><div className="form-grid two"><label>Interne Kennung<input required value={kpiForm.key} onChange={event => setKpiForm(current => ({ ...current, key: event.target.value }))} placeholder="qualifizierte_sitzungen" /></label><label>Kundenbezeichnung<input required value={kpiForm.label} onChange={event => setKpiForm(current => ({ ...current, label: event.target.value }))} placeholder="Qualifizierte Sitzungen" /></label><label>Kennzahl<select value={kpiForm.metricType} onChange={event => setKpiForm(current => ({ ...current, metricType: event.target.value }))}><option value="clicks">Klicks</option><option value="impressions">Impressionen</option><option value="ctr">CTR</option><option value="position">Position</option><option value="sessions">Sitzungen</option><option value="referrals">Referral-Traffic</option><option value="conversions">Conversions</option><option value="mentions">Markennennungen</option><option value="citations">Domain-Zitationen</option></select></label><label>Bevorzugte Quelle<select value={kpiForm.preferredSource} onChange={event => setKpiForm(current => ({ ...current, preferredSource: event.target.value }))}><option value="gsc">Search Console</option><option value="ga4">GA4</option><option value="csv">CSV</option><option value="manual">Manuelle Prüfung</option></select></label><label>Zielseite, optional<input value={kpiForm.targetUrl} onChange={event => setKpiForm(current => ({ ...current, targetUrl: event.target.value }))} placeholder="https://geo-tool.com/..." /></label><label>Erfolgsrichtung<select value={kpiForm.direction} onChange={event => setKpiForm(current => ({ ...current, direction: event.target.value }))}><option value="up">Mehr ist besser</option><option value="down">Weniger ist besser</option><option value="neutral">Einordnung ohne Zielrichtung</option></select></label></div><button className="quiet-button" disabled={busy === "kpi"}>{busy === "kpi" ? "Wird gespeichert …" : "Kern-KPI hinzufügen"}</button></form></> : <article className="intelligence-panel"><p className="empty-copy">Das Reportingprofil wird vom Admin eingerichtet. Als Teammitglied kannst du die Reportübersicht und freigegebenen Fassungen einsehen.</p></article>}</section>}

    {section === "archive" && <section className="intelligence-section"><div className="section-copy"><p className="eyebrow">VERSIONIERTES REPORTARCHIV</p><h2>Jede Fassung bleibt nachvollziehbar.</h2><p>Automatisierte Daten werden später zuerst als Entwurf angelegt. Erst nach der internen Prüfung wird eine Kundenfassung bereitgestellt.</p></div>{canConfigure && <form className="intelligence-form report-run-form" onSubmit={event => { event.preventDefault(); submit("report-run", () => prepareReportRun({ workspaceId: workspace.id, ...reportWindow }), "Reportentwurf vorbereitet. Datenimport und Narrative werden kontrolliert ergänzt."); }}><div className="form-heading"><div><p className="eyebrow">NEUE REPORTFASSUNG</p><h3>Zeitraum und Version kontrolliert anlegen.</h3></div><span>Keine Daten werden dabei erfunden</span></div><div className="form-grid three"><label>Reporttyp<select value={reportWindow.reportType} onChange={event => setReportWindow(current => ({ ...current, reportType: event.target.value }))}><option value="weekly">Wochenreview</option><option value="monthly">Monatsreport</option></select></label><label>Beginn<input required type="date" value={reportWindow.periodStart} onChange={event => setReportWindow(current => ({ ...current, periodStart: event.target.value }))} /></label><label>Ende<input required type="date" value={reportWindow.periodEnd} onChange={event => setReportWindow(current => ({ ...current, periodEnd: event.target.value }))} /></label></div><button className="primary-button" disabled={busy === "report-run"}>{busy === "report-run" ? "Wird vorbereitet …" : "Reportentwurf anlegen"}</button></form>}
      <article className="intelligence-panel"><div className="panel-heading"><div><p className="eyebrow">BISHERIGE FASSUNGEN</p><h2>Reportarchiv</h2></div><span>{reportData.reports.length}</span></div>{reportData.reports.length ? <div className="report-archive-list">{reportData.reports.slice(0, 8).map(report => <article key={report.id}><div><b>{report.report_type === "monthly" ? "Monatsreport" : report.report_type === "weekly" ? "Wochenreview" : "Tagesansicht"} · Version {report.version}</b><small>{formatDate(report.period_start)} – {formatDate(report.period_end)} · {freshnessCopy(report.data_freshness)}</small></div><div className="report-archive-actions"><em className={`report-status ${report.status}`}>{statusCopy(report.status)}</em>{canConfigure && ["draft", "failed"].includes(report.status) && <button className="quiet-button" disabled={busy === `run-report-${report.id}`} onClick={() => runReport(report)}>{busy === `run-report-${report.id}` ? "Wird ausgewertet …" : "Daten auswerten"}</button>}</div></article>)}</div> : <p className="empty-copy">Noch kein Reportentwurf. Lege erst eine Reportingbasis und mindestens einen echten Messwert an.</p>}</article>
      {latestReport && <article className="intelligence-panel"><p className="eyebrow">LETZTE REPORTFASSUNG</p><h3>{latestReport.summary_text || "Die Reportfassung wartet auf echte Daten und geprüfte Zusammenfassung."}</h3><p className="report-data-copy">{latestReport.limitations_text || "Solange Google noch nicht verbunden ist, bleibt die Interpretation auf gespeicherte Baseline-Werte begrenzt."}</p>{latestReportInsights.length > 0 && <div className="report-insight-list">{latestReportInsights.slice(0, 3).map(insight => <article key={insight.id}><b>{insight.title}</b><span>{insight.body}</span></article>)}</div>}</article>}</section>}
  </section>;
}
