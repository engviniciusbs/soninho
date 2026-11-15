-- Step 2: Add family_id to babies, data migration, update RLS

ALTER TABLE babies ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_babies_family ON babies(family_id);

-- Data migration
DO $$ 
DECLARE 
  r RECORD;
  new_family_id UUID;
BEGIN
  FOR r IN SELECT id, user_id, name FROM babies WHERE family_id IS NULL LOOP
    INSERT INTO families (name, created_by)
    VALUES (r.name || ' familia', r.user_id)
    RETURNING id INTO new_family_id;

    INSERT INTO family_members (family_id, user_id, role, display_name)
    VALUES (new_family_id, r.user_id, 'owner', NULL)
    ON CONFLICT (family_id, user_id) DO NOTHING;

    UPDATE babies SET family_id = new_family_id WHERE id = r.id;
  END LOOP;
END $$;

-- Drop old babies RLS and add family-aware ones
DROP POLICY IF EXISTS "Users can manage own babies" ON babies;
DROP POLICY IF EXISTS "Users manage own babies" ON babies;
DROP POLICY IF EXISTS "Users can read own babies" ON babies;
DROP POLICY IF EXISTS "Users can insert own babies" ON babies;
DROP POLICY IF EXISTS "Users can update own babies" ON babies;
DROP POLICY IF EXISTS "Users can delete own babies" ON babies;

CREATE POLICY "Family members can read babies" ON babies
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = babies.family_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert babies" ON babies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family owners and caregivers can update babies" ON babies
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = babies.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner','caregiver')
    )
  );

CREATE POLICY "Family owners can delete babies" ON babies
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = babies.family_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'owner'
    )
  );

-- Drop old sleep_sessions RLS and add family-aware ones
DROP POLICY IF EXISTS "Users can manage own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users manage own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can read own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can insert own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can update own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can delete own sleep sessions" ON sleep_sessions;

CREATE POLICY "Family members can read sessions" ON sleep_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM babies b
      JOIN family_members fm ON fm.family_id = b.family_id
      WHERE b.id = sleep_sessions.baby_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers and owners can insert sessions" ON sleep_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM babies b
      JOIN family_members fm ON fm.family_id = b.family_id
      WHERE b.id = sleep_sessions.baby_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner','caregiver')
    )
  );

CREATE POLICY "Caregivers and owners can update sessions" ON sleep_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM babies b
      JOIN family_members fm ON fm.family_id = b.family_id
      WHERE b.id = sleep_sessions.baby_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner','caregiver')
    )
  );

CREATE POLICY "Caregivers and owners can delete sessions" ON sleep_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM babies b
      JOIN family_members fm ON fm.family_id = b.family_id
      WHERE b.id = sleep_sessions.baby_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner','caregiver')
    )
  );;
