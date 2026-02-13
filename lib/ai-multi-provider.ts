/**
 * Multi-Provider AI Client
 * Supports multiple AI providers dynamically based on configuration
 */

import type { AIProvider } from '../services/ai-providers.service';

// CORS Proxy to handle browser restrictions if direct call fails
const CORS_PROXY = "https://corsproxy.io/?";

// Fallback configuration for SAIF AI (backward compatibility)
const FALLBACK_API_KEY = import.meta.env.VITE_SAIF_API_KEY || '';
const FALLBACK_API_BASE_URL = import.meta.env.VITE_SAIF_API_BASE_URL || 'https://model.iamsaif.ai/v1';
const FALLBACK_MODEL = import.meta.env.VITE_SAIF_MODEL || 'openai/gpt-oss-120b';

export interface AIClientConfig {
  provider?: AIProvider;
  model?: string;
  apiKey?: string;
}

export const createAIClient = (config?: AIClientConfig) => {
  // Use provided provider or fallback to SAIF AI
  const provider = config?.provider;
  const apiEndpoint = provider?.api_endpoint || FALLBACK_API_BASE_URL;
  const defaultModel = config?.model || provider?.config?.default_model || FALLBACK_MODEL;
  const apiKey = config?.apiKey || FALLBACK_API_KEY;

  console.log('[AI Client] Configured:', {
    providerName: provider?.display_name || 'SAIF AI (Fallback)',
    endpoint: apiEndpoint,
    model: defaultModel,
    hasApiKey: !!apiKey,
  });

  return {
    models: {
      generateContent: async (params: {
        model?: string,
        contents: { role?: string, parts: { text: string }[] }[],
        config?: any
      }) => {
        const messages = params.contents.map((c: any) => {
          // Handle Gemini structure where parts is array
          const text = c.parts.map((p: any) => p.text || '').join('\n');
          return {
            role: c.role === 'model' ? 'assistant' : (c.role || 'user'),
            content: text
          };
        });

        // Handle system instruction
        if (params.config?.systemInstruction) {
          messages.unshift({ role: 'system', content: params.config.systemInstruction });
        }

        // Handle JSON request - Ensure prompt explicitly asks for JSON if config requires it
        if (params.config?.responseMimeType === 'application/json') {
          const systemMsgIndex = messages.findIndex(m => m.role === 'system');
          if (systemMsgIndex !== -1) {
            messages[systemMsgIndex].content += "\n\nIMPORTANT: Respond strictly in valid JSON format without markdown code blocks.";
          } else {
            messages.unshift({
              role: 'system',
              content: "You are a helpful assistant. IMPORTANT: Respond strictly in valid JSON format without markdown code blocks."
            });
          }
        }

        const model = params.model || defaultModel;
        const temperature = params.config?.temperature ?? 0;

        const body = JSON.stringify({
          model,
          messages,
          temperature
        });

        const doFetch = async (url: string) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          // Add Authorization header if API key is configured
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: body
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} - ${text}`);
          }

          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        };

        try {
          // Attempt 1: Direct Connection
          const text = await doFetch(`${apiEndpoint}/chat/completions`);
          return { text };
        } catch (error: any) {
          console.warn("Direct AI Request Failed:", error);

          // Attempt 2: Retry with CORS Proxy if network error
          if (error.message === 'Failed to fetch' || error.message.includes('Network error')) {
            console.log("Retrying with CORS proxy...");
            try {
              const proxyUrl = `${CORS_PROXY}${encodeURIComponent(`${apiEndpoint}/chat/completions`)}`;
              const text = await doFetch(proxyUrl);
              return { text };
            } catch (proxyError: any) {
              console.error("Proxy AI request also failed:", proxyError);
              throw new Error(`AI Service Unavailable (Network/CORS): ${proxyError.message}`);
            }
          }
          throw error;
        }
      }
    },

    // Provider information
    getProvider(): AIProvider | null {
      return provider || null;
    },

    getProviderName(): string {
      return provider?.display_name || 'SAIF AI (Fallback)';
    }
  };
};

// Default client (backward compatibility)
export const aiClient = createAIClient();
