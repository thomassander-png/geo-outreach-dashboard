import { supabase } from "../supabase";

function requireClient() {
  if (!supabase) throw new Error("Die zentrale Speicherung ist noch nicht konfiguriert.");
  return supabase;
}

function requireResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function loadAllRows(buildQuery) {
  const pageSize = 500;
  const rows = [];
  let from = 0;

  while (true) {
    const page = requireResult(await buildQuery().range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
    from += pageSize;
  }
}

function nullableNumber(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

export async function loadReportingData(workspaceId) {
  const client = requireClient();
  const [profileResult, kpis, reports, recipients] = await Promise.all([
    client.from("reporting_profiles").select("organization_id, client_display_name, report_title, report_language, timezone, weekly_review_weekday, monthly_report_day, internal_approval_required, automatic_delivery_enabled, reporting_status, updated_at").eq("organization_id", workspaceId).maybeSingle(),
    loadAllRows(() => client.from("reporting_kpis").select("id, key, label, metric_type, preferred_source, target_url, direction, target_value, position, active, updated_at, created_at").eq("organization_id", workspaceId).order("active", { ascending: false }).order("position").order("created_at")),
    loadAllRows(() => client.from("report_runs").select("id, report_type, period_start, period_end, version, status, data_freshness, generated_at, approved_at, delivered_at, delivery_note, summary_text, limitations_text, metrics_snapshot, action_snapshot, created_at, updated_at").eq("organization_id", workspaceId).order("period_end", { ascending: false }).order("version", { ascending: false })),
    loadAllRows(() => client.from("report_recipients").select("id, recipient_name, recipient_email, recipient_role, active, created_at").eq("organization_id", workspaceId).order("active", { ascending: false }).order("created_at")),
  ]);

  const reportIds = reports.map(report => report.id);
  const insights = reportIds.length
    ? await loadAllRows(() => client.from("report_insights").select("id, report_id, insight_type, priority, title, body, confidence, evidence, action_reference, target_url, created_at").in("report_id", reportIds).order("priority", { ascending: false }).order("created_at", { ascending: false }))
    : [];

  return {
    profile: requireResult(profileResult),
    kpis,
    reports,
    insights,
    recipients,
  };
}

export async function saveReportingProfile({ workspaceId, report }) {
  const client = requireClient();
  return requireResult(await client.from("reporting_profiles").upsert({
    organization_id: workspaceId,
    client_display_name: report.clientDisplayName.trim(),
    report_title: report.reportTitle.trim(),
    report_language: report.reportLanguage,
    timezone: report.timezone.trim() || "Europe/Berlin",
    weekly_review_weekday: Number(report.weeklyReviewWeekday),
    monthly_report_day: Number(report.monthlyReportDay),
    internal_approval_required: Boolean(report.internalApprovalRequired),
    automatic_delivery_enabled: Boolean(report.automaticDeliveryEnabled),
    reporting_status: report.reportingStatus,
  }, { onConflict: "organization_id" }).select().single());
}

export async function saveReportingKpi({ workspaceId, kpi }) {
  const client = requireClient();
  const payload = {
    ...(kpi.id ? { id: kpi.id } : {}),
    organization_id: workspaceId,
    key: kpi.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""),
    label: kpi.label.trim(),
    metric_type: kpi.metricType,
    preferred_source: kpi.preferredSource,
    target_url: kpi.targetUrl.trim(),
    direction: kpi.direction,
    target_value: nullableNumber(kpi.targetValue),
    position: Number(kpi.position),
    active: Boolean(kpi.active),
  };
  if (!payload.key || !payload.label) throw new Error("Kennzahl und interne Kennung sind erforderlich.");
  return requireResult(await client.from("reporting_kpis").upsert(payload).select().single());
}

export async function saveReportRecipient({ workspaceId, recipient }) {
  const client = requireClient();
  const email = recipient.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Bitte gib eine gültige Empfänger-E-Mail ein.");
  return requireResult(await client.from("report_recipients").upsert({
    organization_id: workspaceId,
    recipient_name: recipient.name.trim(),
    recipient_email: email,
    recipient_role: recipient.role,
    active: Boolean(recipient.active),
  }, { onConflict: "organization_id,recipient_email" }).select().single());
}

export async function prepareReportRun({ workspaceId, reportType, periodStart, periodEnd }) {
  const client = requireClient();
  return requireResult(await client.rpc("prepare_report_run", {
    target_organization_id: workspaceId,
    target_report_type: reportType,
    target_period_start: periodStart,
    target_period_end: periodEnd,
  }));
}


export async function runPremiumReport({ workspaceId, reportRunId }) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("run-premium-report", {
    body: { organizationId: workspaceId, reportRunId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
