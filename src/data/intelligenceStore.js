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

function nullable(value) {
  return value?.trim?.() ? value.trim() : null;
}

export async function loadIntelligenceData(workspaceId) {
  const client = requireClient();
  const [profileResult, topics, questions, sources, claims, claimLinks, questionLinks, metrics, monitors, snapshots] = await Promise.all([
    client.from("intelligence_profiles").select("organization_id, domain, target_market, target_audience, primary_goal, primary_conversion, measurement_status, baseline_notes, updated_at").eq("organization_id", workspaceId).maybeSingle(),
    loadAllRows(() => client.from("topic_clusters").select("id, name, description, business_weight, status, updated_at, created_at").eq("organization_id", workspaceId).order("business_weight", { ascending: false }).order("created_at")),
    loadAllRows(() => client.from("research_questions").select("id, topic_id, question, search_intent, business_weight, visibility_gap, impact_score, effort_score, risk_level, status, target_url, updated_at, created_at").eq("organization_id", workspaceId).order("created_at")),
    loadAllRows(() => client.from("evidence_sources").select("id, source_url, title, publisher, source_type, published_at, verified_at, review_due_at, evidence_strength, note, updated_at, created_at").eq("organization_id", workspaceId).order("review_due_at", { ascending: true, nullsFirst: false }).order("created_at")),
    loadAllRows(() => client.from("evidence_claims").select("id, topic_id, claim_text, importance, status, last_verified_at, review_due_at, updated_at, created_at").eq("organization_id", workspaceId).order("importance", { ascending: false }).order("created_at")),
    loadAllRows(() => client.from("claim_source_links").select("claim_id, source_id, relationship")),
    loadAllRows(() => client.from("question_content_links").select("question_id, task_id, target_url, coverage_status")),
    loadAllRows(() => client.from("metric_snapshots").select("id, metric_date, source, metric_type, metric_value, page_url, query_text, country, device, note, created_at").eq("organization_id", workspaceId).order("metric_date", { ascending: false }).order("created_at", { ascending: false })),
    loadAllRows(() => client.from("prompt_monitors").select("id, question_id, prompt_text, system_name, language_code, priority, status, updated_at, created_at").eq("organization_id", workspaceId).order("priority", { ascending: false }).order("created_at")),
    loadAllRows(() => client.from("prompt_snapshots").select("id, monitor_id, checked_at, answer_summary, brand_mentioned, domain_cited, cited_domains, evidence_url, reviewer_note, created_at").order("checked_at", { ascending: false })),
  ]);

  return {
    profile: requireResult(profileResult),
    topics,
    questions,
    sources,
    claims,
    claimLinks,
    questionLinks,
    metrics,
    monitors,
    snapshots,
  };
}

export async function saveIntelligenceProfile({ workspaceId, domain, targetMarket, targetAudience, primaryGoal, primaryConversion, baselineNotes }) {
  const client = requireClient();
  return requireResult(await client.from("intelligence_profiles").upsert({
    organization_id: workspaceId,
    domain: domain.trim(),
    target_market: targetMarket.trim(),
    target_audience: targetAudience.trim(),
    primary_goal: primaryGoal.trim(),
    primary_conversion: primaryConversion.trim(),
    baseline_notes: baselineNotes.trim(),
    measurement_status: domain.trim() ? "baseline" : "empty",
  }, { onConflict: "organization_id" }).select().single());
}

export async function saveTopicCluster({ workspaceId, topic }) {
  const client = requireClient();
  const payload = {
    ...(topic.id ? { id: topic.id } : {}),
    organization_id: workspaceId,
    name: topic.name.trim(),
    description: topic.description.trim(),
    business_weight: Number(topic.businessWeight),
    status: topic.status,
  };
  return requireResult(await client.from("topic_clusters").upsert(payload).select().single());
}

export async function saveResearchQuestion({ workspaceId, question }) {
  const client = requireClient();
  const payload = {
    ...(question.id ? { id: question.id } : {}),
    organization_id: workspaceId,
    topic_id: question.topicId || null,
    question: question.question.trim(),
    search_intent: question.searchIntent,
    business_weight: Number(question.businessWeight),
    visibility_gap: Number(question.visibilityGap),
    impact_score: Number(question.impactScore),
    effort_score: Number(question.effortScore),
    risk_level: question.riskLevel,
    status: question.status,
    target_url: question.targetUrl.trim(),
  };
  return requireResult(await client.from("research_questions").upsert(payload).select().single());
}

export async function saveEvidenceSource({ workspaceId, source }) {
  const client = requireClient();
  const payload = {
    ...(source.id ? { id: source.id } : {}),
    organization_id: workspaceId,
    source_url: source.sourceUrl.trim(),
    title: source.title.trim(),
    publisher: source.publisher.trim(),
    source_type: source.sourceType,
    published_at: nullable(source.publishedAt),
    verified_at: nullable(source.verifiedAt),
    review_due_at: nullable(source.reviewDueAt),
    evidence_strength: Number(source.evidenceStrength),
    note: source.note.trim(),
  };
  return requireResult(await client.from("evidence_sources").upsert(payload).select().single());
}

export async function saveEvidenceClaim({ workspaceId, claim }) {
  const client = requireClient();
  const payload = {
    ...(claim.id ? { id: claim.id } : {}),
    organization_id: workspaceId,
    topic_id: claim.topicId || null,
    claim_text: claim.claimText.trim(),
    importance: Number(claim.importance),
    status: claim.status,
    last_verified_at: nullable(claim.lastVerifiedAt),
    review_due_at: nullable(claim.reviewDueAt),
  };
  return requireResult(await client.from("evidence_claims").upsert(payload).select().single());
}

export async function linkClaimSource({ claimId, sourceId, relationship = "supports" }) {
  const client = requireClient();
  return requireResult(await client.from("claim_source_links").upsert({ claim_id: claimId, source_id: sourceId, relationship }, { onConflict: "claim_id,source_id" }).select().single());
}

export async function linkQuestionContent({ questionId, taskId = "", targetUrl = "", coverageStatus = "missing" }) {
  const client = requireClient();
  return requireResult(await client.from("question_content_links").upsert({ question_id: questionId, task_id: taskId.trim(), target_url: targetUrl.trim(), coverage_status: coverageStatus }, { onConflict: "question_id,task_id,target_url" }).select().single());
}

export async function saveMetricSnapshot({ workspaceId, metric }) {
  const client = requireClient();
  return requireResult(await client.from("metric_snapshots").insert({
    organization_id: workspaceId,
    metric_date: metric.metricDate,
    source: metric.source,
    metric_type: metric.metricType,
    metric_value: Number(metric.metricValue),
    page_url: metric.pageUrl.trim(),
    query_text: metric.queryText.trim(),
    country: metric.country.trim(),
    device: metric.device.trim(),
    note: metric.note.trim(),
  }).select().single());
}

export async function saveMetricSnapshots({ workspaceId, metrics }) {
  const client = requireClient();
  const rows = metrics.map(metric => ({
    organization_id: workspaceId,
    metric_date: metric.metricDate,
    source: metric.source || "csv",
    metric_type: metric.metricType,
    metric_value: Number(metric.metricValue),
    page_url: metric.pageUrl?.trim() || "",
    query_text: metric.queryText?.trim() || "",
    country: metric.country?.trim() || "",
    device: metric.device?.trim() || "",
    note: metric.note?.trim() || "",
  }));
  return requireResult(await client.from("metric_snapshots").insert(rows).select());
}

export async function savePromptMonitor({ workspaceId, monitor }) {
  const client = requireClient();
  const payload = {
    ...(monitor.id ? { id: monitor.id } : {}),
    organization_id: workspaceId,
    question_id: monitor.questionId || null,
    prompt_text: monitor.promptText.trim(),
    system_name: monitor.systemName.trim(),
    language_code: monitor.languageCode.trim() || "de",
    priority: Number(monitor.priority),
    status: monitor.status,
  };
  return requireResult(await client.from("prompt_monitors").upsert(payload).select().single());
}

export async function savePromptSnapshot({ monitorId, snapshot }) {
  const client = requireClient();
  const citedDomains = snapshot.citedDomains.split(/[,\n]/).map(value => value.trim()).filter(Boolean);
  return requireResult(await client.from("prompt_snapshots").insert({
    monitor_id: monitorId,
    checked_at: snapshot.checkedAt || new Date().toISOString(),
    answer_summary: snapshot.answerSummary.trim(),
    brand_mentioned: Boolean(snapshot.brandMentioned),
    domain_cited: Boolean(snapshot.domainCited),
    cited_domains: citedDomains,
    evidence_url: snapshot.evidenceUrl.trim(),
    reviewer_note: snapshot.reviewerNote.trim(),
  }).select().single());
}
