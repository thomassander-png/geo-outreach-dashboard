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
