-- Migration: AI Providers Configuration
-- Tables: ai_providers, ai_provider_models

-- =====================================================
-- AI PROVIDERS (Global AI service configurations)
-- =====================================================
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- openai, anthropic, google, azure, custom
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    is_enabled BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}', -- provider-specific config (org_id, project_id, etc.)
    rate_limits JSONB DEFAULT '{"requests_per_minute": 60, "tokens_per_minute": 100000}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_providers_type ON ai_providers(provider_type);
CREATE INDEX idx_ai_providers_enabled ON ai_providers(is_enabled);

-- =====================================================
-- AI PROVIDER MODELS (Available models per provider)
-- =====================================================
CREATE TABLE ai_provider_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL, -- gpt-4, claude-3-opus, gemini-pro, etc.
    display_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- chat, completion, embedding, image, audio
    context_window INTEGER DEFAULT 4096,
    max_output_tokens INTEGER DEFAULT 4096,
    input_cost_per_1k DECIMAL(10, 6) DEFAULT 0,
    output_cost_per_1k DECIMAL(10, 6) DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '[]', -- ["function_calling", "vision", "streaming"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, model_id)
);

CREATE INDEX idx_ai_models_provider ON ai_provider_models(provider_id);
CREATE INDEX idx_ai_models_type ON ai_provider_models(model_type);

-- =====================================================
-- SYSTEM SETTINGS (Global SaaS configuration)
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(key);

-- =====================================================
-- ADMIN USERS (Super admins for SaaS management)
-- =====================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- nullable for SSO-only users
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);

-- =====================================================
-- AUDIT LOG (Track admin actions)
-- =====================================================
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);

-- =====================================================
-- DEFAULT AI PROVIDERS
-- =====================================================
INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, is_enabled) VALUES
('openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', false),
('anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com/v1', false),
('google', 'Google AI', 'google', 'https://generativelanguage.googleapis.com/v1beta', false),
('azure_openai', 'Azure OpenAI', 'azure', NULL, false),
('groq', 'Groq', 'groq', 'https://api.groq.com/openai/v1', false),
('together', 'Together AI', 'together', 'https://api.together.xyz/v1', false);

-- =====================================================
-- DEFAULT MODELS FOR OPENAI
-- =====================================================
INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'gpt-4o', 'GPT-4o', 'chat', 128000, 16384, 0.005, 0.015, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'openai';

INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'gpt-4o-mini', 'GPT-4o Mini', 'chat', 128000, 16384, 0.00015, 0.0006, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'openai';

INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'gpt-4-turbo', 'GPT-4 Turbo', 'chat', 128000, 4096, 0.01, 0.03, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'openai';

-- =====================================================
-- DEFAULT MODELS FOR ANTHROPIC
-- =====================================================
INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'chat', 200000, 8192, 0.003, 0.015, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'anthropic';

INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'claude-3-opus-20240229', 'Claude 3 Opus', 'chat', 200000, 4096, 0.015, 0.075, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'anthropic';

INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'claude-3-haiku-20240307', 'Claude 3 Haiku', 'chat', 200000, 4096, 0.00025, 0.00125, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'anthropic';

-- =====================================================
-- DEFAULT MODELS FOR GOOGLE
-- =====================================================
INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'chat', 1000000, 8192, 0.00125, 0.005, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'google';

INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, capabilities)
SELECT id, 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'chat', 1000000, 8192, 0.000075, 0.0003, '["function_calling", "vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'google';

-- =====================================================
-- DEFAULT SYSTEM SETTINGS
-- =====================================================
INSERT INTO system_settings (key, value, description) VALUES
('app_name', '"Infinia Platform"', 'Application display name'),
('support_email', '"support@infinia.app"', 'Support email address'),
('default_plan', '"free"', 'Default plan for new tenants'),
('signup_enabled', 'true', 'Allow new user signups'),
('require_email_verification', 'false', 'Require email verification for new users'),
('max_tenants', '1000', 'Maximum number of tenants'),
('maintenance_mode', 'false', 'Enable maintenance mode');
