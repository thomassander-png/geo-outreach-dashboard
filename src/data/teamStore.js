import { supabase } from "../supabase";

const DAILY_PREFIX = "daily:";

function requireClient() {
  if (!supabase) {
    throw new Error("Die zentrale Speicherung ist noch nicht konfiguriert.");
  }

  return supabase;
}

function requireResult(result) {
  if (result.error) {
    throw result.error;
  }

  return result.data;
}

function dailyTaskId(templateId, plannedFor) {
  return `${DAILY_PREFIX}${plannedFor}:${templateId}`;
}

function dailyActionFromProgress(row) {
  const [, plannedFor, templateId] = row.task_id.split(":");
  const status = row.is_done ? "done" : row.note === "daily:skipped" ? "skipped" : "planned";

  return {
    id: row.task_id,
    template_id: templateId,
    planned_for: plannedFor,
    status,
    completed_by: row.completed_by,
    completed_at: row.completed_at,
    note: row.note,
  };
}

export async function getSession() {
  const client = requireClient();
  return requireResult(await client.auth.getSession());
}

export async function requestMagicLink(email) {
  const client = requireClient();
  return requireResult(await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  }));
}

export async function signOut() {
  const client = requireClient();
  return requireResult(await client.auth.signOut());
}

export async function acceptTeamInvitation() {
  const client = requireClient();
  return requireResult(await client.rpc("accept_my_team_invitation"));
}

export async function getWorkspace(userId) {
  const client = requireClient();
  const membership = requireResult(await client
    .from("organization_members")
    .select("organization_id, role, organizations(id, name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle());

  if (!membership?.organizations) {
    throw new Error("Für dieses Konto wurde noch kein Playbook-Arbeitsbereich erstellt.");
  }

  return {
    id: membership.organization_id,
    name: membership.organizations.name,
    role: membership.role,
  };
}

export async function bootstrapWorkspace({ workspaceName, profileName }) {
  const client = requireClient();
  return requireResult(await client.rpc("bootstrap_workspace", {
    workspace_name: workspaceName,
    profile_name: profileName,
  }));
}

export async function loadWorkspaceData(workspaceId, userId) {
  const client = requireClient();
  const [profileResult, progressResult, contentResult, activityResult, membersResult, approvalsResult] = await Promise.all([
    client.from("profiles").select("id, display_name, role").eq("id", userId).single(),
    client.from("task_progress").select("task_id, is_done, assigned_to, completed_by, completed_at, note").eq("organization_id", workspaceId),
    client.from("content_items").select("task_id, briefing, draft, status, updated_at").eq("organization_id", workspaceId),
    client.from("activity_log").select("id, action, task_id, created_at, actor_name").eq("organization_id", workspaceId).order("created_at", { ascending: false }).limit(40),
    client.rpc("list_workspace_members", { target_organization_id: workspaceId }),
    client.from("approval_requests").select("id, task_id, requested_by, reviewer_id, status, platform_name, platform_url, criteria, request_note, content_snapshot, decision_note, approved_at, expires_at, completed_by, completed_at, publication_url, result_note, created_at").eq("organization_id", workspaceId).order("created_at", { ascending: false }),
  ]);

  const profile = requireResult(profileResult);
  const progressRows = requireResult(progressResult);
  const contentRows = requireResult(contentResult);
  const activityRows = requireResult(activityResult);
  const members = requireResult(membersResult);
  const approvals = requireResult(approvalsResult);
  const dailyRows = progressRows.filter(row => row.task_id.startsWith(DAILY_PREFIX));
  const activity = activityRows.filter(item => !(item.task_id?.startsWith(DAILY_PREFIX) && item.action === "task_reopened"));

  return {
    profile,
    members,
    approvals,
    done: Object.fromEntries(progressRows.filter(row => !row.task_id.startsWith(DAILY_PREFIX) && row.is_done).map(row => [row.task_id, true])),
    progress: Object.fromEntries(progressRows.filter(row => !row.task_id.startsWith(DAILY_PREFIX)).map(row => [row.task_id, row])),
    content: Object.fromEntries(contentRows.map(row => [row.task_id, row])),
    activity,
    dailyActions: dailyRows.map(dailyActionFromProgress),
  };
}

export async function ensureDailyActions({ workspaceId, plannedFor, templateIds }) {
  const client = requireClient();
  const rows = templateIds.map(templateId => ({
    organization_id: workspaceId,
    task_id: dailyTaskId(templateId, plannedFor),
    is_done: false,
    note: "daily:planned",
  }));

  requireResult(await client
    .from("task_progress")
    .upsert(rows, { onConflict: "organization_id,task_id", ignoreDuplicates: true }));

  const savedRows = requireResult(await client
    .from("task_progress")
    .select("task_id, is_done, completed_by, completed_at, note")
    .eq("organization_id", workspaceId)
    .like("task_id", `${DAILY_PREFIX}${plannedFor}:%`));

  return savedRows.map(dailyActionFromProgress);
}

export async function saveDailyActionStatus({ workspaceId, id, status, actorName }) {
  const client = requireClient();
  const completedAt = status === "done" ? new Date().toISOString() : null;

  const result = requireResult(await client
    .from("task_progress")
    .update({
      is_done: status === "done",
      note: `daily:${status}`,
      completed_by: status === "done" ? actorName : null,
      completed_at: completedAt,
    })
    .eq("organization_id", workspaceId)
    .eq("task_id", id)
    .select("task_id, is_done, completed_by, completed_at, note")
    .single());

  return dailyActionFromProgress(result);
}

export async function saveTaskProgress({ workspaceId, taskId, isDone, actorName }) {
  const client = requireClient();
  const completedAt = isDone ? new Date().toISOString() : null;

  return requireResult(await client
    .from("task_progress")
    .upsert({
      organization_id: workspaceId,
      task_id: taskId,
      is_done: isDone,
      completed_by: isDone ? actorName : null,
      completed_at: completedAt,
    }, { onConflict: "organization_id,task_id" }));
}

export async function assignWorkspaceTask({ workspaceId, taskId, userId }) {
  const client = requireClient();
  return requireResult(await client.rpc("assign_workspace_task", {
    target_organization_id: workspaceId,
    target_task_id: taskId,
    target_user_id: userId,
  }));
}

export async function saveContentItem({ workspaceId, taskId, briefing, draft, status }) {
  const client = requireClient();

  return requireResult(await client
    .from("content_items")
    .upsert({
      organization_id: workspaceId,
      task_id: taskId,
      briefing,
      draft,
      status,
    }, { onConflict: "organization_id,task_id" }));
}

export async function createTeamInvitation({ workspaceId, email, displayName, role }) {
  const client = requireClient();
  const invitationId = requireResult(await client.rpc("create_team_invitation", {
    target_organization_id: workspaceId,
    invited_email: email,
    invited_display_name: displayName,
    invited_role: role,
  }));

  await requestMagicLink(email);
  return invitationId;
}

export async function submitApprovalRequest({ workspaceId, taskId, platformName, platformUrl, criteria, requestNote, contentSnapshot }) {
  const client = requireClient();
  const serverCriteria = {
    allowed: Boolean(criteria.allowed),
    relevant: Boolean(criteria.relevant),
    transparent: Boolean(criteria.transparent),
    value: Boolean(criteria.helpful),
  };

  return requireResult(await client.rpc("submit_approval_request", {
    target_organization_id: workspaceId,
    target_task_id: taskId,
    target_platform_name: platformName,
    target_platform_url: platformUrl,
    target_criteria: serverCriteria,
    target_request_note: requestNote,
    target_content_snapshot: contentSnapshot,
  }));
}

export async function decideApprovalRequest({ requestId, decision, decisionNote }) {
  const client = requireClient();
  return requireResult(await client.rpc("decide_approval_request", {
    target_request_id: requestId,
    target_decision: decision,
    target_decision_note: decisionNote,
  }));
}

export async function completeApprovedAction({ requestId, publicationUrl, resultNote }) {
  const client = requireClient();
  return requireResult(await client.rpc("complete_approved_action", {
    target_request_id: requestId,
    target_publication_url: publicationUrl,
    target_result_note: resultNote,
  }));
}

export async function updateProfileName(displayName) {
  const client = requireClient();
  return requireResult(await client.rpc("update_my_display_name", {
    new_display_name: displayName,
  }));
}
