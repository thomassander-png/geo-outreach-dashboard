begin;

-- Premiumreport-Konfiguration pro Workspace. Enthält ausschließlich Darstellung,
-- Berichtsrhythmus und Freigabeprinzip – niemals Zugangsdaten oder OAuth-Tokens.
create table if not exists public.reporting_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  client_display_name text not null default '',
  report_title text not null default 'GEO-Wirkungsreport',
  report_language text not null default 'de' check (report_language in ('de', 'en')),
  timezone text not null default 'Europe/Berlin',
  weekly_review_weekday smallint not null default 1 check (weekly_review_weekday between 0 and 6),
  monthly_report_day smallint not null default 3 check (monthly_report_day between 1 and 28),
  internal_approval_required boolean not null default true,
  automatic_delivery_enabled boolean not null default false,
  reporting_status text not null default 'setup' check (reporting_status in ('setup', 'ready', 'active', 'paused')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Einheitliches KPI-Glossar. Jede Kennzahl im Report hat Quelle, Zielrichtung
-- und optional eine zugehörige Kernseite.
create table if not exists public.reporting_kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  label text not null,
  metric_type text not null check (metric_type in ('clicks', 'impressions', 'ctr', 'position', 'sessions', 'referrals', 'conversions', 'mentions', 'citations')),
  preferred_source text not null default 'manual' check (preferred_source in ('manual', 'csv', 'gsc', 'ga4')),
  target_url text not null default '',
  direction text not null default 'up' check (direction in ('up', 'down', 'neutral')),
  target_value numeric,
  position smallint not null default 1 check (position between 1 and 20),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- Versionierter Berichtslauf. Das JSON-Snapshotfeld hält die nachvollziehbare
-- Kennzahlenbasis der erzeugten Fassung fest, während die Rohzeitreihen weiter
-- in metric_snapshots liegen.
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_type text not null check (report_type in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready_for_review', 'approved', 'delivered', 'failed', 'superseded')),
  data_freshness text not null default 'pending' check (data_freshness in ('pending', 'fresh', 'delayed', 'incomplete', 'error')),
  generated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  delivered_at timestamptz,
  delivery_note text not null default '',
  summary_text text not null default '',
  limitations_text text not null default '',
  metrics_snapshot jsonb not null default '{}'::jsonb,
  action_snapshot jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (organization_id, report_type, period_start, period_end, version)
);

-- Prüffähige Reportaussagen. Jede Aussage bleibt mit Kennzahl und Maßnahme
-- verknüpfbar; die Wirkung wird als Hinweis, nicht als Kausalitätsbehauptung formuliert.
create table if not exists public.report_insights (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_runs(id) on delete cascade,
  insight_type text not null check (insight_type in ('progress', 'action_effect', 'gap', 'risk', 'next_priority', 'data_quality')),
  priority smallint not null default 3 check (priority between 1 and 5),
  title text not null,
  body text not null,
  confidence text not null default 'observed' check (confidence in ('observed', 'directional', 'limited')),
  evidence jsonb not null default '[]'::jsonb,
  action_reference text not null default '',
  target_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Empfänger und Zustellung sind vom Reportinhalt getrennt. Die E-Mail-Adresse
-- wird ausschließlich serverseitig zur Zustellung verwendet und nie in Clientlogs ausgegeben.
create table if not exists public.report_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_name text not null default '',
  recipient_email text not null,
  recipient_role text not null default 'client' check (recipient_role in ('internal', 'client', 'executive')),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, recipient_email)
);

create table if not exists public.report_artifacts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_runs(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('web', 'pdf')),
  storage_path text not null default '',
  checksum text not null default '',
  created_at timestamptz not null default now(),
  unique (report_id, artifact_type)
);

create table if not exists public.report_delivery_runs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_runs(id) on delete cascade,
  recipient_id uuid references public.report_recipients(id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'manual')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_code text not null default '',
  error_message text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger reporting_profiles_updated_at before update on public.reporting_profiles for each row execute procedure public.set_updated_at();
create trigger reporting_kpis_updated_at before update on public.reporting_kpis for each row execute procedure public.set_updated_at();
create trigger report_runs_updated_at before update on public.report_runs for each row execute procedure public.set_updated_at();
create trigger report_insights_updated_at before update on public.report_insights for each row execute procedure public.set_updated_at();

alter table public.reporting_profiles enable row level security;
alter table public.reporting_kpis enable row level security;
alter table public.report_runs enable row level security;
alter table public.report_insights enable row level security;
alter table public.report_recipients enable row level security;
alter table public.report_artifacts enable row level security;
alter table public.report_delivery_runs enable row level security;

create policy "members can read reporting profiles"
on public.reporting_profiles for select using (public.workspace_member(organization_id));
create policy "admins can insert reporting profiles"
on public.reporting_profiles for insert with check (public.workspace_admin(organization_id));
create policy "admins can update reporting profiles"
on public.reporting_profiles for update using (public.workspace_admin(organization_id)) with check (public.workspace_admin(organization_id));

create policy "members can read reporting kpis"
on public.reporting_kpis for select using (public.workspace_member(organization_id));
create policy "admins can insert reporting kpis"
on public.reporting_kpis for insert with check (public.workspace_admin(organization_id));
create policy "admins can update reporting kpis"
on public.reporting_kpis for update using (public.workspace_admin(organization_id)) with check (public.workspace_admin(organization_id));

create policy "members can read report runs"
on public.report_runs for select using (public.workspace_member(organization_id));
create policy "admins can insert report runs"
on public.report_runs for insert with check (public.workspace_admin(organization_id));
create policy "admins can update report runs"
on public.report_runs for update using (public.workspace_admin(organization_id)) with check (public.workspace_admin(organization_id));

create policy "members can read report insights"
on public.report_insights for select using (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_member(run.organization_id)
));
create policy "admins can insert report insights"
on public.report_insights for insert with check (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
));
create policy "admins can update report insights"
on public.report_insights for update using (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
)) with check (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
));

create policy "admins can read report recipients"
on public.report_recipients for select using (public.workspace_admin(organization_id));
create policy "admins can insert report recipients"
on public.report_recipients for insert with check (public.workspace_admin(organization_id));
create policy "admins can update report recipients"
on public.report_recipients for update using (public.workspace_admin(organization_id)) with check (public.workspace_admin(organization_id));

create policy "members can read report artifacts"
on public.report_artifacts for select using (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_member(run.organization_id)
));
create policy "admins can insert report artifacts"
on public.report_artifacts for insert with check (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
));

create policy "admins can read report delivery runs"
on public.report_delivery_runs for select using (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
));
create policy "admins can insert report delivery runs"
on public.report_delivery_runs for insert with check (exists (
  select 1 from public.report_runs run
  where run.id = report_id and public.workspace_admin(run.organization_id)
));

-- Eine von Admins gestartete Reportfassung kann erst intern geprüft und dann
-- freigegeben werden. Automatisierte Serverjobs schreiben später über das
-- Servicekonto und nutzen denselben Statusfluss.
create or replace function public.prepare_report_run(
  target_organization_id uuid,
  target_report_type text,
  target_period_start date,
  target_period_end date
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_report_id uuid;
  next_version integer;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;
  if not public.workspace_admin(target_organization_id) then
    raise exception 'Nur Admins dürfen einen Bericht vorbereiten';
  end if;
  if target_report_type not in ('daily', 'weekly', 'monthly') then
    raise exception 'Ungültiger Berichtstyp';
  end if;
  if target_period_end < target_period_start then
    raise exception 'Ungültiger Berichtszeitraum';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.report_runs
  where organization_id = target_organization_id
    and report_type = target_report_type
    and period_start = target_period_start
    and period_end = target_period_end;

  insert into public.report_runs (
    organization_id, report_type, period_start, period_end, version,
    status, data_freshness, created_by
  ) values (
    target_organization_id, target_report_type, target_period_start, target_period_end, next_version,
    'draft', 'pending', auth.uid()
  ) returning id into new_report_id;

  perform public.log_workspace_activity(target_organization_id, 'report_prepared', null);
  return new_report_id;
end;
$$;

revoke all on function public.prepare_report_run(uuid, text, date, date) from public, anon;
grant execute on function public.prepare_report_run(uuid, text, date, date) to authenticated;

create index if not exists reporting_kpis_organization_active_idx on public.reporting_kpis (organization_id, active, position);
create index if not exists report_runs_organization_type_period_idx on public.report_runs (organization_id, report_type, period_end desc);
create index if not exists report_runs_organization_status_idx on public.report_runs (organization_id, status, created_at desc);
create index if not exists report_insights_report_priority_idx on public.report_insights (report_id, priority desc, created_at desc);
create index if not exists report_recipients_organization_active_idx on public.report_recipients (organization_id, active);
create index if not exists report_delivery_runs_report_created_idx on public.report_delivery_runs (report_id, created_at desc);

commit;
