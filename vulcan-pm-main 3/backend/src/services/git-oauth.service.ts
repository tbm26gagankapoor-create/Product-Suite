import { gitProvidersRepository, GitProvider } from '../db/postgres/repositories/git-providers.repository.js';
import { userGitTokensRepository } from '../db/postgres/repositories/user-git-tokens.repository.js';
import crypto from 'crypto';

// OAuth token response from Git providers
export interface GitOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// User info from Git provider
export interface GitUserInfo {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

// Cached provider config
interface CachedConfig {
  provider: GitProvider;
  expiry: number;
}

class GitOAuthService {
  private configCache: Map<string, CachedConfig> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get provider configuration by ID with caching
   */
  async getProviderConfig(providerId: string): Promise<GitProvider | null> {
    const now = Date.now();
    const cached = this.configCache.get(providerId);

    if (cached && now < cached.expiry) {
      return cached.provider;
    }

    const provider = await gitProvidersRepository.findById(providerId);
    if (provider) {
      this.configCache.set(providerId, {
        provider,
        expiry: now + this.CACHE_TTL,
      });
    }

    return provider;
  }

  /**
   * Get provider configuration by name (github, gitlab, bitbucket)
   */
  async getProviderByName(name: string): Promise<GitProvider | null> {
    return gitProvidersRepository.findByName(name);
  }

  /**
   * Clear config cache
   */
  clearCache(providerId?: string): void {
    if (providerId) {
      this.configCache.delete(providerId);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Generate OAuth state parameter
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate authorization URL for a Git provider
   */
  async getAuthorizationUrl(
    providerId: string,
    state: string,
    redirectUri: string
  ): Promise<string> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new Error('Git provider not found');
    }

    if (!provider.is_enabled) {
      throw new Error('Git provider is not enabled');
    }

    if (!provider.is_oauth_configured || !provider.oauth_client_id) {
      throw new Error('OAuth is not configured for this provider');
    }

    const params = new URLSearchParams({
      client_id: provider.oauth_client_id,
      redirect_uri: redirectUri,
      state,
    });

    // Provider-specific parameters
    switch (provider.provider_type) {
      case 'github':
        params.set('scope', provider.oauth_scopes || 'repo read:user');
        break;
      case 'gitlab':
        params.set('response_type', 'code');
        params.set('scope', provider.oauth_scopes || 'api read_user read_repository write_repository');
        break;
      case 'bitbucket':
        params.set('response_type', 'code');
        // Bitbucket uses different scope format
        break;
    }

    return `${provider.auth_url}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerId: string,
    code: string,
    redirectUri: string
  ): Promise<GitOAuthTokens> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new Error('Git provider not found');
    }

    if (!provider.oauth_client_id || !provider.oauth_client_secret_encrypted) {
      throw new Error('OAuth credentials not configured');
    }

    const tokenUrl = provider.token_url;
    if (!tokenUrl) {
      throw new Error('Token URL not configured');
    }

    const body: Record<string, string> = {
      client_id: provider.oauth_client_id,
      client_secret: provider.oauth_client_secret_encrypted, // In production, decrypt this
      code,
      redirect_uri: redirectUri,
    };

    // Provider-specific parameters
    switch (provider.provider_type) {
      case 'github':
        // GitHub doesn't require grant_type
        break;
      case 'gitlab':
      case 'bitbucket':
        body.grant_type = 'authorization_code';
        break;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitOAuth] Token exchange failed for ${provider.name}:`, errorText);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();

    // Handle GitHub's non-standard response (access_token in query string format sometimes)
    if (typeof data === 'string') {
      const params = new URLSearchParams(data);
      return {
        access_token: params.get('access_token') || '',
        token_type: params.get('token_type') || 'bearer',
        scope: params.get('scope') || undefined,
      };
    }

    const tokenData = data as { access_token: string; token_type?: string; expires_in?: number; refresh_token?: string; scope?: string };
    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    };
  }

  /**
   * Refresh an expired token
   */
  async refreshTokens(
    providerId: string,
    refreshToken: string
  ): Promise<GitOAuthTokens> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new Error('Git provider not found');
    }

    if (!provider.oauth_client_id || !provider.oauth_client_secret_encrypted) {
      throw new Error('OAuth credentials not configured');
    }

    // GitHub doesn't support token refresh - tokens don't expire
    if (provider.provider_type === 'github') {
      throw new Error('GitHub tokens do not expire and cannot be refreshed');
    }

    const tokenUrl = provider.token_url;
    if (!tokenUrl) {
      throw new Error('Token URL not configured');
    }

    const body = {
      client_id: provider.oauth_client_id,
      client_secret: provider.oauth_client_secret_encrypted,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitOAuth] Token refresh failed for ${provider.name}:`, errorText);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; token_type?: string; expires_in?: number; refresh_token?: string; scope?: string };
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in,
      refresh_token: data.refresh_token || refreshToken, // Some providers return new refresh token
      scope: data.scope,
    };
  }

  /**
   * Get user info from Git provider
   */
  async getUserInfo(providerId: string, accessToken: string): Promise<GitUserInfo> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new Error('Git provider not found');
    }

    const apiBaseUrl = provider.api_base_url;
    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    let userEndpoint: string;
    let headers: Record<string, string>;

    switch (provider.provider_type) {
      case 'github':
        userEndpoint = `${apiBaseUrl}/user`;
        headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        };
        break;
      case 'gitlab':
        userEndpoint = `${apiBaseUrl}/user`;
        headers = {
          'Authorization': `Bearer ${accessToken}`,
        };
        break;
      case 'bitbucket':
        userEndpoint = `${apiBaseUrl}/user`;
        headers = {
          'Authorization': `Bearer ${accessToken}`,
        };
        break;
      default:
        throw new Error(`Unknown provider type: ${provider.provider_type}`);
    }

    const response = await fetch(userEndpoint, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitOAuth] Get user info failed for ${provider.name}:`, errorText);
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const userData = await response.json() as Record<string, any>;

    // Normalize user data across providers
    switch (provider.provider_type) {
      case 'github':
        return {
          id: String(userData.id),
          username: userData.login,
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
        };
      case 'gitlab':
        return {
          id: String(userData.id),
          username: userData.username,
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
        };
      case 'bitbucket':
        return {
          id: userData.uuid || userData.account_id,
          username: userData.username || userData.nickname,
          email: userData.email,
          name: userData.display_name,
          avatar_url: userData.links?.avatar?.href,
        };
      default:
        throw new Error(`Unknown provider type: ${provider.provider_type}`);
    }
  }

  /**
   * Validate a Personal Access Token
   */
  async validatePAT(providerId: string, token: string): Promise<GitUserInfo> {
    // PAT validation works the same as OAuth token - just call user endpoint
    return this.getUserInfo(providerId, token);
  }

  /**
   * Store user's token after successful OAuth or PAT connection
   */
  async storeUserToken(
    userId: string,
    providerId: string,
    authType: 'oauth' | 'pat',
    tokens: GitOAuthTokens,
    userInfo: GitUserInfo
  ): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    await userGitTokensRepository.upsert({
      user_id: userId,
      provider_id: providerId,
      auth_type: authType,
      access_token_encrypted: tokens.access_token, // In production, encrypt this
      refresh_token_encrypted: tokens.refresh_token,
      token_expires_at: expiresAt,
      scopes: tokens.scope,
      provider_user_id: userInfo.id,
      provider_username: userInfo.username,
      provider_email: userInfo.email || undefined,
      provider_avatar_url: userInfo.avatar_url || undefined,
    });
  }

  /**
   * Get user's access token for a provider, refreshing if needed
   */
  async getValidAccessToken(userId: string, providerId: string): Promise<string | null> {
    const token = await userGitTokensRepository.findByUserAndProvider(userId, providerId);
    if (!token || !token.is_valid) {
      return null;
    }

    // Check if token is expired and needs refresh
    if (token.token_expires_at && new Date(token.token_expires_at) <= new Date()) {
      if (token.refresh_token_encrypted) {
        try {
          const newTokens = await this.refreshTokens(providerId, token.refresh_token_encrypted);
          const expiresAt = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000)
            : undefined;

          await userGitTokensRepository.update(token.id, {
            access_token_encrypted: newTokens.access_token,
            refresh_token_encrypted: newTokens.refresh_token || token.refresh_token_encrypted,
            token_expires_at: expiresAt,
            last_validated_at: new Date(),
          });

          return newTokens.access_token;
        } catch (error) {
          console.error(`[GitOAuth] Failed to refresh token for user ${userId}:`, error);
          await userGitTokensRepository.markAsInvalid(token.id);
          return null;
        }
      } else {
        // Token expired and no refresh token available
        await userGitTokensRepository.markAsInvalid(token.id);
        return null;
      }
    }

    // Update last used timestamp
    await userGitTokensRepository.updateLastUsed(token.id);

    return token.access_token_encrypted; // In production, decrypt this
  }
}

export const gitOAuthService = new GitOAuthService();
export default gitOAuthService;
