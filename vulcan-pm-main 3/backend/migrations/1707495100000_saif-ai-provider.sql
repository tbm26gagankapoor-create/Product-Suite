-- Migration: Add Saif AI Provider (iamsaif.ai)
-- Pre-configured OpenAI-compatible provider

INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, api_key_encrypted, is_enabled, is_default, config) VALUES
('saif', 'Saif AI', 'openai_compatible', 'https://model.iamsaif.ai/v1', 'sk-2EWWD0Pcv0EPEqXZelsd5w', true, true,
 '{"requires_api_key": true, "default_model": "Qwen/Qwen3-VL-235B-A22B-Instruct", "description": "Saif AI - Hosted AI models"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  api_endpoint = EXCLUDED.api_endpoint,
  api_key_encrypted = EXCLUDED.api_key_encrypted,
  is_enabled = EXCLUDED.is_enabled,
  is_default = EXCLUDED.is_default,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Add default model for Saif
INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, is_enabled, capabilities)
SELECT id, 'Qwen/Qwen3-VL-235B-A22B-Instruct', 'Qwen3 VL 235B Instruct', 'chat', 131072, 16384, 0, 0, true, '["vision", "streaming"]'::jsonb
FROM ai_providers WHERE name = 'saif'
ON CONFLICT (provider_id, model_id) DO NOTHING;
