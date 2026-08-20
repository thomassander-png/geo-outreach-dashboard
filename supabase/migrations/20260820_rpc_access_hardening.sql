begin;

-- SECURITY DEFINER-Funktionen dürfen nicht anonym aufgerufen werden.
revoke all on function public.accept_my_team_invitation() from public, anon;
revoke all on function public.assign_workspace_task(uuid, text, uuid) from public, anon;
revoke all on function public.bootstrap_workspace(text, text) from public, anon;
revoke all on function public.complete_approved_action(uuid, text, text) from public, anon;
revoke all on function public.create_team_invitation(uuid, text, text, text) from public, anon;
revoke all on function public.decide_approval_request(uuid, text, text) from public, anon;
revoke all on function public.list_workspace_members(uuid) from public, anon;
revoke all on function public.submit_approval_request(uuid, text, text, text, jsonb, text, text) from public, anon;
revoke all on function public.update_my_display_name(text) from public, anon;
revoke all on function public.workspace_admin(uuid) from public, anon;
revoke all on function public.workspace_member(uuid) from public, anon;
revoke all on function public.workspace_reviewer(uuid) from public, anon;
revoke all on function public.log_workspace_activity(uuid, text, text) from public, anon;
revoke all on function public.handle_new_user() from public, anon;
revoke all on function public.log_content_change() from public, anon;
revoke all on function public.log_task_progress_change() from public, anon;

-- Triggerfunktionen verwenden ebenfalls einen festen Suchpfad.
alter function public.set_updated_at() set search_path = public;
alter function public.set_approval_updated_at() set search_path = public;

commit;
