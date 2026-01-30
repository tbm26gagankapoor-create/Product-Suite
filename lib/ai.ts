
// Custom AI Client for model.iamsaif.ai
export const SAIF_API_KEY = "sk-QFZWnv7xcrm4oqKSNK04RQ";
export const SAIF_API_BASE_URL = "https://model.iamsaif.ai/v1"; 
export const SAIF_MODEL = "openai/gpt-oss-120b";

// CORS Proxy to handle browser restrictions if direct call fails
const CORS_PROXY = "https://corsproxy.io/?";

export const aiClient = {
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
          // Check if system message exists, otherwise add one, or append to last user message
          // Best practice for OpenAI: Add a system message if one doesn't exist, or append to it.
          const systemMsgIndex = messages.findIndex(m => m.role === 'system');
          if (systemMsgIndex !== -1) {
              messages[systemMsgIndex].content += "\n\nIMPORTANT: Respond strictly in valid JSON format without markdown code blocks.";
          } else {
              // Add a system message at the start
              messages.unshift({ 
                  role: 'system', 
                  content: "You are a helpful assistant. IMPORTANT: Respond strictly in valid JSON format without markdown code blocks." 
              });
          }
      }

      const model = params.model || SAIF_MODEL;
      const temperature = params.config?.temperature ?? 0;

      const body = JSON.stringify({
        model,
        messages,
        temperature
      });

      const doFetch = async (url: string) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SAIF_API_KEY}`
            },
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
          const text = await doFetch(`${SAIF_API_BASE_URL}/chat/completions`);
          return { text };
      } catch (error: any) {
          console.warn("Direct AI Request Failed:", error);
          
          // Attempt 2: Retry with CORS Proxy if network error
          if (error.message === 'Failed to fetch' || error.message.includes('Network error')) {
              console.log("Retrying with CORS proxy...");
              try {
                  // Construct proxy URL: https://corsproxy.io/?<encoded_target_url>
                  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(`${SAIF_API_BASE_URL}/chat/completions`)}`;
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
  }
};
