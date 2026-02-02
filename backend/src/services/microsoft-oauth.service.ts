/**
 * Microsoft OAuth Service
 * Handles Microsoft OAuth 2.0 / OIDC authentication flow
 * Uses native implementation (no MSAL library) following saas-auth-idp patterns
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

// Microsoft user profile from Graph API
interface MicrosoftUserProfile {
  id: string;           // Object ID (OID)
  displayName: string;
  mail?: string;
  userPrincipalName: string;
  givenName?: string;
  surname?: string;
}

// Token response from Microsoft
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
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

export const microsoftOAuthService = {
  /**
   * Generate Microsoft OAuth authorization URL
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
      provider: 'microsoft',
      expires_at: expiresAt,
      created_at: now(),
    };
    await database.insert('oauth_states', oauthState);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.microsoft.clientId,
      response_type: 'code',
      redirect_uri: config.microsoft.redirectUri,
      response_mode: 'query',
      scope: config.microsoft.scopes.join(' '),
      state,
      prompt: 'select_account', // Always show account picker
    });

    const authUrl = `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

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
    const tokenUrl = `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      code,
      redirect_uri: config.microsoft.redirectUri,
      grant_type: 'authorization_code',
      scope: config.microsoft.scopes.join(' '),
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
      console.error('Microsoft token exchange error:', errorData);
      throw new Error(`Failed to exchange code for token: ${errorData.error_description || response.statusText}`);
    }

    return response.json() as Promise<TokenResponse>;
  },

  /**
   * Fetch user profile from Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      console.error('Microsoft Graph API error:', errorData);
      throw new Error(`Failed to fetch user profile: ${errorData.error?.message || response.statusText}`);
    }

    return response.json() as Promise<MicrosoftUserProfile>;
  },

  /**
   * Check if Microsoft OAuth is configured
   */
  isConfigured(): boolean {
    return !!(config.microsoft.clientId && config.microsoft.clientSecret);
  },
};

export default microsoftOAuthService;
