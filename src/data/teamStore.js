import { supabase } from "../supabase";

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
  const [profileResult, progressResult, contentResult, activityResult, dailyActionResult] = await Promise.all([
    client.from("profiles").select("id, display_name, role").eq("id", userId).single(),
    client.from("task_progress").select("task_id, is_done, assigned_to, completed_by, completed_at, note").eq("organization_id", workspaceId),
    client.from("content_items").select("task_id, briefing, draft, status, updated_at").eq("organization_id", workspaceId),
    client.from("activity_log").select("id, action, task_id, created_at, actor_name").eq("organization_id", workspaceId).order("created_at", { ascending: false }).limit(12),
    client.from("daily_action_instances").select("id, template_id, planned_for, status, completed_by, completed_at, note").eq("organization_id", workspaceId).order("planned_for", { ascending: false }),
  ]);

  const profile = requireResult(profileResult);
  const progressRows = requireResult(progressResult);
  const contentRows = requireResult(contentResult);
  const activity = requireResult(activityResult);
  const dailyActions = requireResult(dailyActionResult);

  return {
    profile,
    done: Object.fromEntries(progressRows.filter(row => row.is_done).map(row => [row.task_id, true])),
    progress: Object.fromEntries(progressRows.map(row => [row.task_id, row])),
    content: Object.fromEntries(contentRows.map(row => [row.task_id, row])),
    activity,
    dailyActions,
  };
}

export async function ensureDailyActions({ workspaceId, plannedFor, templateIds }) {
  const client = requireClient();
  const rows = templateIds.map(templateId => ({
    organization_id: workspaceId,
    template_id: templateId,
    planned_for: plannedFor,
  }));

  requireResult(await client
    .from("daily_action_instances")
    .upsert(rows, { onConflict: "organization_id,template_id,planned_for", ignoreDuplicates: true }));

  return requireResult(await client
    .from("daily_action_instances")
    .select("id, template_id, planned_for, status, completed_by, completed_at, note")
    .eq("organization_id", workspaceId)
    .eq("planned_for", plannedFor)
    .order("created_at", { ascending: true }));
}

export async function saveDailyActionStatus({ id, status, actorName }) {
  const client = requireClient();
  const completedAt = status === "done" ? new Date().toISOString() : null;

  return requireResult(await client
    .from("daily_action_instances")
    .update({
      status,
      completed_by: status === "done" ? actorName : null,
      completed_at: completedAt,
    })
    .eq("id", id)
    .select("id, template_id, planned_for, status, completed_by, completed_at, note")
    .single());
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

export async function updateProfileName(displayName) {
  const client = requireClient();
  return requireResult(await client.rpc("update_my_display_name", {
    new_display_name: displayName,
  }));
}
