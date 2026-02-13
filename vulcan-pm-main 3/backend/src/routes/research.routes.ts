/**
 * Research Routes - AI-powered competitive research
 * POST /research - Conduct research for a product concept
 * GET /research/status - Check if research service is available
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { researchService } from '../services/research.service.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /research/status
 * Check if research service is configured and available
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const available = await researchService.isAvailable();
    res.json({
      success: true,
      data: { available },
    });
  } catch (error) {
    console.error('[Research] Status check error:', error);
    res.json({
      success: true,
      data: { available: false },
    });
  }
});

/**
 * POST /research
 * Conduct competitive research for a product concept
 * Body: { productName: string, description?: string, tags?: string }
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { productName, description, tags } = req.body;

    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'productName is required',
      });
    }

    const report = await researchService.conductResearch({
      productName,
      description,
      tags,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[Research] Research error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to conduct research',
    });
  }
});

export default router;
