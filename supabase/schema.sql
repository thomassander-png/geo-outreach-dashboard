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
