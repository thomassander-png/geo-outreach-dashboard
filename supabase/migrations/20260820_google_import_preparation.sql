begin;

-- Verbindungsmetadaten ohne OAuth-Token. Tokens bleiben später ausschließlich in Vault/Serverkonfiguration.
create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  status text not null default 'pending_authorization' check (status in ('pending_authorization', 'connected', 'syncing', 'error', 'paused')),
  gsc_site_url text not null default '',
  ga4_property_id text not null default '',
  last_synced_at timestamptz,
  last_attempted_at timestamptz,
  next_scheduled_at timestamptz,
  data_freshness text not null default 'not_connected' check (data_freshness in ('not_connected', 'pending', 'fresh', 'delayed', 'error')),
  last_error_code text not null default '',
  last_error_message text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table if not exists public.google_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.google_integrations(id) on delete cascade,
  source text not null check (source in ('gsc', 'ga4')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  period_start date,
  period_end date,
  rows_fetched integer not null default 0,
  metrics_written integer not null default 0,
  error_code text not null default '',
  error_message text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists google_integrations_organization_status_idx on public.google_integrations (organization_id, status);
create index if not exists google_integrations_created_by_idx on public.google_integrations (created_by);
create index if not exists google_import_runs_integration_created_idx on public.google_import_runs (integration_id, created_at desc);
create index if not exists google_import_runs_organization_source_idx on public.google_import_runs (organization_id, source, created_at desc);

create trigger google_integrations_updated_at before update on public.google_integrations for each row execute procedure public.set_updated_at();

alter table public.google_integrations enable row level security;
alter table public.google_import_runs enable row level security;

create policy "members can read google integration status"
on public.google_integrations for select
using (public.workspace_member(organization_id));

create policy "members can read google import runs"
on public.google_import_runs for select
using (public.workspace_member(organization_id));

create or replace function public.prepare_google_integration(target_organization_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  integration_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  if not public.workspace_admin(target_organization_id) then
    raise exception 'Nur Admins dürfen die Google-Verbindung vorbereiten';
  end if;

  insert into public.google_integrations (organization_id, status, data_freshness, created_by)
  values (target_organization_id, 'pending_authorization', 'pending', auth.uid())
  on conflict (organization_id, provider) do update
    set status = case when public.google_integrations.status = 'connected' then 'connected' else 'pending_authorization' end,
        data_freshness = case when public.google_integrations.status = 'connected' then public.google_integrations.data_freshness else 'pending' end,
        last_error_code = '',
        last_error_message = ''
  returning id into integration_id;

  perform public.log_workspace_activity(target_organization_id, 'google_connection_prepared', null);
  return integration_id;
end;
$$;

revoke all on function public.prepare_google_integration(uuid) from public, anon;
grant execute on function public.prepare_google_integration(uuid) to authenticated;

commit;
