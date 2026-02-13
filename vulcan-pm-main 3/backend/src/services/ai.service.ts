/**
 * AI Service - Server-side AI integration
 * Supports:
 * - Public providers (OpenAI, Anthropic, Google, etc.)
 * - OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, OpenRouter, etc.)
 * - Custom self-hosted endpoints
 * API keys never exposed to frontend
 */

import { aiProvidersRepository, AIProvider } from '../db/postgres/repositories/ai-providers.repository.js';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerateRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  maxTokens?: number;
}

export interface AIGenerateResponse {
  text: string;
  model: string;
  provider?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ProviderConfig {
  name: string;
  providerType: string;
  apiKey: string | null;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  customHeaders?: Record<string, string>;
}

class AIService {
  private cachedProvider: AIProvider | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Clear the provider cache (useful after config changes)
   */
  clearCache(): void {
    this.cachedProvider = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get the active AI provider configuration
   */
  private async getProviderConfig(): Promise<ProviderConfig | null> {
    const now = Date.now();

    // Use cached provider if valid
    if (this.cachedProvider && now < this.cacheExpiry) {
      return this.extractConfig(this.cachedProvider);
    }

    // Fetch default enabled provider
    const provider = await aiProvidersRepository.findDefault();

    if (!provider) {
      // Fallback to first enabled provider
      const enabledProviders = await aiProvidersRepository.findEnabled();
      if (enabledProviders.length === 0) {
        return null;
      }
      this.cachedProvider = enabledProviders[0];
    } else {
      this.cachedProvider = provider;
    }

    this.cacheExpiry = now + this.CACHE_TTL;
    return this.extractConfig(this.cachedProvider);
  }

  private extractConfig(provider: AIProvider): ProviderConfig | null {
    // Check if API key is required for this provider
    const requiresApiKey = provider.config?.requires_api_key !== false;

    // For providers that require API key, validate it exists
    if (requiresApiKey && !provider.api_key_encrypted) {
      console.warn(`AI Provider ${provider.name} requires an API key but none is configured`);
      return null;
    }

    // Get base URL from provider or use default based on type
    let baseUrl: string = provider.api_endpoint || '';
    if (!baseUrl) {
      switch (provider.provider_type) {
        case 'openai':
          baseUrl = 'https://api.openai.com/v1';
          break;
        case 'anthropic':
          baseUrl = 'https://api.anthropic.com/v1';
          break;
        case 'google':
          baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
          break;
        case 'groq':
          baseUrl = 'https://api.groq.com/openai/v1';
          break;
        case 'together':
          baseUrl = 'https://api.together.xyz/v1';
          break;
        case 'openai_compatible':
        case 'custom':
        default:
          baseUrl = (provider.config?.base_url as string) || 'http://localhost:11434/v1';
      }
    }

    // Get default model from config or use provider default
    const defaultModel = (provider.config?.default_model as string) || this.getDefaultModelForProvider(provider.provider_type);

    // Get custom headers if specified
    const customHeaders = provider.config?.headers as Record<string, string> | undefined;

    return {
      name: provider.name,
      providerType: provider.provider_type,
      apiKey: provider.api_key_encrypted,
      baseUrl,
      defaultModel,
      requiresApiKey,
      customHeaders,
    };
  }

  private getDefaultModelForProvider(providerType: string): string {
    switch (providerType) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'google':
        return 'gemini-1.5-flash';
      case 'groq':
        return 'llama-3.1-70b-versatile';
      case 'together':
        return 'meta-llama/Llama-3-70b-chat-hf';
      case 'openai_compatible':
      case 'custom':
      default:
        return 'default';
    }
  }

  /**
   * Generate content using the configured AI provider
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const config = await this.getProviderConfig();

    if (!config) {
      throw new Error('No AI provider configured. Please configure an AI provider in the admin panel.');
    }

    const model = request.model || config.defaultModel;
    const temperature = request.temperature ?? 0.7;

    // Build messages array
    const messages = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add JSON instruction if needed
    if (request.responseFormat === 'json') {
      const systemMsgIndex = messages.findIndex(m => m.role === 'system');
      const jsonInstruction = '\n\nIMPORTANT: Respond strictly in valid JSON format without markdown code blocks.';

      if (systemMsgIndex !== -1) {
        messages[systemMsgIndex].content += jsonInstruction;
      } else {
        messages.unshift({
          role: 'system',
          content: 'You are a helpful assistant.' + jsonInstruction,
        });
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if API key is provided
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // Add custom headers if specified
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    // Special handling for Anthropic (uses different API format)
    if (config.providerType === 'anthropic') {
      return this.generateAnthropic(config, messages, model, temperature, request.maxTokens);
    }

    // Default max_tokens — reasoning models (e.g. DeepSeek-R1, Qwen3) use output tokens for
    // thinking, so a low limit causes all tokens to go to reasoning with nothing left for content.
    // 16384 gives ample room for both reasoning and the actual answer.
    const maxTokens = request.maxTokens || 16384;

    // Build request body
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Native JSON mode — only for providers known to support it (OpenAI, Groq, Together, OpenRouter).
    // Custom / openai_compatible endpoints often don't support response_format and may truncate
    // or error; the system-message JSON instruction above is enough for those.
    const supportsNativeJson = ['openai', 'groq', 'together'].includes(config.providerType);
    if (request.responseFormat === 'json' && supportsNativeJson) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Make request to OpenAI-compatible endpoint with timeout
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(120_000), // 2 minute timeout
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API Error [${config.name}] ${config.baseUrl}:`, response.status, errorText);
      throw new Error(`AI service error: ${response.status} - ${this.parseErrorMessage(errorText)}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string; reasoning_content?: string }; finish_reason?: string }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    // Log raw response shape for diagnostics
    const choice = data.choices?.[0];
    console.log(`[AI] Raw response: finish_reason=${choice?.finish_reason} content_len=${choice?.message?.content?.length ?? 0} reasoning_len=${choice?.message?.reasoning_content?.length ?? 0} usage=${JSON.stringify(data.usage)}`);

    // Extract response text — prefer `content` (the actual answer).
    const message = choice?.message;
    let text = message?.content || '';

    // Reasoning models (Qwen3, DeepSeek-R1) may return empty `content` when all output
    // tokens were consumed by thinking. Fall back to `reasoning_content`, stripping
    // the <think>…</think> wrapper so callers receive the actual answer.
    if (!text && message?.reasoning_content) {
      console.warn(`[AI] Empty content from ${model} — extracting answer from reasoning_content`);
      const reasoning: string = message.reasoning_content;
      const thinkEnd = reasoning.lastIndexOf('</think>');
      if (thinkEnd !== -1) {
        text = reasoning.substring(thinkEnd + 8).trim();
      }
      // If no </think> tag found, or text after it is still empty, use the full reasoning
      if (!text) {
        text = reasoning.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }
      if (!text) {
        text = reasoning;
      }
    }

    if (!text) {
      console.warn(`[AI] Empty response from ${model}. Raw choices:`, JSON.stringify(data.choices?.[0]).substring(0, 500));
    }

    return {
      text,
      model,
      provider: config.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Generate content using Anthropic's API format
   */
  private async generateAnthropic(
    config: ProviderConfig,
    messages: { role: string; content: string }[],
    model: string,
    temperature: number,
    maxTokens?: number
  ): Promise<AIGenerateResponse> {
    // Extract system message
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };

    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(120_000), // 2 minute timeout
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 4096,
        system: systemMsg?.content,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API Error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status} - ${this.parseErrorMessage(errorText)}`);
    }

    const data = await response.json() as {
      content?: { text?: string }[];
      usage?: {
        input_tokens: number;
        output_tokens: number;
      };
    };
    const text = data.content?.[0]?.text || '';

    return {
      text,
      model,
      provider: config.name,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  /**
   * Parse error message from API response
   */
  private parseErrorMessage(errorText: string): string {
    try {
      const json = JSON.parse(errorText);
      return json.error?.message || json.message || json.error || errorText;
    } catch {
      return errorText.substring(0, 200);
    }
  }

  /**
   * Simple text completion helper
   */
  async complete(prompt: string, options?: Partial<AIGenerateRequest>): Promise<string> {
    const response = await this.generate({
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    return response.text;
  }

  /**
   * Get available models for the current provider
   */
  async getAvailableModels(): Promise<{ id: string; name: string; provider?: string }[]> {
    const models = await aiProvidersRepository.findEnabledModels();
    return models.map(m => ({
      id: m.model_id,
      name: m.display_name,
      provider: m.provider_name,
    }));
  }

  /**
   * Get all enabled providers
   */
  async getEnabledProviders(): Promise<{ id: string; name: string; displayName: string; type: string }[]> {
    const providers = await aiProvidersRepository.findEnabled();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      displayName: p.display_name,
      type: p.provider_type,
    }));
  }

  /**
   * Check if AI service is configured and available
   */
  async isAvailable(): Promise<boolean> {
    const config = await this.getProviderConfig();
    return config !== null;
  }

  /**
   * Test connection to an AI provider
   */
  async testConnection(providerId?: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    try {
      const startTime = Date.now();

      // If providerId specified, test that specific provider
      if (providerId) {
        const provider = await aiProvidersRepository.findById(providerId);
        if (!provider) {
          return { success: false, message: 'Provider not found' };
        }
        const config = this.extractConfig(provider);
        if (!config) {
          return { success: false, message: 'Provider not configured properly' };
        }
        // Temporarily use this provider for test
        this.cachedProvider = provider;
      }

      // Simple test request
      const response = await this.generate({
        messages: [{ role: 'user', content: 'Reply with just: OK' }],
        maxTokens: 10,
        temperature: 0,
      });

      const latencyMs = Date.now() - startTime;

      if (response.text) {
        return {
          success: true,
          message: `Connected successfully. Model: ${response.model}`,
          latencyMs,
        };
      }

      return { success: false, message: 'No response received' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    } finally {
      // Clear cache after test to restore normal behavior
      if (providerId) {
        this.clearCache();
      }
    }
  }
}

export const aiService = new AIService();
export default aiService;
