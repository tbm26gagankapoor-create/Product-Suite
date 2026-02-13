/**
 * AI Provider Fallback Service
 * Manages automatic failover between AI providers for reliability
 */

import { aiProvidersService, type AIProvider } from './ai-providers.service';
import { createAIClient } from '../lib/ai-multi-provider';

export interface FallbackAttempt {
  provider: AIProvider;
  attempt: number;
  error?: string;
  success: boolean;
  timestamp: Date;
}

export interface FallbackResult {
  success: boolean;
  response?: any;
  providerUsed: AIProvider;
  attempts: FallbackAttempt[];
  hadFallback: boolean;
}

class AIFallbackService {
  private fallbackHistory: FallbackAttempt[] = [];
  private maxHistorySize = 100;

  /**
   * Execute AI generation with automatic provider fallback
   * @param primaryProvider - The user's selected provider
   * @param generateFn - Function that performs the AI generation
   * @param maxFallbacks - Maximum number of fallback attempts (default: 3)
   */
  async executeWithFallback(
    primaryProvider: AIProvider | null,
    generateFn: (aiClient: any) => Promise<any>,
    maxFallbacks: number = 3
  ): Promise<FallbackResult> {
    const attempts: FallbackAttempt[] = [];
    const providers = await this.buildFallbackChain(primaryProvider, maxFallbacks);

    console.log('[AI Fallback] Starting generation with fallback chain:', {
      primary: primaryProvider?.display_name || 'None',
      chainLength: providers.length,
      providers: providers.map(p => p.display_name)
    });

    // Try each provider in the fallback chain
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isPrimary = i === 0;

      try {
        console.log(`[AI Fallback] Attempt ${i + 1}/${providers.length} using ${provider.display_name}${isPrimary ? ' (primary)' : ' (fallback)'}`);

        // Create AI client for this provider
        const aiClient = createAIClient({ provider });

        // Attempt generation
        const startTime = Date.now();
        const response = await generateFn(aiClient);
        const duration = Date.now() - startTime;

        // Success!
        const attempt: FallbackAttempt = {
          provider,
          attempt: i + 1,
          success: true,
          timestamp: new Date()
        };

        attempts.push(attempt);
        this.addToHistory(attempt);

        console.log(`[AI Fallback] ✅ Success with ${provider.display_name} (${duration}ms)`);

        return {
          success: true,
          response,
          providerUsed: provider,
          attempts,
          hadFallback: i > 0 // Had fallback if not first provider
        };

      } catch (error: any) {
        const attempt: FallbackAttempt = {
          provider,
          attempt: i + 1,
          error: error.message || 'Unknown error',
          success: false,
          timestamp: new Date()
        };

        attempts.push(attempt);
        this.addToHistory(attempt);

        console.warn(`[AI Fallback] ❌ Failed with ${provider.display_name}:`, error.message);

        // If this was the last provider, throw
        if (i === providers.length - 1) {
          console.error('[AI Fallback] All providers failed. No more fallbacks available.');
          throw new Error(
            `All AI providers failed. Last error from ${provider.display_name}: ${error.message}`
          );
        }

        // Continue to next provider
        console.log(`[AI Fallback] Falling back to next provider...`);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('Unexpected fallback service error');
  }

  /**
   * Build a fallback chain of providers to try in order
   * @param primaryProvider - User's selected provider (tried first)
   * @param maxFallbacks - Maximum number of fallback providers
   */
  private async buildFallbackChain(
    primaryProvider: AIProvider | null,
    maxFallbacks: number
  ): Promise<AIProvider[]> {
    const allProviders = await aiProvidersService.getAvailableProviders();
    const defaultProvider = await aiProvidersService.getDefaultProvider();

    const chain: AIProvider[] = [];
    const usedIds = new Set<string>();

    // 1. Add primary provider (user's selection)
    if (primaryProvider && primaryProvider.is_enabled) {
      chain.push(primaryProvider);
      usedIds.add(primaryProvider.id);
    }

    // 2. Add default provider if different from primary
    if (defaultProvider && !usedIds.has(defaultProvider.id)) {
      chain.push(defaultProvider);
      usedIds.add(defaultProvider.id);
    }

    // 3. Add other enabled providers up to maxFallbacks
    const remainingProviders = allProviders
      .filter(p => p.is_enabled && !usedIds.has(p.id))
      .sort((a, b) => {
        // Prefer providers with higher rate limits (more reliable)
        const aTokens = a.rate_limits?.tokens_per_minute || 0;
        const bTokens = b.rate_limits?.tokens_per_minute || 0;
        return bTokens - aTokens;
      });

    for (const provider of remainingProviders) {
      if (chain.length >= maxFallbacks + 1) break; // +1 for primary
      chain.push(provider);
      usedIds.add(provider.id);
    }

    return chain;
  }

  /**
   * Add attempt to history (with size limit)
   */
  private addToHistory(attempt: FallbackAttempt): void {
    this.fallbackHistory.push(attempt);

    // Keep history size manageable
    if (this.fallbackHistory.length > this.maxHistorySize) {
      this.fallbackHistory.shift();
    }
  }

  /**
   * Get recent fallback history for debugging/monitoring
   */
  getHistory(limit: number = 20): FallbackAttempt[] {
    return this.fallbackHistory.slice(-limit);
  }

  /**
   * Get fallback statistics
   */
  getStats() {
    const total = this.fallbackHistory.length;
    const successful = this.fallbackHistory.filter(a => a.success).length;
    const failed = total - successful;

    // Count by provider
    const byProvider: Record<string, { success: number; failed: number }> = {};

    for (const attempt of this.fallbackHistory) {
      const name = attempt.provider.display_name;
      if (!byProvider[name]) {
        byProvider[name] = { success: 0, failed: 0 };
      }

      if (attempt.success) {
        byProvider[name].success++;
      } else {
        byProvider[name].failed++;
      }
    }

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : 'N/A',
      byProvider
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.fallbackHistory = [];
  }
}

// Export singleton instance
export const aiFallbackService = new AIFallbackService();
