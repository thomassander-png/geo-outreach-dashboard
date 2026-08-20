begin;

-- Pro Aufbauaufgabe darf es höchstens eine offene oder gültige Freigabe geben.
-- Nach Änderungswunsch, Ablehnung, Ablauf oder Abschluss ist eine neue Einreichung möglich.
create unique index if not exists approval_requests_one_active_per_task_idx
  on public.approval_requests (organization_id, task_id)
  where status in ('requested', 'approved');

commit;
