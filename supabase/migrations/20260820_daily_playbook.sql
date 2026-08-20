create table if not exists public.daily_action_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id text not null,
  planned_for date not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  completed_by text,
  completed_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_id, planned_for)
);

create index if not exists daily_action_instances_calendar_idx
on public.daily_action_instances (organization_id, planned_for);

alter table public.daily_action_instances enable row level security;

drop policy if exists "members can read daily actions" on public.daily_action_instances;
create policy "members can read daily actions"
on public.daily_action_instances for select
using (public.workspace_member(organization_id));

drop policy if exists "members can insert daily actions" on public.daily_action_instances;
create policy "members can insert daily actions"
on public.daily_action_instances for insert
with check (public.workspace_member(organization_id));

drop policy if exists "members can update daily actions" on public.daily_action_instances;
create policy "members can update daily actions"
on public.daily_action_instances for update
using (public.workspace_member(organization_id))
with check (public.workspace_member(organization_id));

create or replace function public.log_daily_action_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
    values (
      new.organization_id,
      'daily_action_planned',
      new.template_id,
      auth.uid(),
      coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
    );
  elsif old.status is distinct from new.status then
    insert into public.activity_log (organization_id, action, task_id, actor_id, actor_name)
    values (
      new.organization_id,
      case
        when new.status = 'done' then 'daily_action_done'
        when new.status = 'skipped' then 'daily_action_skipped'
        else 'daily_action_reopened'
      end,
      new.template_id,
      auth.uid(),
      coalesce((select display_name from public.profiles where id = auth.uid()), 'Teammitglied')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists daily_action_instances_updated_at on public.daily_action_instances;
create trigger daily_action_instances_updated_at
  before update on public.daily_action_instances
  for each row execute procedure public.set_updated_at();

drop trigger if exists daily_action_activity on public.daily_action_instances;
create trigger daily_action_activity
  after insert or update on public.daily_action_instances
  for each row execute procedure public.log_daily_action_change();
