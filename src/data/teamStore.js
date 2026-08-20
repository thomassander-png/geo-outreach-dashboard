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
  const [profileResult, progressResult, contentResult, activityResult] = await Promise.all([
    client.from("profiles").select("id, display_name, role").eq("id", userId).single(),
    client.from("task_progress").select("task_id, is_done, assigned_to, completed_by, completed_at, note").eq("organization_id", workspaceId),
    client.from("content_items").select("task_id, briefing, draft, status, updated_at").eq("organization_id", workspaceId),
    client.from("activity_log").select("id, action, task_id, created_at, actor_name").eq("organization_id", workspaceId).order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = requireResult(profileResult);
  const progressRows = requireResult(progressResult);
  const contentRows = requireResult(contentResult);
  const activity = requireResult(activityResult);

  return {
    profile,
    done: Object.fromEntries(progressRows.filter(row => row.is_done).map(row => [row.task_id, true])),
    progress: Object.fromEntries(progressRows.map(row => [row.task_id, row])),
    content: Object.fromEntries(contentRows.map(row => [row.task_id, row])),
    activity,
  };
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
