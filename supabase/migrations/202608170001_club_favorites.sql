begin;

create table if not exists public.club_favorites (
  user_id text not null references public.users(id) on delete cascade,
  club_id text not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, club_id)
);

create index if not exists club_favorites_user_created_idx
  on public.club_favorites(user_id, created_at desc);
create index if not exists club_favorites_club_idx
  on public.club_favorites(club_id);

alter table public.club_favorites enable row level security;
revoke all on public.club_favorites from anon, authenticated;
grant all on public.club_favorites to service_role;

commit;
