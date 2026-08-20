begin;

-- Direkte Browser-Schreibzugriffe dürfen ausschließlich Ideen und Entwürfe speichern.
-- Review, Freigabe und Abschluss erfolgen ausschließlich über die security-definer RPCs.
drop policy if exists "members can insert content items" on public.content_items;
create policy "members can insert draft content items"
on public.content_items for insert
with check (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
);

drop policy if exists "members can update content items" on public.content_items;
create policy "members can update own draft content items"
on public.content_items for update
using (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
)
with check (
  public.workspace_member(organization_id)
  and status in ('idea', 'draft')
);

create or replace function public.submit_approval_request(
  target_organization_id uuid,
  target_task_id text,
  target_platform_name text,
  target_platform_url text,
  target_criteria jsonb,
  target_request_note text,
  target_content_snapshot text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  request_id uuid;
  assigned_user_id uuid;
begin
  if not public.workspace_member(target_organization_id) then
    raise exception 'Kein Zugriff auf diesen Arbeitsbereich';
  end if;

  select assigned_to into assigned_user_id
  from public.task_progress
  where organization_id = target_organization_id and task_id = target_task_id;

  if assigned_user_id is not null and assigned_user_id <> auth.uid() then
    raise exception 'Diese Aufgabe ist einer anderen Person zugewiesen';
  end if;

  if exists (
    select 1
    from public.approval_requests
    where organization_id = target_organization_id
      and task_id = target_task_id
      and requested_by = auth.uid()
      and status in ('requested', 'approved')
  ) then
    raise exception 'Für diesen Entwurf läuft bereits eine Freigabe';
  end if;

  if not (
    coalesce((target_criteria ->> 'allowed')::boolean, false)
    and coalesce((target_criteria ->> 'relevant')::boolean, false)
    and coalesce((target_criteria ->> 'transparent')::boolean, false)
    and coalesce((target_criteria ->> 'value')::boolean, false)
  ) then
    raise exception 'Alle vier Kriterien müssen mit Ja bestätigt sein';
  end if;

  insert into public.approval_requests (
    organization_id, task_id, requested_by, platform_name, platform_url,
    criteria, request_note, content_snapshot, status
  )
  values (
    target_organization_id, target_task_id, auth.uid(), trim(target_platform_name), trim(target_platform_url),
    target_criteria, trim(coalesce(target_request_note, '')), coalesce(target_content_snapshot, ''), 'requested'
  )
  returning id into request_id;

  insert into public.content_items (organization_id, task_id, status)
  values (target_organization_id, target_task_id, 'review')
  on conflict (organization_id, task_id) do update set status = 'review', updated_at = now();

  perform public.log_workspace_activity(target_organization_id, 'approval_requested', target_task_id);
  return request_id;
end;
$$;

commit;
