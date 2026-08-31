begin;

create table if not exists public.allowed_accounts (
  id text primary key,
  normalized_email text not null,
  reserved_role text not null check (reserved_role in ('club_manager', 'admin')),
  is_active boolean not null default true,
  used_at timestamptz,
  created_by text not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  linked_user_id text references public.users(id),
  expires_at timestamptz,
  constraint allowed_accounts_normalized_email check (
    normalized_email = lower(btrim(normalized_email))
    and char_length(normalized_email) between 3 and 254
    and normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint allowed_accounts_usage_link check (
    (used_at is null and linked_user_id is null)
    or (used_at is not null and linked_user_id is not null)
  )
);

create unique index if not exists allowed_accounts_active_email_unique
  on public.allowed_accounts(normalized_email)
  where is_active;

create index if not exists allowed_accounts_created_at_idx
  on public.allowed_accounts(created_at desc);

alter table public.allowed_accounts enable row level security;
revoke all on public.allowed_accounts from public, anon, authenticated;
grant all on public.allowed_accounts to service_role;

create or replace function public.claim_allowed_account(
  p_normalized_email text,
  p_auth_user_id uuid,
  p_user_id text,
  p_alias text,
  p_recovery_hash text,
  p_now timestamptz
) returns public.users
language plpgsql security definer set search_path = public
as $$
declare
  v_approval public.allowed_accounts%rowtype;
  v_user public.users%rowtype;
begin
  select * into v_approval
  from public.allowed_accounts
  where normalized_email = lower(btrim(p_normalized_email))
    and is_active
    and used_at is null
    and (expires_at is null or expires_at > p_now)
  for update;

  if not found then
    raise exception 'EXTERNAL_ACCOUNT_NOT_APPROVED' using errcode = 'P0002';
  end if;

  insert into public.users (
    id, auth_user_id, alias, recovery_hash, role, is_active,
    last_active_at, created_at, updated_at
  ) values (
    p_user_id, p_auth_user_id, p_alias, p_recovery_hash,
    v_approval.reserved_role, true, p_now, p_now, p_now
  ) returning * into v_user;

  update public.allowed_accounts
  set used_at = p_now, linked_user_id = v_user.id, updated_at = p_now
  where id = v_approval.id;

  return v_user;
end;
$$;

revoke all on function public.claim_allowed_account(text,uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_allowed_account(text,uuid,text,text,text,timestamptz) to service_role;

create or replace function public.demote_club_manager(
  p_target_user_id text,
  p_actor_user_id text,
  p_audit_id text,
  p_now timestamptz
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_target public.users%rowtype;
  v_removed_count integer := 0;
begin
  if not exists (
    select 1 from public.users
    where id = p_actor_user_id and role = 'admin' and is_active
  ) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select * into v_target from public.users where id = p_target_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_target.role = 'admin' then raise exception 'ADMIN_ROLE_PROTECTED' using errcode = '42501'; end if;

  delete from public.teacher_clubs where teacher_user_id = p_target_user_id;
  get diagnostics v_removed_count = row_count;

  update public.users set role = 'student', updated_at = p_now where id = p_target_user_id;

  insert into public.audit_logs (
    id, actor_user_id, actor_role, action_type, target_type, target_id,
    before_data, after_data, created_at
  ) values (
    p_audit_id, p_actor_user_id, 'admin', 'teacher.role_changed', 'user', p_target_user_id,
    jsonb_build_object('role', v_target.role),
    jsonb_build_object('role', 'student', 'assignmentCountRemoved', v_removed_count),
    p_now
  );

  return jsonb_build_object('removedCount', v_removed_count);
end;
$$;

revoke all on function public.demote_club_manager(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.demote_club_manager(text,text,text,timestamptz) to service_role;

commit;
