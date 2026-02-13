-- Git Providers Migration
-- Adds support for GitHub, GitLab, and Bitbucket integration

-- Git Providers (admin-configured OAuth apps)
CREATE TABLE IF NOT EXISTS git_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,  -- github, gitlab, bitbucket
    oauth_client_id VARCHAR(255),
    oauth_client_secret_encrypted TEXT,
    oauth_scopes VARCHAR(500),
    api_base_url VARCHAR(500),
    auth_url VARCHAR(500),
    token_url VARCHAR(500),
    is_enabled BOOLEAN DEFAULT false,
    is_oauth_configured BOOLEAN DEFAULT false,
    icon_url VARCHAR(500),
    config JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_git_providers_type ON git_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_git_providers_enabled ON git_providers(is_enabled);
CREATE INDEX IF NOT EXISTS idx_git_providers_name ON git_providers(name);

-- User Git Tokens (per-user OAuth or PAT credentials)
CREATE TABLE IF NOT EXISTS user_git_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES git_providers(id) ON DELETE CASCADE,
    auth_type VARCHAR(20) NOT NULL,  -- 'oauth' or 'pat'
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes VARCHAR(500),
    provider_user_id VARCHAR(255),
    provider_username VARCHAR(255),
    provider_email VARCHAR(255),
    provider_avatar_url VARCHAR(500),
    is_valid BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_user_git_tokens_user ON user_git_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_git_tokens_provider ON user_git_tokens(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_git_tokens_valid ON user_git_tokens(is_valid);

-- Insert default Git providers (without OAuth configured)
INSERT INTO git_providers (name, display_name, provider_type, api_base_url, auth_url, token_url, oauth_scopes, icon_url, display_order) VALUES
(
    'github',
    'GitHub',
    'github',
    'https://api.github.com',
    'https://github.com/login/oauth/authorize',
    'https://github.com/login/oauth/access_token',
    'repo read:user',
    'https://github.githubassets.com/favicons/favicon.svg',
    1
),
(
    'gitlab',
    'GitLab',
    'gitlab',
    'https://gitlab.com/api/v4',
    'https://gitlab.com/oauth/authorize',
    'https://gitlab.com/oauth/token',
    'api read_user read_repository write_repository',
    'https://gitlab.com/favicon.ico',
    2
),
(
    'bitbucket',
    'Bitbucket',
    'bitbucket',
    'https://api.bitbucket.org/2.0',
    'https://bitbucket.org/site/oauth2/authorize',
    'https://bitbucket.org/site/oauth2/access_token',
    'repository:write account',
    'https://bitbucket.org/favicon.ico',
    3
)
ON CONFLICT (name) DO NOTHING;
