begin;

alter table public.users enable row level security;
alter table public.clubs enable row level security;
alter table public.teacher_clubs enable row level security;
alter table public.applications enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.audit_logs enable row level security;
alter table public.sync_jobs enable row level security;

revoke all on all tables in schema public from anon;
revoke all on public.users, public.teacher_clubs, public.audit_logs, public.sync_jobs from authenticated;
grant select on public.clubs, public.posts, public.questions, public.answers to authenticated;
grant select, insert, update on public.applications to authenticated;

create policy applications_read_own on public.applications for select to authenticated
using (user_id = (select id from public.users where auth_user_id = auth.uid()));
create policy applications_insert_own on public.applications for insert to authenticated
with check (user_id = (select id from public.users where auth_user_id = auth.uid()) and status = 'submitted');
create policy applications_cancel_own on public.applications for update to authenticated
using (user_id = (select id from public.users where auth_user_id = auth.uid()))
with check (user_id = (select id from public.users where auth_user_id = auth.uid()) and status = 'cancelled');
create policy clubs_read_authenticated on public.clubs for select to authenticated using (is_active);
create policy posts_read_visible on public.posts for select to authenticated using (not is_hidden and deleted_at is null);
create policy questions_read_visible on public.questions for select to authenticated
using (deleted_at is null and (not is_private or author_user_id = (select id from public.users where auth_user_id = auth.uid())));
create policy answers_read_visible on public.answers for select to authenticated using (deleted_at is null);

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
    jsonb_build_object('status', v_current.status, 'reviewComment', v_current.review_comment),
    jsonb_build_object('status', p_next_status, 'reviewComment', p_review_comment));
  return v_updated;
end $$;

revoke all on function public.review_application(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.review_application(text,text,text,text,text,text) to service_role;

commit;
