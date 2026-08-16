begin;

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  target_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_target_path_internal check (
    target_path is null or (target_path like '/%' and target_path not like '//%')
  )
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant all on public.notifications to service_role;

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
declare
  v_current public.applications;
  v_updated public.applications;
  v_club_name text;
  v_title text;
  v_message text;
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

  select name into v_club_name from public.clubs where id = v_current.club_id;
  v_club_name := coalesce(v_club_name, '동아리');
  case p_next_status
    when 'under_review' then
      v_title := '신청 검토가 시작되었습니다.';
      v_message := v_club_name || ' 신청을 검토하고 있습니다.';
    when 'waiting' then
      v_title := '신청이 대기 상태로 변경되었습니다.';
      v_message := v_club_name || ' 신청 결과를 기다려 주세요.';
    when 'approved' then
      v_title := '동아리 신청이 승인되었습니다.';
      v_message := v_club_name || ' 신청이 승인되었습니다.';
    when 'rejected' then
      v_title := '동아리 신청 결과가 변경되었습니다.';
      v_message := v_club_name || ' 신청이 반려되었습니다.';
    else
      v_title := null;
  end case;

  if v_title is not null then
    insert into public.notifications(id, user_id, type, title, message, target_path)
    values (
      'noti_' || replace(gen_random_uuid()::text, '-', ''),
      v_current.user_id,
      'application_status',
      v_title,
      v_message,
      '/my/applications/' || p_application_id
    );
  end if;

  return v_updated;
end $$;

revoke all on function public.review_application(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.review_application(text,text,text,text,text,text) to service_role;

commit;
