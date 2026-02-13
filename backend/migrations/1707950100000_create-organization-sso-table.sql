-- Migration: Create organization_sso table
-- Stores SSO configuration for organizations using Entra ID

CREATE TABLE organization_sso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(100) NOT NULL,
  sso_provider_id UUID REFERENCES sso_providers(id),
  tenant_id VARCHAR(255) NOT NULL, -- Azure AD tenant ID

  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_provision_users BOOLEAN NOT NULL DEFAULT true,
  default_role VARCHAR(50) NOT NULL DEFAULT 'member',

  -- Group-based role mapping
  -- Maps Azure AD group IDs to application roles
  group_role_mappings JSONB DEFAULT '{"admin": [], "manager": [], "member": []}',

  -- Domain restrictions
  allowed_domains TEXT[], -- Restrict to specific email domains

  -- Admin consent
  admin_consent_granted BOOLEAN DEFAULT false,
  admin_consent_granted_at TIMESTAMPTZ,
  admin_consent_granted_by VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, sso_provider_id)
);

-- Indexes
CREATE INDEX idx_organization_sso_org_id ON organization_sso(organization_id);
CREATE INDEX idx_organization_sso_tenant_id ON organization_sso(tenant_id);
CREATE INDEX idx_organization_sso_enabled ON organization_sso(is_enabled) WHERE is_enabled = true;

-- Add to users table: Entra ID identifier
ALTER TABLE users ADD COLUMN IF NOT EXISTS entra_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_entra_id ON users(entra_id) WHERE entra_id IS NOT NULL;

-- Comment
COMMENT ON TABLE organization_sso IS 'SSO configuration for organizations using Azure AD/Entra ID with auto-provisioning support';
COMMENT ON COLUMN organization_sso.group_role_mappings IS 'Maps Azure AD group IDs to application roles (admin, manager, member)';
COMMENT ON COLUMN organization_sso.auto_provision_users IS 'Automatically create user accounts when they sign in via SSO for the first time';
