begin;

-- RLS-Regeln und die Teamansicht benötigen diese Funktionen für angemeldete Sitzungen.
-- Anonyme Aufrufe bleiben weiterhin vollständig entzogen.
grant execute on function public.workspace_member(uuid) to authenticated;
grant execute on function public.workspace_admin(uuid) to authenticated;
grant execute on function public.workspace_reviewer(uuid) to authenticated;
grant execute on function public.list_workspace_members(uuid) to authenticated;

commit;
