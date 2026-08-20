create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Teammitglied',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.task_progress (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id text not null,
  is_done boolean not null default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  completed_by text,
  completed_at timestamptz,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (organization_id, task_id)
);

create table if not exists public.content_items (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id text not null,
  briefing text not null default '',
  draft text not null default '',
  status text not null default 'idea' check (status in ('idea', 'draft', 'approved', 'done')),
  updated_at timestamptz not null default now(),
  primary key (organization_id, task_id)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action text not null,
  task_id text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Teammitglied',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_progress_updated_at on public.task_progress;
create trigger task_progress_updated_at
  before update on public.task_progress
  for each row execute procedure public.set_updated_at();

drop trigger if exists content_items_updated_at on public.content_items;
create trigger content_items_updated_at
  before update on public.content_items
  for each row execute procedure public.set_updated_at();

create or replace function public.workspace_member(target_organization_id uuid)
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
  );
$$;

create or replace function public.bootstrap_workspace(workspace_name text, profile_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'Für dieses Konto existiert bereits ein Arbeitsbereich';
  end if;

  insert into public.organizations (name)
  values (trim(workspace_name))
  returning id into new_organization_id;

  update public.profiles
  set display_name = trim(profile_name), role = 'admin'
  where id = auth.uid();

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'admin');

  insert into public.activity_log (organization_id, action, actor_id, actor_name)
  values (new_organization_id, 'workspace_created', auth.uid(), trim(profile_name));

  return new_organization_id;
end;
$$;

create or replace function public.log_task_progress_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.is_done is distinct from new.is_done then
    insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
    values (
      new.organization_id,
      case when new.is_done then 'task_completed' else 'task_reopened' end,
      new.task_id,
      auth.uid(),
      coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
    );
  end if;
  return new;
end;
$$;

create or replace function public.log_content_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
  values (
    new.organization_id,
    'content_updated',
    new.task_id,
    auth.uid(),
    coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
  );
  return new;
end;
$$;

drop trigger if exists task_progress_activity on public.task_progress;
create trigger task_progress_activity
  after insert or update on public.task_progress
  for each row execute procedure public.log_task_progress_change();

drop trigger if exists content_items_activity on public.content_items;
create trigger content_items_activity
  after insert or update on public.content_items
  for each row execute procedure public.log_content_change();

create or replace function public.update_my_display_name(new_display_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  update public.profiles
  set display_name = trim(new_display_name)
  where id = auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.task_progress enable row level security;
alter table public.content_items enable row level security;
alter table public.activity_log enable row level security;

create policy "profile is visible to its owner"
on public.profiles for select
using (id = auth.uid());

create policy "members can read their organization"
on public.organizations for select
using (public.workspace_member(id));

create policy "members can read organization memberships"
on public.organization_members for select
using (public.workspace_member(organization_id));

create policy "members can read task progress"
on public.task_progress for select
using (public.workspace_member(organization_id));

create policy "members can insert task progress"
on public.task_progress for insert
with check (public.workspace_member(organization_id));

create policy "members can update task progress"
on public.task_progress for update
using (public.workspace_member(organization_id))
with check (public.workspace_member(organization_id));

create policy "members can read content items"
on public.content_items for select
using (public.workspace_member(organization_id));

create policy "members can insert content items"
on public.content_items for insert
with check (public.workspace_member(organization_id));

create policy "members can update content items"
on public.content_items for update
using (public.workspace_member(organization_id))
with check (public.workspace_member(organization_id));

create policy "members can read activity"
on public.activity_log for select
using (public.workspace_member(organization_id));

grant execute on function public.bootstrap_workspace(text, text) to authenticated;
grant execute on function public.update_my_display_name(text) to authenticated;


-- Teamrollen, Einladungen und Vier-Augen-Freigabe (Migration 20260820)
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


-- Schutzregeln für Review-, Freigabe- und Abschlussstatus (Migration 20260820)
begin;

-- Direkte Browser-Schreibzugriffe dürfen ausschließlich Ideen und Entwürfe speichern.
-- Review, Freigabe und Abschluss erfolgen ausschließlich über die security-definer RPCs.
drop policy if exists "members can insert content items" on public.content_items;
create policy "members can insert draft content items"
on public.content_items for insert
with check (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
);

drop policy if exists "members can update content items" on public.content_items;
create policy "members can update own draft content items"
on public.content_items for update
using (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
)
with check (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
);

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

  if exists (
    select 1
    from public.approval_requests
    where organization_id = target_organization_id
      and task_id = target_task_id
      and requested_by = auth.uid()
      and status in ('requested', 'approved')
  ) then
    raise exception 'Für diesen Entwurf läuft bereits eine Freigabe';
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


-- RPC-Zugriff und Suchpfade härten (Migration 20260820)
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


-- Ausführungsrechte für angemeldete RLS-Hilfsfunktionen (Migration 20260820)
begin;

-- RLS-Regeln und die Teamansicht benötigen diese Funktionen für angemeldete Sitzungen.
-- Anonyme Aufrufe bleiben weiterhin vollständig entzogen.
grant execute on function public.workspace_member(uuid) to authenticated;
grant execute on function public.workspace_admin(uuid) to authenticated;
grant execute on function public.workspace_reviewer(uuid) to authenticated;
grant execute on function public.list_workspace_members(uuid) to authenticated;

commit;


-- Höchstens eine aktive Freigabe je Aufgabe (Migration 20260820)
begin;

-- Pro Aufbauaufgabe darf es höchstens eine offene oder gültige Freigabe geben.
-- Nach Änderungswunsch, Ablehnung, Ablauf oder Abschluss ist eine neue Einreichung möglich.
create unique index if not exists approval_requests_one_active_per_task_idx
  on public.approval_requests (organization_id, task_id)
  where status in ('requested', 'approved');

commit;


-- Systemstabilität, Freigabeablauf und Skalierung (Migration 20260820)
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

-- Das Anlegen eines Tagesplans ist kein Wiederöffnen einer Aufgabe.
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


-- Freigabeabschluss nach Änderungswunsch (Migration 20260820)
begin;

-- Nach einem Änderungswunsch muss ein neuer, erneut geprüfter Antrag erstellt werden.
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

  if request_row.status <> 'requested' then
    raise exception 'Diese Freigabeanfrage ist abgeschlossen. Für Änderungen ist eine neue Einreichung erforderlich';
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

commit;


begin;

-- Ein schlankes Zielbild pro Arbeitsbereich: Basis für KPI- und GEO-Entscheidungen.
create table if not exists public.intelligence_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  domain text not null default '',
  target_market text not null default 'Deutschland',
  target_audience text not null default '',
  primary_goal text not null default 'Organische Sichtbarkeit',
  primary_conversion text not null default '',
  measurement_status text not null default 'empty' check (measurement_status in ('empty', 'baseline', 'connected')),
  baseline_notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.topic_clusters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  business_weight smallint not null default 3 check (business_weight between 1 and 5),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.research_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid references public.topic_clusters(id) on delete set null,
  question text not null,
  search_intent text not null default 'informational' check (search_intent in ('informational', 'commercial', 'transactional', 'navigational')),
  business_weight smallint not null default 3 check (business_weight between 1 and 5),
  visibility_gap smallint not null default 50 check (visibility_gap between 0 and 100),
  impact_score smallint not null default 0 check (impact_score between 0 and 100),
  effort_score smallint not null default 3 check (effort_score between 1 and 5),
  risk_level text not null default 'green' check (risk_level in ('green', 'amber')),
  status text not null default 'backlog' check (status in ('backlog', 'in_progress', 'covered', 'paused')),
  target_url text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_url text not null,
  title text not null,
  publisher text not null default '',
  source_type text not null default 'primary' check (source_type in ('primary', 'official', 'study', 'industry', 'first_party', 'other')),
  published_at date,
  verified_at date,
  review_due_at date,
  evidence_strength smallint not null default 3 check (evidence_strength between 1 and 5),
  note text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, source_url)
);

create table if not exists public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid references public.topic_clusters(id) on delete set null,
  claim_text text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  status text not null default 'needs_evidence' check (status in ('needs_evidence', 'supported', 'needs_review', 'retired')),
  last_verified_at date,
  review_due_at date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.claim_source_links (
  claim_id uuid not null references public.evidence_claims(id) on delete cascade,
  source_id uuid not null references public.evidence_sources(id) on delete cascade,
  relationship text not null default 'supports' check (relationship in ('supports', 'context', 'contradicts')),
  primary key (claim_id, source_id)
);

create table if not exists public.question_content_links (
  question_id uuid not null references public.research_questions(id) on delete cascade,
  task_id text not null default '',
  target_url text not null default '',
  coverage_status text not null default 'missing' check (coverage_status in ('missing', 'planned', 'covered', 'refresh_needed')),
  primary key (question_id, task_id, target_url)
);

create table if not exists public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_date date not null,
  source text not null default 'manual' check (source in ('manual', 'csv', 'gsc', 'ga4')),
  metric_type text not null check (metric_type in ('clicks', 'impressions', 'ctr', 'position', 'sessions', 'referrals', 'conversions', 'mentions', 'citations')),
  metric_value numeric not null,
  page_url text not null default '',
  query_text text not null default '',
  country text not null default '',
  device text not null default '',
  note text not null default '',
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_monitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question_id uuid references public.research_questions(id) on delete set null,
  prompt_text text not null,
  system_name text not null default 'Manuelle Prüfung',
  language_code text not null default 'de',
  priority smallint not null default 3 check (priority between 1 and 5),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_snapshots (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.prompt_monitors(id) on delete cascade,
  checked_at timestamptz not null default now(),
  answer_summary text not null default '',
  brand_mentioned boolean not null default false,
  domain_cited boolean not null default false,
  cited_domains text[] not null default '{}',
  evidence_url text not null default '',
  reviewer_note text not null default '',
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Aktualitätsstempel für veränderliche Intelligence-Entitäten.
drop trigger if exists intelligence_profiles_updated_at on public.intelligence_profiles;
create trigger intelligence_profiles_updated_at before update on public.intelligence_profiles for each row execute procedure public.set_updated_at();
drop trigger if exists topic_clusters_updated_at on public.topic_clusters;
create trigger topic_clusters_updated_at before update on public.topic_clusters for each row execute procedure public.set_updated_at();
drop trigger if exists research_questions_updated_at on public.research_questions;
create trigger research_questions_updated_at before update on public.research_questions for each row execute procedure public.set_updated_at();
drop trigger if exists evidence_sources_updated_at on public.evidence_sources;
create trigger evidence_sources_updated_at before update on public.evidence_sources for each row execute procedure public.set_updated_at();
drop trigger if exists evidence_claims_updated_at on public.evidence_claims;
create trigger evidence_claims_updated_at before update on public.evidence_claims for each row execute procedure public.set_updated_at();
drop trigger if exists prompt_monitors_updated_at on public.prompt_monitors;
create trigger prompt_monitors_updated_at before update on public.prompt_monitors for each row execute procedure public.set_updated_at();

-- Workspace-Zugriff wird auf alle Intelligence-Tabellen durchgezogen.
alter table public.intelligence_profiles enable row level security;
alter table public.topic_clusters enable row level security;
alter table public.research_questions enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.claim_source_links enable row level security;
alter table public.question_content_links enable row level security;
alter table public.metric_snapshots enable row level security;
alter table public.prompt_monitors enable row level security;
alter table public.prompt_snapshots enable row level security;

create policy "members can read intelligence profile" on public.intelligence_profiles for select using (public.workspace_member(organization_id));
create policy "admins can insert intelligence profile" on public.intelligence_profiles for insert with check (public.workspace_admin(organization_id));
create policy "admins can update intelligence profile" on public.intelligence_profiles for update using (public.workspace_admin(organization_id)) with check (public.workspace_admin(organization_id));

create policy "members can read topic clusters" on public.topic_clusters for select using (public.workspace_member(organization_id));
create policy "members can write topic clusters" on public.topic_clusters for insert with check (public.workspace_member(organization_id));
create policy "members can update topic clusters" on public.topic_clusters for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read research questions" on public.research_questions for select using (public.workspace_member(organization_id));
create policy "members can write research questions" on public.research_questions for insert with check (public.workspace_member(organization_id));
create policy "members can update research questions" on public.research_questions for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read evidence sources" on public.evidence_sources for select using (public.workspace_member(organization_id));
create policy "members can write evidence sources" on public.evidence_sources for insert with check (public.workspace_member(organization_id));
create policy "members can update evidence sources" on public.evidence_sources for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read evidence claims" on public.evidence_claims for select using (public.workspace_member(organization_id));
create policy "members can write evidence claims" on public.evidence_claims for insert with check (public.workspace_member(organization_id));
create policy "members can update evidence claims" on public.evidence_claims for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read claim source links" on public.claim_source_links for select using (exists (select 1 from public.evidence_claims claim where claim.id = claim_id and public.workspace_member(claim.organization_id)));
create policy "members can write claim source links" on public.claim_source_links for insert with check (exists (select 1 from public.evidence_claims claim where claim.id = claim_id and public.workspace_member(claim.organization_id)));
create policy "members can update claim source links" on public.claim_source_links for update using (exists (select 1 from public.evidence_claims claim where claim.id = claim_id and public.workspace_member(claim.organization_id))) with check (exists (select 1 from public.evidence_claims claim where claim.id = claim_id and public.workspace_member(claim.organization_id)));

create policy "members can read question content links" on public.question_content_links for select using (exists (select 1 from public.research_questions question where question.id = question_id and public.workspace_member(question.organization_id)));
create policy "members can write question content links" on public.question_content_links for insert with check (exists (select 1 from public.research_questions question where question.id = question_id and public.workspace_member(question.organization_id)));
create policy "members can update question content links" on public.question_content_links for update using (exists (select 1 from public.research_questions question where question.id = question_id and public.workspace_member(question.organization_id))) with check (exists (select 1 from public.research_questions question where question.id = question_id and public.workspace_member(question.organization_id)));

create policy "members can read metric snapshots" on public.metric_snapshots for select using (public.workspace_member(organization_id));
create policy "members can write metric snapshots" on public.metric_snapshots for insert with check (public.workspace_member(organization_id));
create policy "members can update metric snapshots" on public.metric_snapshots for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read prompt monitors" on public.prompt_monitors for select using (public.workspace_member(organization_id));
create policy "members can write prompt monitors" on public.prompt_monitors for insert with check (public.workspace_member(organization_id));
create policy "members can update prompt monitors" on public.prompt_monitors for update using (public.workspace_member(organization_id)) with check (public.workspace_member(organization_id));

create policy "members can read prompt snapshots" on public.prompt_snapshots for select using (exists (select 1 from public.prompt_monitors monitor where monitor.id = monitor_id and public.workspace_member(monitor.organization_id)));
create policy "members can write prompt snapshots" on public.prompt_snapshots for insert with check (exists (select 1 from public.prompt_monitors monitor where monitor.id = monitor_id and public.workspace_member(monitor.organization_id)));
create policy "members can update prompt snapshots" on public.prompt_snapshots for update using (exists (select 1 from public.prompt_monitors monitor where monitor.id = monitor_id and public.workspace_member(monitor.organization_id))) with check (exists (select 1 from public.prompt_monitors monitor where monitor.id = monitor_id and public.workspace_member(monitor.organization_id)));

-- Indizes halten offene Lücken und Zeitreihen auch bei mehreren Kunden schnell.
create index if not exists topic_clusters_organization_status_idx on public.topic_clusters (organization_id, status);
create index if not exists research_questions_organization_status_idx on public.research_questions (organization_id, status);
create index if not exists research_questions_topic_idx on public.research_questions (topic_id);
create index if not exists evidence_sources_organization_review_idx on public.evidence_sources (organization_id, review_due_at);
create index if not exists evidence_claims_organization_status_idx on public.evidence_claims (organization_id, status);
create index if not exists metric_snapshots_organization_date_idx on public.metric_snapshots (organization_id, metric_date desc);
create index if not exists metric_snapshots_organization_type_idx on public.metric_snapshots (organization_id, metric_type, metric_date desc);
create index if not exists prompt_monitors_organization_status_idx on public.prompt_monitors (organization_id, status);
create index if not exists prompt_snapshots_monitor_checked_idx on public.prompt_snapshots (monitor_id, checked_at desc);

commit;


begin;

create index if not exists topic_clusters_created_by_idx on public.topic_clusters (created_by);
create index if not exists research_questions_created_by_idx on public.research_questions (created_by);
create index if not exists evidence_sources_created_by_idx on public.evidence_sources (created_by);
create index if not exists evidence_claims_created_by_idx on public.evidence_claims (created_by);
create index if not exists evidence_claims_topic_idx on public.evidence_claims (topic_id);
create index if not exists claim_source_links_source_idx on public.claim_source_links (source_id);
create index if not exists metric_snapshots_recorded_by_idx on public.metric_snapshots (recorded_by);
create index if not exists prompt_monitors_created_by_idx on public.prompt_monitors (created_by);
create index if not exists prompt_monitors_question_idx on public.prompt_monitors (question_id);
create index if not exists prompt_snapshots_recorded_by_idx on public.prompt_snapshots (recorded_by);

commit;
