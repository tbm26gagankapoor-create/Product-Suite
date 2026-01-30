-- Migration: Organization Structure
-- Description: Adds multi-tenant organization support with data segregation
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CREATE ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================
-- 2. CREATE ORGANIZATION_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- ============================================
-- 3. CREATE ORGANIZATION_INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);

-- ============================================
-- 4. ADD organization_id TO EXISTING TABLES
-- ============================================

-- Add organization_id to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);

-- Add organization_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);

-- Add organization_id to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(organization_id);

-- ============================================
-- 5. UPDATE TRIGGERS FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for organizations table
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organizations: Only admins can update their organization
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Organization Members: Users can view members of their organization
CREATE POLICY "Users can view org members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organization Members: Only admins can manage members
CREATE POLICY "Admins can manage org members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Organization Invites: Admins can manage invites
CREATE POLICY "Admins can manage invites"
  ON organization_invites FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Projects: Update existing RLS to filter by organization
DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view org projects"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL -- Allow legacy projects without org
  );

DROP POLICY IF EXISTS "Users can manage projects" ON projects;
CREATE POLICY "Users can manage org projects"
  ON projects FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Teams: Update existing RLS to filter by organization
DROP POLICY IF EXISTS "Users can view teams" ON teams;
CREATE POLICY "Users can view org teams"
  ON teams FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

DROP POLICY IF EXISTS "Users can manage teams" ON teams;
CREATE POLICY "Users can manage org teams"
  ON teams FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- ============================================
-- 7. HELPER FUNCTION: Get User's Organization ID
-- ============================================

CREATE OR REPLACE FUNCTION get_user_organization_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 8. HELPER FUNCTION: Check if User is Org Admin
-- ============================================

CREATE OR REPLACE FUNCTION is_org_admin(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;
