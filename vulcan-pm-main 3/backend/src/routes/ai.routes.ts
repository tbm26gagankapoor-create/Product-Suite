/**
 * AI Routes - Backend API for AI operations
 * All AI calls go through backend to protect API keys
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { aiService, AIMessage } from '../services/ai.service.js';
import { promptTemplateService } from '../services/prompt-template.service.js';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

/**
 * POST /ai/generate - Generate AI content
 * Body: { messages: AIMessage[], model?: string, temperature?: number, responseFormat?: 'text' | 'json' }
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { messages, model, temperature, responseFormat, maxTokens, promptTemplate, promptVariables } = req.body;

    let finalMessages: AIMessage[];
    let resolvedFormat = responseFormat;

    if (promptTemplate) {
      // Resolve prompt template from database
      const resolved = await promptTemplateService.resolve(
        promptTemplate,
        promptVariables || {}
      );
      finalMessages = [{ role: 'user', content: resolved.resolvedText }];
      // Use template's response format unless caller explicitly overrides
      if (!responseFormat) {
        resolvedFormat = resolved.responseFormat;
      }
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      // Validate message format
      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          return res.status(400).json({
            success: false,
            error: 'Each message must have role and content',
          });
        }
        if (!['system', 'user', 'assistant'].includes(msg.role)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid message role. Must be system, user, or assistant',
          });
        }
      }
      finalMessages = messages as AIMessage[];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either messages array or promptTemplate is required',
      });
    }

    const result = await aiService.generate({
      messages: finalMessages,
      model,
      temperature,
      responseFormat: resolvedFormat,
      maxTokens,
    });

    // Debug: log every AI response (first 500 chars) so we can diagnose empty-plan issues
    console.log(`[AI Route] template=${promptTemplate || 'none'} model=${result.model} provider=${result.provider} textLen=${result.text?.length} text=${result.text?.substring(0, 500)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('AI Generate Error:', error);
    // Provide clearer error messages for common failure modes
    let errorMessage = error.message || 'AI generation failed';
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      errorMessage = 'AI request timed out. The AI provider took too long to respond. Please try again.';
    }
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /ai/complete - Simple text completion
 * Body: { prompt: string, model?: string, temperature?: number, responseFormat?: 'text' | 'json' }
 */
router.post('/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, model, temperature, responseFormat, systemPrompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    const messages: AIMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const result = await aiService.generate({
      messages,
      model,
      temperature,
      responseFormat,
    });

    res.json({
      success: true,
      data: {
        text: result.text,
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (error: any) {
    console.error('AI Complete Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI completion failed',
    });
  }
});

/**
 * GET /ai/models - Get available AI models
 */
router.get('/models', async (req: AuthRequest, res: Response) => {
  try {
    const models = await aiService.getAvailableModels();

    res.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    console.error('AI Models Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch models',
    });
  }
});

/**
 * GET /ai/status - Check if AI service is available
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const available = await aiService.isAvailable();
    const providers = await aiService.getEnabledProviders();

    res.json({
      success: true,
      data: {
        available,
        providers,
        message: available
          ? 'AI service is configured and ready'
          : 'AI service is not configured. Please configure an AI provider in admin settings.',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check AI status',
    });
  }
});

/**
 * POST /ai/test - Test connection to AI provider
 * Body: { providerId?: string } - Optional provider ID, tests default if not specified
 */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.body;
    const result = await aiService.testConnection(providerId);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Connection test failed',
    });
  }
});

export default router;
