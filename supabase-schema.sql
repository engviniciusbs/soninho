-- Soninho Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Babies table
create table public.babies (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  birth_date date not null,
  avatar_emoji text default '🍼',
  created_at timestamptz default now()
);

-- Sleep sessions table
create table public.sleep_sessions (
  id uuid default uuid_generate_v4() primary key,
  baby_id uuid references public.babies(id) on delete cascade not null,
  type text check (type in ('NAP', 'NIGHT_SLEEP')) not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_min integer,
  quality integer check (quality between 1 and 5),
  notes text,
  location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.babies enable row level security;
alter table public.sleep_sessions enable row level security;

-- RLS Policies
create policy "Users can only access their own babies"
  on public.babies for all
  using (auth.uid() = user_id);

create policy "Users can only access sleep sessions of their own babies"
  on public.sleep_sessions for all
  using (
    baby_id in (
      select id from public.babies where user_id = auth.uid()
    )
  );

-- Trigger: auto-calculate duration_min on end_time update
create or replace function calculate_duration()
returns trigger as $$
begin
  if new.end_time is not null then
    new.duration_min := extract(epoch from (new.end_time - new.start_time)) / 60;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger calculate_sleep_duration
  before insert or update on public.sleep_sessions
  for each row execute function calculate_duration();

-- Indexes
create index idx_sleep_sessions_baby_id on public.sleep_sessions(baby_id);
create index idx_sleep_sessions_start_time on public.sleep_sessions(start_time desc);
create index idx_sleep_sessions_baby_start on public.sleep_sessions(baby_id, start_time desc);
