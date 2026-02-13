-- Search Providers Migration
-- Adds support for web search providers (Tavily, Serper, Brave) for AI research

CREATE TABLE IF NOT EXISTS search_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,  -- tavily, serper, brave
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    is_enabled BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_providers_enabled ON search_providers(is_enabled);
CREATE INDEX IF NOT EXISTS idx_search_providers_default ON search_providers(is_default);
CREATE INDEX IF NOT EXISTS idx_search_providers_name ON search_providers(name);

-- Insert default search providers (disabled by default, need API keys)
INSERT INTO search_providers (name, display_name, provider_type, api_endpoint, config) VALUES
(
    'tavily',
    'Tavily',
    'tavily',
    'https://api.tavily.com/search',
    '{"search_depth": "basic", "max_results": 5, "description": "AI-optimized search engine with relevance scoring"}'
),
(
    'serper',
    'Serper',
    'serper',
    'https://google.serper.dev/search',
    '{"max_results": 5, "description": "Google Search API with structured results"}'
),
(
    'brave',
    'Brave Search',
    'brave',
    'https://api.search.brave.com/res/v1/web/search',
    '{"max_results": 5, "description": "Privacy-focused web search API"}'
)
ON CONFLICT (name) DO NOTHING;
