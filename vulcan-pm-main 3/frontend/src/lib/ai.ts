/**
 * AI Client - Frontend wrapper for backend AI service
 * All AI calls go through the backend to keep API keys secure
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateParams {
  model?: string;
  contents?: { role?: string; parts: { text: string }[] }[];
  config?: {
    responseMimeType?: string;
    temperature?: number;
    systemInstruction?: string;
  };
  /** Template name for DB-backed prompt resolution (sent to backend) */
  promptTemplate?: string;
  /** Variables to fill in the template (sent to backend) */
  promptVariables?: Record<string, string>;
}

interface AIResponse {
  text: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const aiClient = {
  models: {
    /**
     * Generate content using the backend AI service
     * Maintains compatibility with existing code structure
     */
    generateContent: async (params: GenerateParams): Promise<AIResponse> => {
      // Build request body — template path or legacy messages path
      let requestBody: Record<string, unknown>;

      if (params.promptTemplate) {
        // Template path: backend resolves prompt from DB
        requestBody = {
          promptTemplate: params.promptTemplate,
          promptVariables: params.promptVariables || {},
          model: params.model,
          temperature: params.config?.temperature ?? 0.7,
          responseFormat: params.config?.responseMimeType === 'application/json' ? 'json' : undefined,
        };
      } else {
        // Legacy path: convert Gemini-style contents to messages
        const messages: AIMessage[] = [];

        if (params.config?.systemInstruction) {
          messages.push({
            role: 'system',
            content: params.config.systemInstruction,
          });
        }

        if (params.contents) {
          for (const content of params.contents) {
            const text = content.parts.map(p => p.text || '').join('\n');
            const role = content.role === 'model' ? 'assistant' : (content.role as 'user' | 'assistant') || 'user';
            messages.push({ role, content: text });
          }
        }

        requestBody = {
          messages,
          model: params.model,
          temperature: params.config?.temperature ?? 0.7,
          responseFormat: params.config?.responseMimeType === 'application/json' ? 'json' : 'text',
        };
      }

      try {
        const response = await fetch(`${API_BASE}/ai/generate`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `AI request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'AI generation failed');
        }

        return {
          text: data.data.text,
          model: data.data.model,
          usage: data.data.usage,
        };
      } catch (error: any) {
        console.error('AI Client Error:', error);
        throw error;
      }
    },
  },

  /**
   * Simple completion helper
   */
  complete: async (prompt: string, options?: {
    model?: string;
    temperature?: number;
    responseFormat?: 'text' | 'json';
    systemPrompt?: string;
  }): Promise<string> => {
    const response = await fetch(`${API_BASE}/ai/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        prompt,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'AI completion failed');
    }

    return data.data.text;
  },

  /**
   * Get available AI models
   */
  getModels: async (): Promise<{ id: string; name: string }[]> => {
    const response = await fetch(`${API_BASE}/ai/models`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.success ? data.data : [];
  },

  /**
   * Check if AI service is available
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/ai/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.data?.available;
    } catch {
      return false;
    }
  },
};

// Export for backwards compatibility
export default aiClient;
