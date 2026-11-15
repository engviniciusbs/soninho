-- Bottle feedings: quick log, no live timer
create table public.bottle_feedings (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  start_time timestamptz not null,
  volume_ml numeric not null check (volume_ml > 0),
  milk_type text not null check (milk_type in ('FORMULA','BREAST_MILK','MIXED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Breastfeeding sessions: live timer, dual-side accumulation
create table public.breastfeeding_sessions (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  side_left_sec integer not null default 0 check (side_left_sec >= 0),
  side_right_sec integer not null default 0 check (side_right_sec >= 0),
  last_side text check (last_side in ('LEFT','RIGHT')),
  duration_min integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Solid feedings: food tags + reaction
create table public.solid_feedings (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  start_time timestamptz not null,
  food_tags text[] not null default '{}',
  reaction text check (reaction in ('LOVED','LIKED','NEUTRAL','DISLIKED','ALLERGIC_REACTION')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Family activity feed for feeding events (parallels sleep_activity_log)
create table public.feeding_activity_log (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  actor_name text,
  actor_relation text,
  action text not null check (action in ('started','stopped','logged')),
  feeding_type text not null check (feeding_type in ('BOTTLE','BREAST','SOLID')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index idx_bottle_feedings_baby_time on public.bottle_feedings (baby_id, start_time desc);
create index idx_breastfeeding_sessions_baby_time on public.breastfeeding_sessions (baby_id, start_time desc);
create index idx_breastfeeding_sessions_active on public.breastfeeding_sessions (baby_id) where end_time is null;
create index idx_solid_feedings_baby_time on public.solid_feedings (baby_id, start_time desc);
create index idx_feeding_activity_log_baby_time on public.feeding_activity_log (baby_id, created_at desc);

-- Reuse the same duration/updated_at trigger function as sleep_sessions
create trigger calculate_breastfeeding_duration
  before insert or update on public.breastfeeding_sessions
  for each row execute function calculate_duration();

create or replace function public.set_bottle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_bottle_feedings_updated_at
  before update on public.bottle_feedings
  for each row execute function public.set_bottle_updated_at();

create trigger set_solid_feedings_updated_at
  before update on public.solid_feedings
  for each row execute function public.set_bottle_updated_at();

alter table public.bottle_feedings enable row level security;
alter table public.breastfeeding_sessions enable row level security;
alter table public.solid_feedings enable row level security;
alter table public.feeding_activity_log enable row level security;

-- bottle_feedings policies
create policy "Family members can read bottle feedings" on public.bottle_feedings
  for select using (
    exists (select 1 from babies b where b.id = bottle_feedings.baby_id
      and (b.user_id = auth.uid() or b.family_id in (select get_user_family_ids(auth.uid()))))
  );
create policy "Caregivers and owners can insert bottle feedings" on public.bottle_feedings
  for insert with check (
    exists (select 1 from babies b where b.id = bottle_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can update bottle feedings" on public.bottle_feedings
  for update using (
    exists (select 1 from babies b where b.id = bottle_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can delete bottle feedings" on public.bottle_feedings
  for delete using (
    exists (select 1 from babies b where b.id = bottle_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );

-- breastfeeding_sessions policies
create policy "Family members can read breastfeeding sessions" on public.breastfeeding_sessions
  for select using (
    exists (select 1 from babies b where b.id = breastfeeding_sessions.baby_id
      and (b.user_id = auth.uid() or b.family_id in (select get_user_family_ids(auth.uid()))))
  );
create policy "Caregivers and owners can insert breastfeeding sessions" on public.breastfeeding_sessions
  for insert with check (
    exists (select 1 from babies b where b.id = breastfeeding_sessions.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can update breastfeeding sessions" on public.breastfeeding_sessions
  for update using (
    exists (select 1 from babies b where b.id = breastfeeding_sessions.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can delete breastfeeding sessions" on public.breastfeeding_sessions
  for delete using (
    exists (select 1 from babies b where b.id = breastfeeding_sessions.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );

-- solid_feedings policies
create policy "Family members can read solid feedings" on public.solid_feedings
  for select using (
    exists (select 1 from babies b where b.id = solid_feedings.baby_id
      and (b.user_id = auth.uid() or b.family_id in (select get_user_family_ids(auth.uid()))))
  );
create policy "Caregivers and owners can insert solid feedings" on public.solid_feedings
  for insert with check (
    exists (select 1 from babies b where b.id = solid_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can update solid feedings" on public.solid_feedings
  for update using (
    exists (select 1 from babies b where b.id = solid_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );
create policy "Caregivers and owners can delete solid feedings" on public.solid_feedings
  for delete using (
    exists (select 1 from babies b where b.id = solid_feedings.baby_id
      and (b.user_id = auth.uid() or user_can_write_family(auth.uid(), b.family_id)))
  );

-- feeding_activity_log policies (mirrors sleep_activity_log)
create policy "Family members can read feeding activity" on public.feeding_activity_log
  for select using (
    baby_id in (select b.id from babies b where
      (b.family_id in (select get_user_family_ids(auth.uid()))) or b.user_id = auth.uid())
  );
create policy "Caregivers can insert feeding activity" on public.feeding_activity_log
  for insert with check (
    actor_user_id = auth.uid() and
    baby_id in (select b.id from babies b where
      ((b.family_id is not null and user_can_write_family(auth.uid(), b.family_id)) or b.user_id = auth.uid()))
  );
;
