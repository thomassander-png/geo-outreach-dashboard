import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ReportRequest = {
  reportRunId?: string;
  organizationId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://geo-outreach-dashboard.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders,
});

const dateOnly = (value: string) => value.slice(0, 10);

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function aggregateMetrics(metrics: Array<Record<string, unknown>>) {
  const totals: Record<string, number> = {};
  metrics.forEach((metric) => {
    const type = String(metric.metric_type || "unknown");
    totals[type] = (totals[type] || 0) + toNumber(metric.metric_value);
  });
  return totals;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Nur POST ist erlaubt." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey || !authorization) return json({ error: "Serverkonfiguration oder Anmeldung fehlt." }, 401);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Ungültige Anmeldung." }, 401);

  let payload: ReportRequest = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Die Reportanfrage ist nicht gültig." }, 400);
  }

  if (!payload.reportRunId || !payload.organizationId) return json({ error: "Reportlauf und Arbeitsbereich sind erforderlich." }, 400);

  const { data: membership, error: membershipError } = await userClient
    .from("organization_members")
    .select("role")
    .eq("organization_id", payload.organizationId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membershipError || membership?.role !== "admin") return json({ error: "Nur Admins dürfen Reportläufe erzeugen." }, 403);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: report, error: reportError } = await admin
    .from("report_runs")
    .select("id, organization_id, report_type, period_start, period_end, status")
    .eq("id", payload.reportRunId)
    .eq("organization_id", payload.organizationId)
    .maybeSingle();
  if (reportError || !report) return json({ error: "Reportlauf wurde nicht gefunden." }, 404);
  if (["approved", "delivered", "superseded"].includes(report.status)) return json({ error: "Diese Reportfassung darf nicht überschrieben werden." }, 409);

  await admin.from("report_runs").update({ status: "generating" }).eq("id", report.id);

  const periodStart = dateOnly(report.period_start);
  const periodEnd = dateOnly(report.period_end);
  const [metricsResult, activityResult, questionResult, integrationResult] = await Promise.all([
    admin.from("metric_snapshots").select("metric_date, source, metric_type, metric_value, page_url, query_text, country, device").eq("organization_id", report.organization_id).gte("metric_date", periodStart).lte("metric_date", periodEnd).order("metric_date"),
    admin.from("activity_log").select("action, task_id, created_at").eq("organization_id", report.organization_id).gte("created_at", `${periodStart}T00:00:00.000Z`).lte("created_at", `${periodEnd}T23:59:59.999Z`),
    admin.from("research_questions").select("question, target_url, business_weight, visibility_gap, impact_score, effort_score, status").eq("organization_id", report.organization_id).in("status", ["backlog", "in_progress", "paused"]),
    admin.from("google_integrations").select("status, data_freshness, last_synced_at").eq("organization_id", report.organization_id).maybeSingle(),
  ]);

  if (metricsResult.error || activityResult.error || questionResult.error || integrationResult.error) {
    await admin.from("report_runs").update({ status: "failed", limitations_text: "Die Reportdaten konnten nicht vollständig geladen werden." }).eq("id", report.id);
    return json({ error: "Die Reportdaten konnten nicht geladen werden." }, 500);
  }

  const metrics = metricsResult.data || [];
  const activities = activityResult.data || [];
  const questions = questionResult.data || [];
  const metricTotals = aggregateMetrics(metrics);
  const actionsByType: Record<string, number> = {};
  activities.forEach((activity) => {
    const action = String(activity.action || "unknown");
    actionsByType[action] = (actionsByType[action] || 0) + 1;
  });
  const topQuestion = [...questions].sort((first, second) => {
    const firstScore = toNumber(first.business_weight) * 12 + toNumber(first.visibility_gap) * 0.34 + toNumber(first.impact_score) * 0.24 - toNumber(first.effort_score) * 5;
    const secondScore = toNumber(second.business_weight) * 12 + toNumber(second.visibility_gap) * 0.34 + toNumber(second.impact_score) * 0.24 - toNumber(second.effort_score) * 5;
    return secondScore - firstScore;
  })[0];

  const connected = integrationResult.data?.status === "connected";
  const dataFreshness = connected && integrationResult.data?.data_freshness === "fresh" ? "fresh" : metrics.length ? "incomplete" : "pending";
  const completed = (actionsByType.daily_action_done || 0) + (actionsByType.task_completed || 0) + (actionsByType.approval_completed || 0);
  const limitations = connected
    ? "Die Kennzahlen basieren auf dem gespeicherten Datenstand. Entwicklungen nach Maßnahmen sind Wirkungshinweise, keine isolierten Kausalitätsbeweise."
    : "Die Google-Verbindung ist noch nicht aktiv. Diese Fassung verwendet nur manuell geprüfte oder CSV-importierte Messwerte und darf nicht als vollständiger Performancebericht gelesen werden.";
  const summary = metrics.length
    ? `Im Zeitraum wurden ${metrics.length} gespeicherte Messwerte und ${completed} dokumentierte Arbeitsabschlüsse zusammengeführt. Der Report zeigt Entwicklungshinweise und die nächste priorisierte Lücke.`
    : `Für diesen Zeitraum liegen noch keine gespeicherten Messwerte vor. Der Report dokumentiert den Arbeitsstand, aber noch keine belastbare Wirkungsentwicklung.`;

  const metricsSnapshot = {
    generated_at: new Date().toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    metric_count: metrics.length,
    totals: metricTotals,
    source_status: integrationResult.data || null,
  };
  const actionSnapshot = {
    documented_actions: activities.length,
    completed_actions: completed,
    by_type: actionsByType,
    next_priority: topQuestion ? { question: topQuestion.question, target_url: topQuestion.target_url } : null,
  };

  const { error: updateError } = await admin.from("report_runs").update({
    status: "ready_for_review",
    data_freshness: dataFreshness,
    generated_at: new Date().toISOString(),
    summary_text: summary,
    limitations_text: limitations,
    metrics_snapshot: metricsSnapshot,
    action_snapshot: actionSnapshot,
  }).eq("id", report.id);
  if (updateError) return json({ error: "Der Report konnte nicht gespeichert werden." }, 500);

  await admin.from("report_insights").delete().eq("report_id", report.id);
  const insights = [
    {
      report_id: report.id,
      insight_type: "data_quality",
      priority: metrics.length ? 3 : 5,
      title: metrics.length ? "Datenbasis für den Report vorhanden" : "Messbasis im Reportzeitraum fehlt",
      body: metrics.length ? `${metrics.length} gespeicherte Messwerte wurden einbezogen. Datenfrische: ${dataFreshness}.` : "Lege oder importiere zuerst echte Messwerte, bevor Wirkungen bewertet werden.",
      confidence: metrics.length ? "observed" : "limited",
      evidence: { metric_count: metrics.length, data_freshness: dataFreshness },
    },
    {
      report_id: report.id,
      insight_type: "work_done",
      priority: 3,
      title: `${completed} Arbeitsabschlüsse dokumentiert`,
      body: `Im Zeitraum sind ${activities.length} relevante Arbeitsereignisse dokumentiert. Diese werden als Kontext gezeigt, nicht als automatischer Erfolgsbeweis.`,
      confidence: "observed",
      evidence: { completed_actions: completed, actions_by_type: actionsByType },
    },
  ];
  if (topQuestion) {
    insights.push({
      report_id: report.id,
      insight_type: "next_priority",
      priority: 5,
      title: "Nächste priorisierte Wissenslücke",
      body: `„${topQuestion.question}“ ist derzeit die stärkste offene Frage nach Geschäftswirkung, Sichtbarkeitslücke und Aufwand.`,
      confidence: "directional",
      evidence: { business_weight: topQuestion.business_weight, visibility_gap: topQuestion.visibility_gap, impact_score: topQuestion.impact_score, effort_score: topQuestion.effort_score },
      target_url: topQuestion.target_url || "",
    });
  }
  const { error: insightError } = await admin.from("report_insights").insert(insights);
  if (insightError) return json({ error: "Der Report wurde erstellt, aber Insights konnten nicht gespeichert werden." }, 500);

  return json({ report_run_id: report.id, status: "ready_for_review", metric_count: metrics.length, completed_actions: completed });
});
