begin;

create or replace function public.review_application(
  p_application_id text,
  p_expected_status text,
  p_next_status text,
  p_review_comment text,
  p_actor_user_id text,
  p_actor_role text
) returns public.applications
language plpgsql security definer set search_path = public
as $$
declare v_current public.applications; v_updated public.applications;
begin
  if p_actor_role not in ('admin', 'teacher') then
    raise exception 'REVIEW_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_actor_role = 'admin' and not exists (
    select 1 from public.users where id = p_actor_user_id and role = 'admin' and is_active
  ) then raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501'; end if;
  if p_actor_role = 'teacher' and not exists (
    select 1 from public.users where id = p_actor_user_id and role = 'club_manager' and is_active
  ) then raise exception 'TEACHER_ROLE_REQUIRED' using errcode = '42501'; end if;

  select * into v_current from public.applications where id = p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_current.status <> p_expected_status then raise exception 'APPLICATION_CONFLICT' using errcode = '40001'; end if;
  if p_actor_role = 'teacher' and not exists (
    select 1 from public.teacher_clubs where teacher_user_id = p_actor_user_id and club_id = v_current.club_id
  ) then raise exception 'TEACHER_SCOPE_REQUIRED' using errcode = '42501'; end if;

  update public.applications set status = p_next_status, review_comment = p_review_comment,
    reviewed_at = now(), reviewed_by = p_actor_user_id, updated_at = now(), google_sheet_synced = false
  where id = p_application_id returning * into v_updated;

  insert into public.audit_logs(id, actor_user_id, actor_role, action_type, target_type, target_id, before_data, after_data)
  values ('audit_' || replace(gen_random_uuid()::text, '-', ''), p_actor_user_id, p_actor_role,
    'application.status_changed', 'application', p_application_id,
    jsonb_build_object('status', v_current.status, 'reviewCommentPresent', v_current.review_comment is not null),
    jsonb_build_object('status', p_next_status, 'reviewCommentPresent', p_review_comment is not null));
  return v_updated;
end $$;

revoke all on function public.review_application(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.review_application(text,text,text,text,text,text) to service_role;

commit;
