-- Step 1: Create tables WITHOUT cross-referencing policies

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Familia',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can insert family" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'caregiver' CHECK (role IN ('owner','caregiver','viewer')),
  display_name TEXT,
  email TEXT,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read family_members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Self or owner can insert members" ON family_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id
        AND fm2.user_id = auth.uid()
        AND fm2.role = 'owner'
    )
  );

CREATE POLICY "Owner can update member roles" ON family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id
        AND fm2.user_id = auth.uid()
        AND fm2.role = 'owner'
    )
  );

CREATE POLICY "Self or owner can delete members" ON family_members
  FOR DELETE USING (
    auth.uid() = family_members.user_id
    OR EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id
        AND fm2.user_id = auth.uid()
        AND fm2.role = 'owner'
    )
  );

-- Now add cross-reference policies on families (family_members exists now)
CREATE POLICY "Members can read family" ON families
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = families.id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update family" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = families.id
        AND fm.user_id = auth.uid()
        AND fm.role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  role TEXT NOT NULL DEFAULT 'caregiver' CHECK (role IN ('caregiver','viewer')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_family_invites_token ON family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON family_invites(family_id);

ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invite by token" ON family_invites
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage invites" ON family_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_invites.family_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'owner'
    )
  );;
