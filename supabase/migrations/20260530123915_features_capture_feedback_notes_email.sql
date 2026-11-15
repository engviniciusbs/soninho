-- 1. New capture columns on sleep_sessions
alter table public.sleep_sessions
  add column if not exists how_fell_asleep text,
  add column if not exists wake_reason text;

-- 2. Weekly email toggle
alter table public.notification_preferences
  add column if not exists weekly_email_enabled boolean not null default true;

-- 3. AI suggestion feedback
create table if not exists public.nap_suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  suggested_time text,
  window_start text,
  window_end text,
  age_weeks integer,
  vote text not null check (vote in ('up','down')),
  created_at timestamptz not null default now()
);
create index if not exists idx_nap_feedback_baby on public.nap_suggestion_feedback(baby_id, created_at desc);
alter table public.nap_suggestion_feedback enable row level security;

create policy "Family members can read feedback"
  on public.nap_suggestion_feedback for select
  using (exists (
    select 1 from public.babies b
    where b.id = nap_suggestion_feedback.baby_id
      and (b.user_id = auth.uid() or b.family_id in (select get_user_family_ids(auth.uid())))
  ));

create policy "Caregivers can insert feedback"
  on public.nap_suggestion_feedback for insert
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.babies b
      where b.id = nap_suggestion_feedback.baby_id
        and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id))
    )
  );

-- 4. Family notes (mural / handoff)
create table if not exists public.family_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_family_notes_family on public.family_notes(family_id, created_at desc);
alter table public.family_notes enable row level security;

create policy "Members can read family notes"
  on public.family_notes for select
  using (family_id in (select get_user_family_ids(auth.uid())));

create policy "Caregivers can insert family notes"
  on public.family_notes for insert
  with check (author_id = auth.uid() and user_can_write_family(auth.uid(), family_id));

create policy "Author or owner can delete family notes"
  on public.family_notes for delete
  using (author_id = auth.uid() or family_id in (select get_user_owned_family_ids(auth.uid())));

-- 5. Email dispatch log (writes via service role; read own)
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  period_start date,
  period_end date,
  dedupe_key text unique,
  status text not null default 'sent',
  sent_at timestamptz not null default now()
);
alter table public.email_log enable row level security;

create policy "Users can read own email log"
  on public.email_log for select
  using (user_id = auth.uid());
;
