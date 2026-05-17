-- supabase/migrations/001_initial.sql

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  date date not null,
  event text not null,
  category text not null default '',
  placement text not null default '',
  venue text,
  note text,
  screenshot_url text not null default ''
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round text not null,
  opponent text,
  result text not null check (result in ('win', 'loss')),
  scores jsonb not null default '[]'::jsonb
);

-- Supabase Storage 버킷은 대시보드에서 생성:
-- 버킷 이름: screenshots
-- Public: true
