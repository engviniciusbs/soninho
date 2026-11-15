-- Family relation label on members (pai, mãe, avô, etc.)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS family_relation text;

-- Optional relation suggested on invite
ALTER TABLE public.family_invites
  ADD COLUMN IF NOT EXISTS family_relation text;

-- User profiles (display + UI mode)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  family_relation text,
  ui_mode text NOT NULL DEFAULT 'standard' CHECK (ui_mode IN ('standard', 'nanny')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can read co-member profiles"
  ON public.user_profiles FOR SELECT
  USING (
    user_id IN (
      SELECT fm.user_id FROM public.family_members fm
      WHERE fm.family_id IN (SELECT get_user_family_ids(auth.uid()))
    )
  );

-- Sleep activity log (who started/stopped)
CREATE TABLE IF NOT EXISTS public.sleep_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text,
  actor_relation text,
  action text NOT NULL CHECK (action IN ('started', 'stopped')),
  sleep_session_id uuid REFERENCES public.sleep_sessions(id) ON DELETE SET NULL,
  sleep_type text CHECK (sleep_type IN ('NAP', 'NIGHT_SLEEP')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sleep_activity_log_baby_created_idx
  ON public.sleep_activity_log (baby_id, created_at DESC);

ALTER TABLE public.sleep_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read sleep activity"
  ON public.sleep_activity_log FOR SELECT
  USING (
    baby_id IN (
      SELECT b.id FROM public.babies b
      WHERE b.family_id IN (SELECT get_user_family_ids(auth.uid()))
         OR b.user_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers can insert sleep activity"
  ON public.sleep_activity_log FOR INSERT
  WITH CHECK (
    actor_user_id = auth.uid()
    AND baby_id IN (
      SELECT b.id FROM public.babies b
      WHERE (
        b.family_id IS NOT NULL AND user_can_write_family(auth.uid(), b.family_id)
      ) OR b.user_id = auth.uid()
    )
  );

-- Members can update own family_relation
CREATE POLICY "Members can update own family relation"
  ON public.family_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
;
