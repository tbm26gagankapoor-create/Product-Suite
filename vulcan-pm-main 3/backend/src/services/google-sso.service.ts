import jwt from 'jsonwebtoken';
import { ssoRepository } from '../db/postgres/repositories/sso.repository.js';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface GoogleIdToken {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  hd?: string; // Hosted domain (Google Workspace)
  iat: number;
  exp: number;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
  refresh_token?: string;
}

export interface GoogleUserInfo {
  sub: string;        // Google user ID
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  hd?: string;        // Workspace domain (acts like tenant ID)
}

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

class GoogleSsoService {
  private cachedConfig: GoogleConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000;

  async getConfig(): Promise<GoogleConfig | null> {
    const now = Date.now();

    if (this.cachedConfig && now < this.cacheExpiry) {
      return this.cachedConfig;
    }

    const provider = await ssoRepository.findProviderByType('google_workspace');

    if (!provider || !provider.is_enabled) {
      return null;
    }

    if (!provider.client_id || !provider.client_secret_encrypted) {
      console.warn('[Google SSO] Provider is enabled but missing client credentials');
      return null;
    }

    const scopes = provider.scopes
      ? provider.scopes.split(' ').filter(Boolean)
      : DEFAULT_SCOPES;

    const redirectUri = provider.redirect_uri || 'http://localhost:8080/auth/callback';

    this.cachedConfig = {
      clientId: provider.client_id,
      clientSecret: provider.client_secret_encrypted,
      redirectUri,
      scopes,
    };

    this.cacheExpiry = now + this.CACHE_TTL;
    return this.cachedConfig;
  }

  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiry = 0;
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config !== null;
  }

  async getAuthorizationUrl(state: string, nonce: string): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Google Workspace SSO is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      nonce,
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Google Workspace SSO is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as { error_description?: string; error?: string };
      console.error('[Google SSO] Token exchange failed:', error);
      throw new Error(error.error_description || error.error || 'Failed to exchange authorization code');
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  async decodeIdToken(idToken: string): Promise<GoogleIdToken> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Google Workspace SSO is not configured');
    }

    const decoded = jwt.decode(idToken) as GoogleIdToken;

    if (!decoded) {
      throw new Error('Failed to decode ID token');
    }

    if (!decoded.sub || !decoded.email) {
      throw new Error('ID token missing required claims (sub, email)');
    }

    if (decoded.aud !== config.clientId) {
      throw new Error('ID token audience mismatch');
    }

    if (decoded.exp < Date.now() / 1000) {
      throw new Error('ID token has expired');
    }

    return decoded;
  }

  async getUserInfoFromToken(idToken: string): Promise<GoogleUserInfo> {
    const decoded = await this.decodeIdToken(idToken);

    const name = decoded.name || `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || decoded.email.split('@')[0];

    return {
      sub: decoded.sub,
      email: decoded.email,
      name,
      givenName: decoded.given_name,
      familyName: decoded.family_name,
      picture: decoded.picture,
      hd: decoded.hd,
    };
  }
}

export const googleSsoService = new GoogleSsoService();
