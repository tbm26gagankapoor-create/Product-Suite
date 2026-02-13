-- Migration: SSO Federation Configuration
-- Description: Add full SSO provider configuration with client secrets and multiple providers

-- Add client_secret column to sso_providers
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS client_secret_encrypted TEXT;

-- Add redirect_uri column
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS redirect_uri VARCHAR(500);

-- Add configuration JSON for provider-specific settings
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Remove UNIQUE constraint on provider_type to allow multiple providers of same type
-- (e.g., multiple Okta tenants)
ALTER TABLE sso_providers DROP CONSTRAINT IF EXISTS sso_providers_provider_type_key;

-- Add display order for UI
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add icon/logo URL
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);

-- Insert additional provider templates (disabled by default)
INSERT INTO sso_providers (provider_type, name, display_name, is_enabled, scopes, icon_url, display_order)
VALUES
    ('google_workspace', 'Google Workspace', 'Sign in with Google', false,
     'openid profile email', 'https://www.google.com/favicon.ico', 2),
    ('okta', 'Okta', 'Sign in with Okta', false,
     'openid profile email', 'https://www.okta.com/favicon.ico', 3)
ON CONFLICT DO NOTHING;

-- Update Entra ID provider with icon
UPDATE sso_providers
SET icon_url = 'https://login.microsoftonline.com/favicon.ico', display_order = 1
WHERE provider_type = 'entra_id';
