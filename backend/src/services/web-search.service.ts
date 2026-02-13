/**
 * Web Search Service
 * Multi-provider web search integration (Tavily, Serper, Brave Search)
 * Used for competitive research and market intelligence
 */

import { query } from '../db/postgres/client.js';

export interface SearchProvider {
  id: string;
  provider_type: 'tavily' | 'serper' | 'brave_search';
  name: string;
  display_name: string;
  is_enabled: boolean;
  api_key: string; // Decrypted
  api_endpoint: string;
  config: any;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  provider: string;
}

// Cache for search providers (60 second TTL)
let providersCache: Map<string, { provider: SearchProvider; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

export const webSearchService = {
  /**
   * Get search provider by type from database
   */
  async getProviderByType(providerType: 'tavily' | 'serper' | 'brave_search'): Promise<SearchProvider | null> {
    // Check cache first
    const cached = providersCache.get(providerType);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`[Search] Using cached provider: ${providerType}`);
      return cached.provider;
    }

    try {
      const result = await query(
        `SELECT * FROM search_providers WHERE provider_type = $1 AND is_enabled = true LIMIT 1`,
        [providerType]
      );

      if (result.rows.length === 0) {
        console.warn(`[Search] Provider not found or disabled: ${providerType}`);
        return null;
      }

      const row = result.rows[0];

      const provider: SearchProvider = {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        display_name: row.display_name,
        is_enabled: row.is_enabled,
        api_key: row.api_key_encrypted || '', // In production, decrypt this
        api_endpoint: row.api_endpoint,
        config: row.config || {}
      };

      // Cache the provider
      providersCache.set(providerType, { provider, timestamp: Date.now() });

      console.log(`[Search] Loaded provider from database: ${providerType}`);
      return provider;
    } catch (error: any) {
      console.error(`[Search] Error fetching provider ${providerType}:`, error.message);
      return null;
    }
  },

  /**
   * Get first enabled search provider
   */
  async getEnabledProvider(): Promise<SearchProvider | null> {
    try {
      const result = await query(
        `SELECT * FROM search_providers WHERE is_enabled = true ORDER BY display_order LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.warn('[Search] No enabled search providers found');
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        display_name: row.display_name,
        is_enabled: row.is_enabled,
        api_key: row.api_key_encrypted || '',
        api_endpoint: row.api_endpoint,
        config: row.config || {}
      };
    } catch (error: any) {
      console.error('[Search] Error fetching enabled provider:', error.message);
      return null;
    }
  },

  /**
   * Search using Tavily API
   */
  async searchTavily(query: string, options: { maxResults?: number } = {}): Promise<SearchResponse> {
    const provider = await this.getProviderByType('tavily');
    if (!provider) {
      throw new Error('Tavily search provider not configured');
    }

    const maxResults = options.maxResults || 10;

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        query,
        results: data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          publishedDate: r.published_date,
          score: r.score
        })),
        totalResults: data.results.length,
        provider: 'tavily'
      };
    } catch (error: any) {
      console.error('[Search] Tavily error:', error.message);
      throw new Error(`Tavily search failed: ${error.message}`);
    }
  },

  /**
   * Search using Serper API (Google Search)
   */
  async searchSerper(query: string, options: { maxResults?: number } = {}): Promise<SearchResponse> {
    const provider = await this.getProviderByType('serper');
    if (!provider) {
      throw new Error('Serper search provider not configured');
    }

    const maxResults = options.maxResults || 10;

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': provider.api_key
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        query,
        results: (data.organic || []).map((r: any) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          publishedDate: r.date
        })),
        totalResults: data.organic?.length || 0,
        provider: 'serper'
      };
    } catch (error: any) {
      console.error('[Search] Serper error:', error.message);
      throw new Error(`Serper search failed: ${error.message}`);
    }
  },

  /**
   * Search using Brave Search API
   */
  async searchBrave(query: string, options: { maxResults?: number } = {}): Promise<SearchResponse> {
    const provider = await this.getProviderByType('brave_search');
    if (!provider) {
      throw new Error('Brave search provider not configured');
    }

    const maxResults = options.maxResults || 10;

    try {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': provider.api_key
        }
      });

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        query,
        results: (data.web?.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
          publishedDate: r.age
        })),
        totalResults: data.web?.results?.length || 0,
        provider: 'brave_search'
      };
    } catch (error: any) {
      console.error('[Search] Brave error:', error.message);
      throw new Error(`Brave search failed: ${error.message}`);
    }
  },

  /**
   * Auto-search using first enabled provider
   */
  async search(query: string, options: { maxResults?: number; preferredProvider?: string } = {}): Promise<SearchResponse> {
    const { preferredProvider } = options;

    // Try preferred provider first
    if (preferredProvider) {
      const provider = await this.getProviderByType(preferredProvider as any);
      if (provider) {
        try {
          switch (preferredProvider) {
            case 'tavily':
              return await this.searchTavily(query, options);
            case 'serper':
              return await this.searchSerper(query, options);
            case 'brave_search':
              return await this.searchBrave(query, options);
          }
        } catch (error) {
          console.warn(`[Search] Preferred provider ${preferredProvider} failed, trying fallback`);
        }
      }
    }

    // Try providers in order: Tavily → Serper → Brave
    const providers: Array<'tavily' | 'serper' | 'brave_search'> = ['tavily', 'serper', 'brave_search'];

    for (const providerType of providers) {
      const provider = await this.getProviderByType(providerType);
      if (!provider) continue;

      try {
        switch (providerType) {
          case 'tavily':
            return await this.searchTavily(query, options);
          case 'serper':
            return await this.searchSerper(query, options);
          case 'brave_search':
            return await this.searchBrave(query, options);
        }
      } catch (error) {
        console.warn(`[Search] Provider ${providerType} failed, trying next provider`);
        continue;
      }
    }

    throw new Error('All search providers failed or none are configured');
  },

  /**
   * Clear provider cache
   */
  clearCache(): void {
    providersCache.clear();
    console.log('[Search] Provider cache cleared');
  }
};
