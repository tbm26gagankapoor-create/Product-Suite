-- Migration: Domain Whitelist for Tenant Signup
-- Description: Restrict SSO signups to whitelisted domains only

-- Domain whitelist table
-- Only users from whitelisted domains/Entra tenants can sign up
CREATE TABLE IF NOT EXISTS domain_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Domain name (e.g., 'contoso.com') or Entra tenant ID
    domain VARCHAR(255) NOT NULL,
    domain_type VARCHAR(50) NOT NULL DEFAULT 'email_domain', -- 'email_domain' or 'entra_tenant'

    -- Optional: Link to a specific tenant for auto-assignment
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    notes TEXT,
    added_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(domain, domain_type)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_domain_whitelist_domain ON domain_whitelist(LOWER(domain)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_domain_whitelist_tenant ON domain_whitelist(tenant_id) WHERE tenant_id IS NOT NULL;

-- System setting to control whitelist mode
INSERT INTO system_settings (key, value, description, is_secret)
VALUES (
    'signup_domain_whitelist_enabled',
    'false',
    'When enabled, only users from whitelisted domains can sign up via SSO',
    false
)
ON CONFLICT (key) DO NOTHING;
