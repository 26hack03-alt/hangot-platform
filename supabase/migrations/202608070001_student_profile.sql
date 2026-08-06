begin;

alter table public.users add column if not exists student_name text;
alter table public.users add column if not exists student_number text;
alter table public.users add column if not exists school_year integer;
alter table public.users add column if not exists profile_completed boolean not null default false;
alter table public.users add column if not exists privacy_consent_at timestamptz;
alter table public.users add column if not exists privacy_consent_version text;

create unique index if not exists users_school_year_student_number_unique
  on public.users (school_year, student_number)
  where school_year is not null and student_number is not null;

commit;
