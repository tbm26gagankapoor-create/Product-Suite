/**
 * GitHub OAuth Routes
 * Handles OAuth flow for GitHub repository integration
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { githubOAuthService } from '../services/github-oauth.service.js';
import { githubSyncService } from '../services/github-sync.service.js';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';
import database from '../lib/database.js';

const router = Router();

/**
 * GET /auth/github/status
 * Check if GitHub OAuth is configured
 */
router.get('/github/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      configured: githubOAuthService.isConfigured(),
    },
  });
});

/**
 * GET /auth/github/connect/:projectId
 * Initiates GitHub OAuth flow for a specific project
 * Accepts token via query param (for browser redirects that can't send Authorization header)
 */
router.get('/github/connect/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { token } = req.query;

    // Verify token from query param (browser redirects can't send Authorization header)
    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
      const user = await database.findById<any>('users', decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      userId = user.id;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (!githubOAuthService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'GitHub OAuth is not configured',
      });
    }

    const { authUrl } = await githubOAuthService.generateAuthUrl(projectId, userId);

    // Redirect to GitHub
    res.redirect(authUrl);
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate GitHub OAuth',
    });
  }
});

/**
 * GET /auth/github/callback
 * Handles GitHub OAuth callback
 * Stores token and lets user configure repo/branch via modal
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors from GitHub
    if (error) {
      console.error('GitHub OAuth error:', error, error_description);
      return res.redirect(
        `${config.frontend.url}/settings?github_error=${encodeURIComponent(String(error_description || error))}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${config.frontend.url}/settings?github_error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Validate state and get project context
    const stateValidation = await githubOAuthService.validateState(String(state));
    if (!stateValidation.valid || !stateValidation.projectId || !stateValidation.userId) {
      return res.redirect(
        `${config.frontend.url}/settings?github_error=${encodeURIComponent('Invalid or expired state token')}`
      );
    }

    // Exchange code for token
    const tokenData = await githubOAuthService.exchangeCodeForToken(String(code));

    // Get user profile
    const profile = await githubOAuthService.getUserProfile(tokenData.access_token);

    // Delete existing integration if any
    const existingIntegration = await githubSyncService.getIntegrationForProject(stateValidation.projectId);
    if (existingIntegration) {
      await githubSyncService.deleteIntegration(stateValidation.projectId);
    }

    // Create integration without repo - user will configure via modal
    await githubSyncService.createIntegration({
      projectId: stateValidation.projectId,
      githubAccessToken: tokenData.access_token,
      githubRefreshToken: tokenData.refresh_token,
      githubUsername: profile.login,
      githubUserId: String(profile.id),
      repoOwner: '', // Will be set by user
      repoName: '',  // Will be set by user
      branch: 'main',
      connectedBy: stateValidation.userId,
    });

    console.log('[GitHub] Integration created, user needs to configure repo');

    // Redirect to frontend settings - user will configure repo/branch
    res.redirect(
      `${config.frontend.url}/settings?github_success=true&project_id=${stateValidation.projectId}&setup=true`
    );
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.redirect(
      `${config.frontend.url}/settings?github_error=${encodeURIComponent(errorMessage)}`
    );
  }
});

export default router;
