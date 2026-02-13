-- Migration: Add Custom OpenAI-Compatible Provider Support
-- Allows users to add custom AI endpoints (LM Studio, Ollama, vLLM, etc.)

-- Add custom provider template
INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, is_enabled, config) VALUES
('custom_openai', 'Custom (OpenAI Compatible)', 'openai_compatible', NULL, false,
 '{"requires_api_key": false, "description": "Any OpenAI-compatible API endpoint (LM Studio, Ollama, vLLM, etc.)"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add common self-hosted options
INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, is_enabled, config) VALUES
('ollama', 'Ollama (Local)', 'openai_compatible', 'http://localhost:11434/v1', false,
 '{"requires_api_key": false, "description": "Local Ollama server"}'::jsonb),
('lmstudio', 'LM Studio (Local)', 'openai_compatible', 'http://localhost:1234/v1', false,
 '{"requires_api_key": false, "description": "Local LM Studio server"}'::jsonb),
('vllm', 'vLLM Server', 'openai_compatible', 'http://localhost:8000/v1', false,
 '{"requires_api_key": false, "description": "vLLM OpenAI-compatible server"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add common cloud providers with OpenAI-compatible APIs
INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, is_enabled, config) VALUES
('openrouter', 'OpenRouter', 'openai_compatible', 'https://openrouter.ai/api/v1', false,
 '{"requires_api_key": true, "description": "OpenRouter - Access multiple AI providers"}'::jsonb),
('deepseek', 'DeepSeek', 'openai_compatible', 'https://api.deepseek.com/v1', false,
 '{"requires_api_key": true, "description": "DeepSeek AI API"}'::jsonb),
('mistral', 'Mistral AI', 'openai_compatible', 'https://api.mistral.ai/v1', false,
 '{"requires_api_key": true, "description": "Mistral AI API"}'::jsonb),
('fireworks', 'Fireworks AI', 'openai_compatible', 'https://api.fireworks.ai/inference/v1', false,
 '{"requires_api_key": true, "description": "Fireworks AI API"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add ability to create custom providers
-- Add column for user-created providers
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Update existing providers to mark as system providers
UPDATE ai_providers SET is_custom = false WHERE is_custom IS NULL;
