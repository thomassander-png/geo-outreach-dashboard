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
