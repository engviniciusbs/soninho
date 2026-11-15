-- Fix RLS infinite recursion: create SECURITY DEFINER helper functions
-- These bypass RLS so they don't recurse into the same policies

CREATE OR REPLACE FUNCTION public.get_user_family_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = uid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_owned_family_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = uid AND role = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_family(uid uuid, fid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE user_id = uid AND family_id = fid AND role IN ('owner', 'caregiver')
  );
$$;

-- ── Recreate family_members policies (no recursion) ──────────────────────────
DROP POLICY IF EXISTS "Members can read family_members" ON family_members;
DROP POLICY IF EXISTS "Self or owner can insert members" ON family_members;
DROP POLICY IF EXISTS "Owner can update member roles" ON family_members;
DROP POLICY IF EXISTS "Self or owner can delete members" ON family_members;

CREATE POLICY "Members can read family_members" ON family_members
  FOR SELECT USING (
    family_id IN (SELECT get_user_family_ids(auth.uid()))
  );

CREATE POLICY "Self or owner can insert members" ON family_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR family_id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

CREATE POLICY "Owner can update member roles" ON family_members
  FOR UPDATE USING (
    family_id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

CREATE POLICY "Self or owner can delete members" ON family_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR family_id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

-- ── Recreate families policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can read family" ON families;
DROP POLICY IF EXISTS "Owner can update family" ON families;
DROP POLICY IF EXISTS "Creator can insert family" ON families;

CREATE POLICY "Creator can insert family" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can read family" ON families
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT get_user_family_ids(auth.uid()))
  );

CREATE POLICY "Owner can update family" ON families
  FOR UPDATE USING (
    id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

-- ── Recreate family_invites policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read invite by token" ON family_invites;
DROP POLICY IF EXISTS "Owner can manage invites" ON family_invites;
DROP POLICY IF EXISTS "Members can read invites" ON family_invites;

CREATE POLICY "Anyone can read invite by token" ON family_invites
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage invites" ON family_invites
  FOR ALL USING (
    family_id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

-- ── Recreate babies policies (using helper function) ─────────────────────────
DROP POLICY IF EXISTS "Family members can read babies" ON babies;
DROP POLICY IF EXISTS "Family members can insert babies" ON babies;
DROP POLICY IF EXISTS "Family owners and caregivers can update babies" ON babies;
DROP POLICY IF EXISTS "Family owners can delete babies" ON babies;

CREATE POLICY "Family members can read babies" ON babies
  FOR SELECT USING (
    auth.uid() = user_id
    OR family_id IN (SELECT get_user_family_ids(auth.uid()))
  );

CREATE POLICY "Family members can insert babies" ON babies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family owners and caregivers can update babies" ON babies
  FOR UPDATE USING (
    auth.uid() = user_id
    OR user_can_write_family(auth.uid(), family_id)
  );

CREATE POLICY "Family owners can delete babies" ON babies
  FOR DELETE USING (
    auth.uid() = user_id
    OR family_id IN (SELECT get_user_owned_family_ids(auth.uid()))
  );

-- ── Recreate sleep_sessions policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Family members can read sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Caregivers and owners can insert sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Caregivers and owners can update sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Caregivers and owners can delete sessions" ON sleep_sessions;

CREATE POLICY "Family members can read sessions" ON sleep_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM babies b
      WHERE b.id = sleep_sessions.baby_id
        AND (
          b.user_id = auth.uid()
          OR b.family_id IN (SELECT get_user_family_ids(auth.uid()))
        )
    )
  );

CREATE POLICY "Caregivers and owners can insert sessions" ON sleep_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM babies b
      WHERE b.id = sleep_sessions.baby_id
        AND (
          b.user_id = auth.uid()
          OR user_can_write_family(auth.uid(), b.family_id)
        )
    )
  );

CREATE POLICY "Caregivers and owners can update sessions" ON sleep_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM babies b
      WHERE b.id = sleep_sessions.baby_id
        AND (
          b.user_id = auth.uid()
          OR user_can_write_family(auth.uid(), b.family_id)
        )
    )
  );

CREATE POLICY "Caregivers and owners can delete sessions" ON sleep_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM babies b
      WHERE b.id = sleep_sessions.baby_id
        AND (
          b.user_id = auth.uid()
          OR user_can_write_family(auth.uid(), b.family_id)
        )
    )
  );;
