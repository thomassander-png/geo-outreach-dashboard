begin;

-- Rollen für Profile und Organisationen erweitern, ohne bestehende Mitgliedschaften zu verändern.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'reviewer', 'member'));
alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check check (role in ('admin', 'reviewer', 'member'));

-- Ein zusätzlicher Status trennt Entwurf und ausstehende Prüfung.
alter table public.content_items drop constraint if exists content_items_status_check;
alter table public.content_items add constraint content_items_status_check check (status in ('idea', 'draft', 'review', 'approved', 'done'));

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'member' check (role in ('reviewer', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id text not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reviewer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'changes_requested', 'approved', 'declined', 'expired', 'completed')),
  platform_name text not null default '',
  platform_url text not null default '',
  criteria jsonb not null default '{"allowed": false, "relevant": false, "transparent": false, "value": false}'::jsonb,
  request_note text not null default '',
  content_snapshot text not null default '',
  decision_note text not null default '',
  approved_at timestamptz,
  expires_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  publication_url text not null default '',
  result_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_requests_workspace_status_idx
  on public.approval_requests (organization_id, status, created_at desc);
create index if not exists approval_requests_task_idx
  on public.approval_requests (organization_id, task_id, created_at desc);

create or replace function public.set_approval_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists approval_requests_updated_at on public.approval_requests;
create trigger approval_requests_updated_at
  before update on public.approval_requests
  for each row execute procedure public.set_approval_updated_at();

create or replace function public.workspace_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.workspace_reviewer(target_organization_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('admin', 'reviewer')
  );
$$;

create or replace function public.log_workspace_activity(target_organization_id uuid, target_action text, target_task_id text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
  values (
    target_organization_id,
    target_action,
    target_task_id,
    auth.uid(),
    coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
  );
end;
$$;

create or replace function public.list_workspace_members(target_organization_id uuid)
returns table (user_id uuid, display_name text, role text)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.workspace_member(target_organization_id) then
    raise exception 'Kein Zugriff auf diesen Arbeitsbereich';
  end if;

  return query
  select member.user_id, profile.display_name, member.role
  from public.organization_members member
  join public.profiles profile on profile.id = member.user_id
  where member.organization_id = target_organization_id
  order by case member.role when 'admin' then 1 when 'reviewer' then 2 else 3 end, profile.display_name;
end;
$$;

create or replace function public.create_team_invitation(
  target_organization_id uuid,
  invited_email text,
  invited_display_name text,
  invited_role text default 'member'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  invitation_id uuid;
begin
  if not public.workspace_admin(target_organization_id) then
    raise exception 'Nur Admins können Teammitglieder einladen';
  end if;

  if invited_role not in ('reviewer', 'member') then
    raise exception 'Ungültige Teamrolle';
  end if;

  insert into public.team_invitations (organization_id, email, display_name, role, invited_by, status, expires_at)
  values (
    target_organization_id,
    lower(trim(invited_email)),
    trim(coalesce(invited_display_name, '')),
    invited_role,
    auth.uid(),
    'pending',
    now() + interval '7 days'
  )
  on conflict (organization_id, email) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        invited_by = excluded.invited_by,
        status = 'pending',
        expires_at = now() + interval '7 days',
        accepted_at = null,
        created_at = now()
  returning id into invitation_id;

  perform public.log_workspace_activity(target_organization_id, 'member_invited', null);
  return invitation_id;
end;
$$;

create or replace function public.accept_my_team_invitation()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  current_email text;
  invitation public.team_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  select lower(email) into current_email from auth.users where id = auth.uid();

  update public.team_invitations
  set status = 'expired'
  where lower(email) = current_email
    and status = 'pending'
    and expires_at <= now();

  select * into invitation
  from public.team_invitations
  where lower(email) = current_email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invitation.id is null then
    return null;
  end if;

  update public.profiles
  set display_name = case when trim(invitation.display_name) <> '' then invitation.display_name else display_name end,
      role = invitation.role
  where id = auth.uid();

  insert into public.organization_members (organization_id, user_id, role)
  values (invitation.organization_id, auth.uid(), invitation.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  update public.team_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  perform public.log_workspace_activity(invitation.organization_id, 'member_joined', null);
  return invitation.organization_id;
end;
$$;

create or replace function public.assign_workspace_task(
  target_organization_id uuid,
  target_task_id text,
  target_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.workspace_admin(target_organization_id) then
    raise exception 'Nur Admins können Aufgaben zuweisen';
  end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and user_id = target_user_id
  ) then
    raise exception 'Die ausgewählte Person gehört nicht zu diesem Arbeitsbereich';
  end if;

  insert into public.task_progress (organization_id, task_id, assigned_to)
  values (target_organization_id, target_task_id, target_user_id)
  on conflict (organization_id, task_id) do update
    set assigned_to = excluded.assigned_to,
        updated_at = now();

  perform public.log_workspace_activity(target_organization_id, 'task_assigned', target_task_id);
end;
$$;

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
begin
  if not public.workspace_member(target_organization_id) then
    raise exception 'Kein Zugriff auf diesen Arbeitsbereich';
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

create or replace function public.decide_approval_request(
  target_request_id uuid,
  target_decision text,
  target_decision_note text default ''
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  request_row public.approval_requests%rowtype;
  next_content_status text;
begin
  select * into request_row from public.approval_requests where id = target_request_id for update;

  if request_row.id is null then
    raise exception 'Freigabeanfrage nicht gefunden';
  end if;

  if not public.workspace_reviewer(request_row.organization_id) then
    raise exception 'Nur Admins oder Reviewer können Freigaben entscheiden';
  end if;

  if request_row.requested_by = auth.uid() then
    raise exception 'Eigene externe Maßnahmen benötigen eine zweite prüfende Person';
  end if;

  if request_row.status not in ('requested', 'changes_requested') then
    raise exception 'Diese Freigabeanfrage kann nicht mehr entschieden werden';
  end if;

  if target_decision not in ('approved', 'changes_requested', 'declined') then
    raise exception 'Ungültige Freigabeentscheidung';
  end if;

  update public.approval_requests
  set status = target_decision,
      reviewer_id = auth.uid(),
      decision_note = trim(coalesce(target_decision_note, '')),
      approved_at = case when target_decision = 'approved' then now() else null end,
      expires_at = case when target_decision = 'approved' then now() + interval '14 days' else null end
  where id = target_request_id;

  next_content_status := case when target_decision = 'approved' then 'approved' else 'draft' end;
  update public.content_items
  set status = next_content_status,
      updated_at = now()
  where organization_id = request_row.organization_id and task_id = request_row.task_id;

  perform public.log_workspace_activity(request_row.organization_id, 'approval_' || target_decision, request_row.task_id);
end;
$$;

create or replace function public.complete_approved_action(
  target_request_id uuid,
  target_publication_url text default '',
  target_result_note text default ''
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  request_row public.approval_requests%rowtype;
begin
  select * into request_row from public.approval_requests where id = target_request_id for update;

  if request_row.id is null then
    raise exception 'Freigabeanfrage nicht gefunden';
  end if;

  if request_row.requested_by <> auth.uid() then
    raise exception 'Nur die zugewiesene Person kann die Ausführung dokumentieren';
  end if;

  if request_row.status <> 'approved' or request_row.expires_at is null or request_row.expires_at <= now() then
    if request_row.status = 'approved' then
      update public.approval_requests set status = 'expired' where id = target_request_id;
      perform public.log_workspace_activity(request_row.organization_id, 'approval_expired', request_row.task_id);
    end if;
    raise exception 'Die Freigabe ist nicht mehr gültig';
  end if;

  update public.approval_requests
  set status = 'completed',
      completed_by = auth.uid(),
      completed_at = now(),
      publication_url = trim(coalesce(target_publication_url, '')),
      result_note = trim(coalesce(target_result_note, ''))
  where id = target_request_id;

  update public.content_items
  set status = 'done',
      updated_at = now()
  where organization_id = request_row.organization_id and task_id = request_row.task_id;

  perform public.log_workspace_activity(request_row.organization_id, 'approval_completed', request_row.task_id);
end;
$$;

alter table public.team_invitations enable row level security;
alter table public.approval_requests enable row level security;

create policy "admins can read team invitations"
on public.team_invitations for select
using (public.workspace_admin(organization_id));

create policy "members can read approval requests"
on public.approval_requests for select
using (public.workspace_member(organization_id));

grant execute on function public.list_workspace_members(uuid) to authenticated;
grant execute on function public.create_team_invitation(uuid, text, text, text) to authenticated;
grant execute on function public.accept_my_team_invitation() to authenticated;
grant execute on function public.assign_workspace_task(uuid, text, uuid) to authenticated;
grant execute on function public.submit_approval_request(uuid, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.decide_approval_request(uuid, text, text) to authenticated;
grant execute on function public.complete_approved_action(uuid, text, text) to authenticated;

commit;
