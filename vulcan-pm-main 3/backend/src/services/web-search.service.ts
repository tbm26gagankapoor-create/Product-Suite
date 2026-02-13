/**
 * Web Search Service - Multi-provider search abstraction
 * Supports Tavily, Serper, and Brave Search APIs
 */

import { searchProvidersRepository, SearchProvider } from '../db/postgres/repositories/search-providers.repository.js';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface ProviderConfig {
  name: string;
  providerType: string;
  apiKey: string;
  apiEndpoint: string;
  maxResults: number;
  config: Record<string, any>;
}

class WebSearchService {
  private cachedProvider: SearchProvider | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 60s cache

  clearCache(): void {
    this.cachedProvider = null;
    this.cacheExpiry = 0;
  }

  private async getProviderConfig(): Promise<ProviderConfig | null> {
    const now = Date.now();

    if (this.cachedProvider && now < this.cacheExpiry) {
      return this.extractConfig(this.cachedProvider);
    }

    const provider = await searchProvidersRepository.findDefault();
    if (!provider) {
      const enabled = await searchProvidersRepository.findEnabled();
      if (enabled.length === 0) return null;
      this.cachedProvider = enabled[0];
    } else {
      this.cachedProvider = provider;
    }

    this.cacheExpiry = now + this.CACHE_TTL;
    return this.extractConfig(this.cachedProvider);
  }

  private extractConfig(provider: SearchProvider): ProviderConfig | null {
    if (!provider.api_key_encrypted) {
      console.warn(`Search provider ${provider.name} requires an API key but none is configured`);
      return null;
    }

    return {
      name: provider.name,
      providerType: provider.provider_type,
      apiKey: provider.api_key_encrypted,
      apiEndpoint: provider.api_endpoint || '',
      maxResults: (provider.config?.max_results as number) || 5,
      config: provider.config || {},
    };
  }

  async isAvailable(): Promise<boolean> {
    const config = await this.getProviderConfig();
    return config !== null;
  }

  async search(query: string): Promise<SearchResult[]> {
    const config = await this.getProviderConfig();
    if (!config) {
      throw new Error('No search provider configured. Please configure a search provider in the admin panel.');
    }

    switch (config.providerType) {
      case 'tavily':
        return this.searchTavily(config, query);
      case 'serper':
        return this.searchSerper(config, query);
      case 'brave':
        return this.searchBrave(config, query);
      default:
        throw new Error(`Unsupported search provider type: ${config.providerType}`);
    }
  }

  async searchMultiple(queries: string[]): Promise<{ query: string; results: SearchResult[] }[]> {
    const results = await Promise.all(
      queries.map(async (q) => {
        try {
          const results = await this.search(q);
          return { query: q, results };
        } catch (error) {
          console.error(`Search failed for query "${q}":`, error);
          return { query: q, results: [] };
        }
      })
    );
    return results;
  }

  private async searchTavily(config: ProviderConfig, searchQuery: string): Promise<SearchResult[]> {
    const response = await fetch(config.apiEndpoint || 'https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        api_key: config.apiKey,
        query: searchQuery,
        search_depth: config.config.search_depth || 'basic',
        max_results: config.maxResults,
        include_answer: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily search failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as {
      results?: { title: string; url: string; content: string; score?: number }[];
    };

    return (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }));
  }

  private async searchSerper(config: ProviderConfig, searchQuery: string): Promise<SearchResult[]> {
    const response = await fetch(config.apiEndpoint || 'https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        q: searchQuery,
        num: config.maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper search failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as {
      organic?: { title: string; link: string; snippet: string; position?: number }[];
    };

    return (data.organic || []).slice(0, config.maxResults).map((r, i) => ({
      title: r.title,
      url: r.link,
      content: r.snippet,
      score: r.position ? 1 - (r.position / 10) : 1 - (i / config.maxResults),
    }));
  }

  private async searchBrave(config: ProviderConfig, searchQuery: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: searchQuery,
      count: String(config.maxResults),
    });

    const response = await fetch(
      `${config.apiEndpoint || 'https://api.search.brave.com/res/v1/web/search'}?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': config.apiKey,
        },
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave search failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as {
      web?: { results?: { title: string; url: string; description: string }[] };
    };

    return (data.web?.results || []).slice(0, config.maxResults).map((r, i) => ({
      title: r.title,
      url: r.url,
      content: r.description,
      score: 1 - (i / config.maxResults),
    }));
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    try {
      const startTime = Date.now();
      const results = await this.search('test');
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: `Search returned ${results.length} results`,
        latencyMs,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }
}

export const webSearchService = new WebSearchService();
export default webSearchService;
