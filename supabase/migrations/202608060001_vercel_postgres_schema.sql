begin;

create table if not exists public.users (
  id text primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null,
  recovery_hash text not null,
  role text not null default 'student' check (role in ('student', 'club_manager', 'admin')),
  is_active boolean not null default true,
  last_active_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_auth_user_id_unique unique (auth_user_id),
  constraint users_alias_unique unique (alias),
  constraint users_recovery_hash_unique unique (recovery_hash)
);

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  category text not null,
  field text,
  club_type text,
  description text not null,
  activity_details text not null,
  teacher_display_text text,
  contact_location text,
  activity_location text,
  capacity integer not null default 20 check (capacity >= 0),
  recruitment_status text not null default 'open',
  application_start_at timestamptz,
  application_end_at timestamptz,
  manager_user_id text references public.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_clubs (
  id text primary key,
  teacher_user_id text not null references public.users(id) on delete cascade,
  club_id text not null,
  created_at timestamptz not null default now(),
  created_by text not null references public.users(id),
  constraint teacher_clubs_club_id_fkey foreign key (club_id) references public.clubs(id),
  constraint teacher_clubs_teacher_club_unique unique (teacher_user_id, club_id)
);

create table if not exists public.applications (
  id text primary key,
  application_number text not null,
  user_id text not null references public.users(id),
  club_id text not null,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'waiting', 'approved', 'rejected', 'cancelled')),
  motivation text not null,
  interest_area text,
  career_interest text not null,
  experience text not null,
  additional_answer text,
  submitted_at timestamptz not null default now(),
  cancelled_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text references public.users(id),
  review_comment text,
  google_sheet_synced boolean not null default false,
  google_sheet_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint applications_application_number_unique unique (application_number),
  constraint applications_club_id_fkey foreign key (club_id) references public.clubs(id),
  constraint application_user_club_unique unique (user_id, club_id)
);

create table if not exists public.posts (
  id text primary key,
  author_user_id text not null references public.users(id),
  author_alias text not null,
  category text not null,
  club_id text,
  title text not null,
  content text not null,
  is_notice boolean not null default false,
  is_hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id text primary key,
  post_id text not null references public.posts(id),
  author_user_id text not null references public.users(id),
  author_alias text not null,
  content text not null,
  is_hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  author_user_id text not null references public.users(id),
  author_alias text not null,
  club_id text not null,
  title text not null,
  content text not null,
  is_private boolean not null default false,
  status text not null default 'waiting' check (status in ('waiting', 'answered', 'closed')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answers (
  id text primary key,
  question_id text not null references public.questions(id),
  author_user_id text not null references public.users(id),
  author_role text not null,
  content text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  actor_user_id text references public.users(id),
  actor_role text not null,
  action_type text not null,
  target_type text not null,
  target_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id text primary key,
  data_type text not null,
  source_id text not null,
  operation text not null,
  payload jsonb not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_error text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_source_operation_unique unique (data_type, source_id, operation)
);

create index if not exists applications_user_idx on public.applications(user_id);
create index if not exists applications_club_idx on public.applications(club_id);
create index if not exists applications_status_submitted_idx on public.applications(status, submitted_at desc);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists questions_club_idx on public.questions(club_id);
create index if not exists teacher_clubs_club_idx on public.teacher_clubs(club_id);

commit;
