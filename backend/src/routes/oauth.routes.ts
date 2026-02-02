/**
 * OAuth Routes
 * Handles Microsoft and Google OAuth authentication flows
 */

import { Router, Request, Response } from 'express';
import { microsoftOAuthService } from '../services/microsoft-oauth.service.js';
import { googleOAuthService } from '../services/google-oauth.service.js';
import { authService } from '../services/auth.service.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /auth/microsoft
 * Initiates Microsoft OAuth flow - redirects to Microsoft login page
 */
router.get('/microsoft', async (req: Request, res: Response) => {
  try {
    // Check if Microsoft OAuth is configured
    if (!microsoftOAuthService.isConfigured()) {
      return res.redirect(`${config.frontend.url}/login?error=oauth_not_configured`);
    }

    // Generate authorization URL with state token
    const { authUrl } = await microsoftOAuthService.generateAuthUrl();

    // Redirect to Microsoft login
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Microsoft OAuth initiation error:', error);
    res.redirect(`${config.frontend.url}/login?error=oauth_init_failed`);
  }
});

/**
 * GET /auth/microsoft/callback
 * Handles Microsoft OAuth callback after user authenticates
 */
router.get('/microsoft/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle Microsoft errors (user cancelled, etc.)
    if (error) {
      console.error('Microsoft OAuth error:', error, error_description);
      return res.redirect(`${config.frontend.url}/login?error=${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(`${config.frontend.url}/login?error=missing_params`);
    }

    // Validate state token (CSRF protection)
    const isValidState = await microsoftOAuthService.validateState(state as string);
    if (!isValidState) {
      return res.redirect(`${config.frontend.url}/login?error=invalid_state`);
    }

    // Exchange authorization code for access token
    const tokens = await microsoftOAuthService.exchangeCodeForToken(code as string);

    // Fetch user profile from Microsoft Graph API
    const msProfile = await microsoftOAuthService.getUserProfile(tokens.access_token);

    // Get email (prefer mail, fallback to userPrincipalName)
    const email = msProfile.mail || msProfile.userPrincipalName;
    if (!email) {
      return res.redirect(`${config.frontend.url}/login?error=no_email`);
    }

    // Find or create user in our database
    const { user, token, isNewUser } = await authService.findOrCreateOAuthUser({
      email,
      name: msProfile.displayName,
      oauthProvider: 'microsoft',
      oauthProviderId: msProfile.id,
    });

    // Redirect to frontend with token in URL hash (not query string for security)
    // Hash fragments are not sent to servers, keeping the token client-side only
    const redirectUrl = new URL(`${config.frontend.url}/oauth/callback`);
    redirectUrl.hash = `token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&isNew=${isNewUser}`;

    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Microsoft OAuth callback error:', error);
    res.redirect(`${config.frontend.url}/login?error=oauth_callback_failed`);
  }
});

/**
 * GET /auth/google
 * Initiates Google OAuth flow - redirects to Google login page
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    // Check if Google OAuth is configured
    if (!googleOAuthService.isConfigured()) {
      return res.redirect(`${config.frontend.url}/login?error=oauth_not_configured`);
    }

    // Generate authorization URL with state token
    const { authUrl } = await googleOAuthService.generateAuthUrl();

    // Redirect to Google login
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Google OAuth initiation error:', error);
    res.redirect(`${config.frontend.url}/login?error=oauth_init_failed`);
  }
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback after user authenticates
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle Google errors (user cancelled, etc.)
    if (error) {
      console.error('Google OAuth error:', error, error_description);
      return res.redirect(`${config.frontend.url}/login?error=${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(`${config.frontend.url}/login?error=missing_params`);
    }

    // Validate state token (CSRF protection)
    const isValidState = await googleOAuthService.validateState(state as string);
    if (!isValidState) {
      return res.redirect(`${config.frontend.url}/login?error=invalid_state`);
    }

    // Exchange authorization code for access token
    const tokens = await googleOAuthService.exchangeCodeForToken(code as string);

    // Fetch user profile from Google UserInfo API
    const googleProfile = await googleOAuthService.getUserProfile(tokens.access_token);

    // Get email
    const email = googleProfile.email;
    if (!email) {
      return res.redirect(`${config.frontend.url}/login?error=no_email`);
    }

    // Find or create user in our database
    const { user, token, isNewUser } = await authService.findOrCreateOAuthUser({
      email,
      name: googleProfile.name,
      oauthProvider: 'google',
      oauthProviderId: googleProfile.id,
    });

    // Redirect to frontend with token in URL hash (not query string for security)
    // Hash fragments are not sent to servers, keeping the token client-side only
    const redirectUrl = new URL(`${config.frontend.url}/oauth/callback`);
    redirectUrl.hash = `token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&isNew=${isNewUser}`;

    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${config.frontend.url}/login?error=oauth_callback_failed`);
  }
});

/**
 * GET /auth/providers
 * Returns list of configured OAuth providers
 */
router.get('/providers', (req: Request, res: Response) => {
  const providers: string[] = [];

  if (microsoftOAuthService.isConfigured()) {
    providers.push('microsoft');
  }

  if (googleOAuthService.isConfigured()) {
    providers.push('google');
  }

  res.json({
    success: true,
    data: { providers },
  });
});

export default router;
