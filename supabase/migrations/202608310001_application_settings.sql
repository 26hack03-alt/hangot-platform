begin;

create table if not exists public.application_settings (
  id text primary key check (id = 'global_application_period'),
  application_start_at timestamptz,
  application_end_at timestamptz,
  updated_by text references public.users(id),
  updated_at timestamptz not null default now(),
  constraint application_settings_period_pair check (
    (application_start_at is null and application_end_at is null)
    or
    (application_start_at is not null and application_end_at is not null and application_end_at > application_start_at)
  )
);

insert into public.application_settings (id) values ('global_application_period') on conflict (id) do nothing;
alter table public.application_settings enable row level security;
revoke all on public.application_settings from public, anon, authenticated;
grant all on public.application_settings to service_role;

commit;
