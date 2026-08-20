begin;

-- Direkte Fortschrittsänderungen dürfen keine Teamzuweisungen überschreiben.
drop policy if exists "members can insert task progress" on public.task_progress;
create policy "members can insert permitted task progress"
on public.task_progress for insert
with check (
  public.workspace_member(organization_id)
  and (task_id like 'daily:%' or assigned_to is null or assigned_to = (select auth.uid()))
);

drop policy if exists "members can update task progress" on public.task_progress;
create policy "members can update permitted task progress"
on public.task_progress for update
using (
  public.workspace_member(organization_id)
  and (task_id like 'daily:%' or assigned_to is null or assigned_to = (select auth.uid()))
)
with check (
  public.workspace_member(organization_id)
  and (task_id like 'daily:%' or assigned_to is null or assigned_to = (select auth.uid()))
);

revoke insert, update on public.task_progress from authenticated;
grant insert (organization_id, task_id, is_done, completed_by, completed_at, note) on public.task_progress to authenticated;
grant update (is_done, completed_by, completed_at, note) on public.task_progress to authenticated;

-- Aktivitätsprotokoll: das automatische Anlegen eines Tagesplans ist kein Wiederöffnen.
create or replace function public.log_task_progress_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  activity_action text;
begin
  if tg_op = 'INSERT' then
    activity_action := case
      when new.task_id like 'daily:%' then 'daily_action_planned'
      when new.is_done then 'task_completed'
      else 'task_reopened'
    end;
  elsif old.is_done is distinct from new.is_done then
    activity_action := case when new.is_done then 'task_completed' else 'task_reopened' end;
  else
    return new;
  end if;

  insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
  values (
    new.organization_id,
    activity_action,
    new.task_id,
    auth.uid(),
    coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
  );
  return new;
end;
$$;

-- Trigger- und interne Hilfsfunktionen sind nicht als öffentliche RPCs gedacht.
revoke all on function public.handle_new_user() from authenticated;
revoke all on function public.log_task_progress_change() from authenticated;
revoke all on function public.log_content_change() from authenticated;
revoke all on function public.log_workspace_activity(uuid, text, text) from authenticated;
revoke all on function public.set_updated_at() from authenticated;
revoke all on function public.set_approval_updated_at() from authenticated;

-- RLS-Optimierung für die Profilabfrage.
drop policy if exists "profile is visible to its owner" on public.profiles;
create policy "profile is visible to its owner"
on public.profiles for select
using (id = (select auth.uid()));

-- Indizes für Team-, Freigabe- und Aktivitätsverläufe.
create index if not exists activity_log_organization_created_idx
  on public.activity_log (organization_id, created_at desc);
create index if not exists activity_log_actor_idx
  on public.activity_log (actor_id);
create index if not exists task_progress_assigned_to_idx
  on public.task_progress (assigned_to);
create index if not exists team_invitations_invited_by_idx
  on public.team_invitations (invited_by);
create index if not exists approval_requests_requested_by_idx
  on public.approval_requests (requested_by);
create index if not exists approval_requests_reviewer_id_idx
  on public.approval_requests (reviewer_id);
create index if not exists approval_requests_completed_by_idx
  on public.approval_requests (completed_by);

-- Abgelaufene Freigaben werden beim nächsten Einreichen automatisch bereinigt.
create or replace function public.submit_approval_request(
  target_organization_id uuid,
  target_task_id text,
  target_platform_name text,
  target_platform_url text,
  target_criteria jsonb,
  target_request_note text,
  target_content_snapshot text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  request_id uuid;
  assigned_user_id uuid;
begin
  if not public.workspace_member(target_organization_id) then
    raise exception 'Kein Zugriff auf diesen Arbeitsbereich';
  end if;

  select assigned_to into assigned_user_id
  from public.task_progress
  where organization_id = target_organization_id and task_id = target_task_id;

  if assigned_user_id is not null and assigned_user_id <> auth.uid() then
    raise exception 'Diese Aufgabe ist einer anderen Person zugewiesen';
  end if;

  update public.approval_requests
  set status = 'expired'
  where organization_id = target_organization_id
    and task_id = target_task_id
    and status = 'approved'
    and expires_at <= now();

  if exists (
    select 1
    from public.approval_requests
    where organization_id = target_organization_id
      and task_id = target_task_id
      and status in ('requested', 'approved')
  ) then
    raise exception 'Für diesen Entwurf läuft bereits eine aktive Freigabe';
  end if;

  if not (
    coalesce((target_criteria ->> 'allowed')::boolean, false)
    and coalesce((target_criteria ->> 'relevant')::boolean, false)
    and coalesce((target_criteria ->> 'transparent')::boolean, false)
    and coalesce((target_criteria ->> 'value')::boolean, false)
  ) then
    raise exception 'Alle vier Kriterien müssen mit Ja bestätigt sein';
  end if;

  insert into public.approval_requests (
    organization_id, task_id, requested_by, platform_name, platform_url,
    criteria, request_note, content_snapshot, status
  )
  values (
    target_organization_id, target_task_id, auth.uid(), trim(target_platform_name), trim(target_platform_url),
    target_criteria, trim(coalesce(target_request_note, '')), coalesce(target_content_snapshot, ''), 'requested'
  )
  returning id into request_id;

  insert into public.content_items (organization_id, task_id, status)
  values (target_organization_id, target_task_id, 'review')
  on conflict (organization_id, task_id) do update set status = 'review', updated_at = now();

  perform public.log_workspace_activity(target_organization_id, 'approval_requested', target_task_id);
  return request_id;
end;
$$;

commit;
