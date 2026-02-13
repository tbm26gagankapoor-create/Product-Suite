/**
 * AI Client Service
 * Backend AI client for text generation using configured AI providers
 * Used by research service for synthesis
 */

import { query } from '../db/postgres/client.js';

interface AIProvider {
  id: string;
  provider_type: string;
  name: string;
  api_endpoint: string;
  api_key: string;
  model_name: string;
  config: any;
}

interface GenerateTextOptions {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

// Cache for AI providers (60 second TTL)
let providerCache: { provider: AIProvider; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export const aiClientService = {
  /**
   * Get first enabled AI provider
   */
  async getEnabledProvider(): Promise<AIProvider | null> {
    // Check cache first
    if (providerCache && (Date.now() - providerCache.timestamp) < CACHE_TTL) {
      return providerCache.provider;
    }

    try {
      const result = await query(
        `SELECT * FROM ai_providers WHERE is_enabled = true ORDER BY display_order LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.warn('[AI Client] No enabled AI providers found');
        return null;
      }

      const row = result.rows[0];
      const provider: AIProvider = {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        api_endpoint: row.api_endpoint,
        api_key: row.api_key_encrypted || '', // In production, decrypt this
        model_name: row.model_name || 'gpt-3.5-turbo',
        config: row.config || {}
      };

      // Cache the provider
      providerCache = { provider, timestamp: Date.now() };

      return provider;
    } catch (error: any) {
      console.error('[AI Client] Error fetching provider:', error.message);
      return null;
    }
  },

  /**
   * Generate text using AI provider
   */
  async generateText(options: GenerateTextOptions): Promise<string> {
    const provider = await this.getEnabledProvider();

    if (!provider) {
      throw new Error('No AI provider configured. Please configure an AI provider in the admin portal.');
    }

    const {
      prompt,
      max_tokens = 1000,
      temperature = 0.7,
      model
    } = options;

    try {
      // Use OpenAI-compatible API format (works with most providers)
      const response = await fetch(provider.api_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          model: model || provider.model_name,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens,
          temperature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Extract response text
      const text = data.choices?.[0]?.message?.content || '';

      if (!text) {
        throw new Error('AI provider returned empty response');
      }

      return text;

    } catch (error: any) {
      console.error('[AI Client] Generation failed:', error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  },

  /**
   * Clear provider cache
   */
  clearCache(): void {
    providerCache = null;
    console.log('[AI Client] Provider cache cleared');
  }
};

// Export for use in research service
export const aiGenerationService = aiClientService;
