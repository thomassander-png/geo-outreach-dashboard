begin;

-- Technische GEO-Readiness wird je Arbeitsbereich und Checkpunkt gespeichert.
-- Die Checkliste selbst bleibt im Frontend bewusst kompakt; diese Tabelle hält nur Status,
-- nachvollziehbare Notiz und Prüfdatum zentral für das Team fest.
create table if not exists public.technical_readiness_checks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  check_key text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'blocked', 'review')),
  note text not null default '',
  reviewed_at date,
  reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (organization_id, check_key)
);

-- Prompt-Snapshots bleiben eine Stichprobe. Die neuen Felder trennen sichtbare
-- Erwähnung, Domain-Zitat, Quellenprüfung, Referral und die fachliche Entscheidung.
alter table public.prompt_snapshots
  add column if not exists citation_type text not null default 'none' check (citation_type in ('none', 'brand_mention', 'domain_citation', 'source_citation')),
  add column if not exists source_checked boolean not null default false,
  add column if not exists source_relevant boolean,
  add column if not exists referral_observed boolean not null default false,
  add column if not exists review_decision text not null default 'not_checked' check (review_decision in ('not_checked', 'confirmed', 'needs_review', 'not_relevant'));

-- Aktualitätsstempel und Teamzugriff folgen dem vorhandenen Intelligence-Muster.
drop trigger if exists technical_readiness_checks_updated_at on public.technical_readiness_checks;
create trigger technical_readiness_checks_updated_at
  before update on public.technical_readiness_checks
  for each row execute procedure public.set_updated_at();

alter table public.technical_readiness_checks enable row level security;

create policy "members can read technical readiness checks"
on public.technical_readiness_checks for select
using (public.workspace_member(organization_id));

create policy "members can write technical readiness checks"
on public.technical_readiness_checks for insert
with check (public.workspace_member(organization_id));

create policy "members can update technical readiness checks"
on public.technical_readiness_checks for update
using (public.workspace_member(organization_id))
with check (public.workspace_member(organization_id));

create index if not exists technical_readiness_checks_organization_status_idx
  on public.technical_readiness_checks (organization_id, status, updated_at desc);

commit;
