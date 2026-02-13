-- Migration: Tenant SSO with Microsoft Entra ID
-- Description: Add SSO configuration for multi-tenant authentication with admin consent

-- SSO Provider configurations (system-wide)
CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(50) NOT NULL UNIQUE, -- 'entra_id', 'okta', 'google_workspace'
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_enabled BOOLEAN DEFAULT false,

    -- OAuth/OIDC settings
    client_id VARCHAR(255),
    -- client_secret stored encrypted in system_settings

    -- For multi-tenant: 'common', for single tenant: specific tenant ID
    tenant_id VARCHAR(255) DEFAULT 'common',

    -- OIDC Discovery
    issuer_url VARCHAR(500),
    authorization_endpoint VARCHAR(500),
    token_endpoint VARCHAR(500),
    userinfo_endpoint VARCHAR(500),

    -- Scopes to request
    scopes VARCHAR(500) DEFAULT 'openid profile email',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations that have completed admin consent (Entra ID tenants)
CREATE TABLE IF NOT EXISTS sso_org_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES sso_providers(id) ON DELETE CASCADE,

    -- Entra ID tenant info
    entra_tenant_id VARCHAR(255) NOT NULL, -- Azure AD tenant ID
    organization_name VARCHAR(255),
    verified_domains JSONB DEFAULT '[]'::jsonb, -- Verified domains for this org

    -- Link to our tenant (auto-provisioned or manually linked)
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

    -- Consent details
    consented_by_email VARCHAR(255),
    consented_by_name VARCHAR(255),
    consented_by_oid VARCHAR(255), -- Entra object ID of admin who consented
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Settings
    is_active BOOLEAN DEFAULT true,
    auto_provision_users BOOLEAN DEFAULT true, -- Auto-create users on first login
    default_role VARCHAR(50) DEFAULT 'Member',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(provider_id, entra_tenant_id)
);

-- Add SSO fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50); -- 'entra_id', etc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_subject_id VARCHAR(255); -- Entra object ID (oid)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_tenant_id VARCHAR(255); -- Entra tenant ID (tid)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'password'; -- 'password', 'sso', 'both'

-- Make password optional for SSO-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Indexes for SSO lookups
CREATE INDEX IF NOT EXISTS idx_users_sso ON users(sso_provider, sso_subject_id) WHERE sso_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_sso_tenant ON users(sso_tenant_id) WHERE sso_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sso_org_consents_entra ON sso_org_consents(entra_tenant_id);
CREATE INDEX IF NOT EXISTS idx_sso_org_consents_tenant ON sso_org_consents(tenant_id);

-- Insert Entra ID provider (disabled by default, configure via admin portal)
INSERT INTO sso_providers (provider_type, name, display_name, is_enabled, tenant_id, scopes)
VALUES (
    'entra_id',
    'Microsoft Entra ID',
    'Sign in with Microsoft',
    false,
    'common',
    'openid profile email User.Read'
)
ON CONFLICT (provider_type) DO NOTHING;
