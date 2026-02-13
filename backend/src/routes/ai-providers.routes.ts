/**
 * Public AI Providers Routes
 * Allows frontend to fetch available AI providers without authentication
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/postgres/client.js';

const router = Router();

/**
 * GET /ai-providers
 * Get all enabled AI providers (public endpoint)
 * This allows the frontend to show available providers without authentication
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
        id, name, display_name, provider_type, api_endpoint,
        is_enabled, is_default, config, rate_limits
       FROM ai_providers
       WHERE is_enabled = true
       ORDER BY
        is_default DESC,
        display_name ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[AI Providers] Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI providers',
    });
  }
});

/**
 * GET /ai-providers/default
 * Get the default AI provider (public endpoint)
 */
router.get('/default', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
        id, name, display_name, provider_type, api_endpoint,
        is_enabled, is_default, config, rate_limits
       FROM ai_providers
       WHERE is_enabled = true AND is_default = true
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      // If no default, return first enabled provider
      const fallback = await query(
        `SELECT
          id, name, display_name, provider_type, api_endpoint,
          is_enabled, is_default, config, rate_limits
         FROM ai_providers
         WHERE is_enabled = true
         ORDER BY display_name ASC
         LIMIT 1`
      );

      if (fallback.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No AI providers available',
        });
      }

      return res.json({
        success: true,
        data: fallback.rows[0],
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[AI Providers] Error fetching default provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default AI provider',
    });
  }
});

export default router;
