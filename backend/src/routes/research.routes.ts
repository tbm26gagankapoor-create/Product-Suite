/**
 * Research Routes
 * API endpoints for competitive research and market intelligence
 */

import { Router, Request, Response } from 'express';
import { researchService } from '../services/research.service.js';
import { webSearchService } from '../services/web-search.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/v1/research/product
 * Perform competitive research for a product
 */
router.post('/product', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { product_name, industry, target_market, features } = req.body;

    if (!product_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'product_name is required' }
      });
    }

    const research = await researchService.researchProduct({
      product_name,
      industry,
      target_market,
      features
    });

    res.json({
      success: true,
      data: research
    });
  } catch (error: any) {
    console.error('[Research API] Error performing research:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Research failed' }
    });
  }
});

/**
 * POST /api/v1/research/search
 * Direct web search endpoint
 */
router.post('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, maxResults, preferredProvider } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: 'query is required' }
      });
    }

    const results = await webSearchService.search(query, {
      maxResults: maxResults || 10,
      preferredProvider
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('[Research API] Error performing search:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Search failed' }
    });
  }
});

/**
 * GET /api/v1/research/providers
 * Get available search providers
 */
router.get('/providers', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Get enabled provider
    const enabledProvider = await webSearchService.getEnabledProvider();

    res.json({
      success: true,
      data: {
        enabled: enabledProvider ? {
          name: enabledProvider.display_name,
          type: enabledProvider.provider_type
        } : null,
        available: ['tavily', 'serper', 'brave_search']
      }
    });
  } catch (error: any) {
    console.error('[Research API] Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch providers' }
    });
  }
});

export default router;
