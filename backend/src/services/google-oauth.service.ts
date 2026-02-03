/**
 * Google OAuth Service
 * Handles Google OAuth 2.0 authentication flow
 * Uses native implementation following the same pattern as Microsoft OAuth
 */

import crypto from 'crypto';
import database, { generateUUID, now } from '../lib/database.js';
import { config } from '../config/index.js';

// OAuth State interface for CSRF protection
interface OAuthState {
  id: string;
  state: string;
  provider: string;
  expires_at: string;
  created_at: string;
}

// Google user profile from UserInfo API
interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// Token response from Google
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * Generate a random state token for CSRF protection
 */
function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired OAuth states (older than 10 minutes)
 */
async function cleanupExpiredStates(): Promise<void> {
  const nowTime = new Date().toISOString();
  const allStates = await database.getAll<OAuthState>('oauth_states');
  for (const state of allStates) {
    if (state.expires_at < nowTime) {
      await database.delete('oauth_states', state.id);
    }
  }
}

export const googleOAuthService = {
  /**
   * Generate Google OAuth authorization URL
   * Creates and stores a state token for CSRF protection
   */
  async generateAuthUrl(): Promise<{ authUrl: string; state: string }> {
    // Clean up expired states periodically
    await cleanupExpiredStates();

    // Generate state token
    const state = generateStateToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store state in database
    const oauthState: OAuthState = {
      id: generateUUID(),
      state,
      provider: 'google',
      expires_at: expiresAt,
      created_at: now(),
    };
    await database.insert('oauth_states', oauthState);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      response_type: 'code',
      redirect_uri: config.google.redirectUri,
      scope: config.google.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'select_account', // Always show account picker
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { authUrl, state };
  },

  /**
   * Validate state token (CSRF protection)
   * Returns true if valid, false otherwise
   */
  async validateState(state: string): Promise<boolean> {
    const allStates = await database.getAll<OAuthState>('oauth_states');
    const oauthState = allStates.find((s: OAuthState) => s.state === state);

    if (!oauthState) {
      return false;
    }

    // Check expiration
    if (new Date(oauthState.expires_at) < new Date()) {
      // Clean up expired state
      await database.delete('oauth_states', oauthState.id);
      return false;
    }

    // Delete used state (one-time use)
    await database.delete('oauth_states', oauthState.id);

    return true;
  },

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      code,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error_description?: string };
      console.error('Google token exchange error:', errorData);
      throw new Error(`Failed to exchange code for token: ${errorData.error_description || response.statusText}`);
    }

    return response.json() as Promise<TokenResponse>;
  },

  /**
   * Fetch user profile from Google UserInfo API
   */
  async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      console.error('Google UserInfo API error:', errorData);
      throw new Error(`Failed to fetch user profile: ${errorData.error?.message || response.statusText}`);
    }

    return response.json() as Promise<GoogleUserProfile>;
  },

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!(config.google.clientId && config.google.clientSecret);
  },
};

export default googleOAuthService;
