/**
 * Multi-Provider AI Service
 * Fetches available AI providers from backend and manages provider selection
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string;
  is_enabled: boolean;
  is_default: boolean;
  config: {
    default_model?: string;
    description?: string;
    requires_api_key?: boolean;
  };
  rate_limits?: {
    tokens_per_minute: number;
    requests_per_minute: number;
  };
}

export interface AIProviderCache {
  providers: AIProvider[];
  defaultProvider: AIProvider | null;
  lastFetched: number;
  ttl: number; // Time to live in milliseconds
}

const CACHE_TTL = 60000; // 60 seconds

class AIProvidersService {
  private cache: AIProviderCache = {
    providers: [],
    defaultProvider: null,
    lastFetched: 0,
    ttl: CACHE_TTL,
  };

  /**
   * Get all available AI providers (with caching)
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.cache.providers.length > 0 && (now - this.cache.lastFetched) < this.cache.ttl) {
      console.log('[AI Providers] Using cached providers');
      return this.cache.providers;
    }

    try {
      console.log('[AI Providers] Fetching from API...');
      const response = await fetch(`${API_BASE}/projects/ai-providers`); // Public endpoint
      const data = await response.json();

      if (data?.success && Array.isArray(data.data)) {
        // Filter only enabled providers
        const enabledProviders = data.data.filter((p: AIProvider) => p.is_enabled);

        // Find default provider
        const defaultProvider = enabledProviders.find((p: AIProvider) => p.is_default) || enabledProviders[0] || null;

        // Update cache
        this.cache = {
          providers: enabledProviders,
          defaultProvider,
          lastFetched: now,
          ttl: CACHE_TTL,
        };

        console.log(`[AI Providers] Loaded ${enabledProviders.length} enabled providers`);
        return enabledProviders;
      }

      console.warn('[AI Providers] Invalid response format');
      return [];
    } catch (error: any) {
      console.error('[AI Providers] Failed to fetch providers:', error);

      // Return cached data even if expired (stale data better than no data)
      if (this.cache.providers.length > 0) {
        console.log('[AI Providers] Using stale cache due to error');
        return this.cache.providers;
      }

      // Fallback to hardcoded SAIF provider
      return this.getFallbackProvider();
    }
  }

  /**
   * Get default AI provider
   */
  async getDefaultProvider(): Promise<AIProvider> {
    await this.getAvailableProviders(); // Ensure cache is populated

    if (this.cache.defaultProvider) {
      return this.cache.defaultProvider;
    }

    // Fallback to first provider or hardcoded SAIF
    return this.cache.providers[0] || this.getFallbackProvider()[0];
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: string): Promise<AIProvider | null> {
    const providers = await this.getAvailableProviders();
    return providers.find(p => p.id === id) || null;
  }

  /**
   * Get provider by name
   */
  async getProviderByName(name: string): Promise<AIProvider | null> {
    const providers = await this.getAvailableProviders();
    return providers.find(p => p.name === name) || null;
  }

  /**
   * Clear cache (force refresh on next request)
   */
  clearCache(): void {
    this.cache = {
      providers: [],
      defaultProvider: null,
      lastFetched: 0,
      ttl: CACHE_TTL,
    };
    console.log('[AI Providers] Cache cleared');
  }

  /**
   * Get fallback provider (SAIF AI - hardcoded for reliability)
   */
  private getFallbackProvider(): AIProvider[] {
    return [{
      id: 'fallback-saif',
      name: 'saif',
      display_name: 'Saif AI (Fallback)',
      provider_type: 'openai_compatible',
      api_endpoint: import.meta.env.VITE_SAIF_API_BASE_URL || 'https://model.iamsaif.ai/v1',
      is_enabled: true,
      is_default: true,
      config: {
        default_model: import.meta.env.VITE_SAIF_MODEL || 'openai/gpt-oss-120b',
        description: 'Fallback provider when backend is unavailable',
        requires_api_key: true,
      },
      rate_limits: {
        tokens_per_minute: 100000,
        requests_per_minute: 60,
      },
    }];
  }

  /**
   * Test if a provider is reachable
   */
  async testProvider(providerId: string): Promise<boolean> {
    try {
      const provider = await this.getProviderById(providerId);
      if (!provider) return false;

      // Simple health check - just verify the endpoint is reachable
      const response = await fetch(provider.api_endpoint + '/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error(`[AI Providers] Provider ${providerId} unreachable:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const aiProvidersService = new AIProvidersService();
