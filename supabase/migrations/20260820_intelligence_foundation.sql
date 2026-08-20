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
