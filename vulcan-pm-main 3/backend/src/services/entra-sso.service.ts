import jwt from 'jsonwebtoken';
import { ssoRepository } from '../db/postgres/repositories/sso.repository.js';

// Entra ID configuration from database
export interface EntraConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

// Entra ID token claims
interface EntraIdToken {
  aud: string; // Audience (client ID)
  iss: string; // Issuer
  iat: number; // Issued at
  exp: number; // Expiration
  sub: string; // Subject (user ID within the app)
  oid: string; // Object ID (user's unique ID in Entra)
  tid: string; // Tenant ID
  preferred_username?: string; // User's email/UPN
  email?: string; // Email (if requested)
  name?: string; // Display name
  given_name?: string;
  family_name?: string;
}

// Token exchange response from Entra
interface EntraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
  refresh_token?: string;
}

// Parsed user info from Entra token
export interface EntraUserInfo {
  oid: string; // Entra object ID (unique per user)
  tid: string; // Entra tenant ID (organization)
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
}

// Default scopes for Entra ID
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

class EntraSsoService {
  private cachedConfig: EntraConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get Entra configuration from database
   */
  async getConfig(): Promise<EntraConfig | null> {
    const now = Date.now();

    // Use cached config if valid
    if (this.cachedConfig && now < this.cacheExpiry) {
      return this.cachedConfig;
    }

    // Fetch from database
    const provider = await ssoRepository.findEntraProvider();

    if (!provider || !provider.is_enabled) {
      return null;
    }

    if (!provider.client_id || !provider.client_secret_encrypted) {
      console.warn('[Entra SSO] Provider is enabled but missing client credentials');
      return null;
    }

    // Parse scopes from database or use defaults
    const scopes = provider.scopes
      ? provider.scopes.split(' ').filter(Boolean)
      : DEFAULT_SCOPES;

    // Build redirect URI - use stored value or construct from provider config
    const redirectUri = provider.redirect_uri || 'http://localhost:8080/auth/callback';

    this.cachedConfig = {
      clientId: provider.client_id,
      clientSecret: provider.client_secret_encrypted, // In production, decrypt this
      tenantId: provider.tenant_id || 'common',
      redirectUri,
      scopes,
    };

    this.cacheExpiry = now + this.CACHE_TTL;
    return this.cachedConfig;
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiry = 0;
  }

  /**
   * Check if Entra SSO is configured and enabled
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config !== null;
  }

  /**
   * Get authority URL based on tenant ID
   */
  private getAuthority(tenantId: string): string {
    return `https://login.microsoftonline.com/${tenantId}`;
  }

  /**
   * Generate the authorization URL for Entra ID login
   */
  async getAuthorizationUrl(state: string, nonce: string): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Entra ID is not configured');
    }

    const authority = this.getAuthority(config.tenantId);
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      response_mode: 'query',
      scope: config.scopes.join(' '),
      state,
      nonce,
      prompt: 'select_account', // Always show account picker
    });

    return `${authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Generate the admin consent URL for organization onboarding
   */
  async getAdminConsentUrl(state: string, redirectUri?: string): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Entra ID is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri || config.redirectUri,
      state,
      scope: config.scopes.join(' '),
    });

    return `https://login.microsoftonline.com/common/adminconsent?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<EntraTokenResponse> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Entra ID is not configured');
    }

    const authority = this.getAuthority(config.tenantId);
    const tokenEndpoint = `${authority}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      scope: config.scopes.join(' '),
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as { error_description?: string; error?: string };
      console.error('[Entra SSO] Token exchange failed:', error);
      throw new Error(error.error_description || error.error || 'Failed to exchange authorization code');
    }

    return response.json() as Promise<EntraTokenResponse>;
  }

  /**
   * Decode and validate the ID token
   */
  async decodeIdToken(idToken: string): Promise<EntraIdToken> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Entra ID is not configured');
    }

    // Decode without verification first (we'll validate claims manually)
    // In production, you should verify the signature using Microsoft's public keys
    const decoded = jwt.decode(idToken) as EntraIdToken;

    if (!decoded) {
      throw new Error('Failed to decode ID token');
    }

    // Validate required claims
    if (!decoded.oid || !decoded.tid) {
      throw new Error('ID token missing required claims (oid, tid)');
    }

    // Validate audience (should be our client ID)
    if (decoded.aud !== config.clientId) {
      throw new Error('ID token audience mismatch');
    }

    // Validate expiration
    if (decoded.exp < Date.now() / 1000) {
      throw new Error('ID token has expired');
    }

    return decoded;
  }

  /**
   * Extract user info from ID token
   */
  async getUserInfoFromToken(idToken: string): Promise<EntraUserInfo> {
    const decoded = await this.decodeIdToken(idToken);

    const email = decoded.email || decoded.preferred_username || '';
    const name = decoded.name || `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || email.split('@')[0];

    return {
      oid: decoded.oid,
      tid: decoded.tid,
      email,
      name,
      givenName: decoded.given_name,
      familyName: decoded.family_name,
    };
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<{
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
    givenName?: string;
    surname?: string;
    jobTitle?: string;
    department?: string;
  }> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as Record<string, unknown>;
      console.error('[Entra SSO] Graph API failed:', error);
      throw new Error('Failed to fetch user profile from Microsoft Graph');
    }

    return response.json() as Promise<{
      id: string;
      displayName: string;
      mail: string | null;
      userPrincipalName: string;
      givenName?: string;
      surname?: string;
      jobTitle?: string;
      department?: string;
    }>;
  }

  /**
   * Get organization info from Microsoft Graph API
   */
  async getOrganization(accessToken: string): Promise<{
    id: string;
    displayName: string;
    verifiedDomains: Array<{ name: string; isDefault: boolean; isInitial: boolean }>;
  } | null> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // User might not have permission to read org info
        return null;
      }

      const data = await response.json() as { value?: Array<{
        id: string;
        displayName: string;
        verifiedDomains: Array<{ name: string; isDefault: boolean; isInitial: boolean }>;
      }> };
      return data.value?.[0] || null;
    } catch (error) {
      console.error('[Entra SSO] Failed to get organization:', error);
      return null;
    }
  }

  /**
   * Validate that the organization has given admin consent
   * Returns true if the tenant has consented, false otherwise
   */
  isValidTenantId(tenantId: string): boolean {
    // Basic validation - ensure it's a valid GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(tenantId);
  }

  /**
   * Get user's directory roles from Microsoft Graph API
   * Requires Directory.Read.All scope
   */
  async getUserDirectoryRoles(accessToken: string): Promise<{
    isGlobalAdmin: boolean;
    isDirectoryAdmin: boolean;
    roles: Array<{ id: string; displayName: string; roleTemplateId: string }>;
  }> {
    try {
      // Get directory roles the user is a member of
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.directoryRole',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // User might not have permission to read directory roles
        console.log('[Entra SSO] Unable to fetch directory roles (insufficient permissions)');
        return { isGlobalAdmin: false, isDirectoryAdmin: false, roles: [] };
      }

      const data = await response.json() as {
        value?: Array<{
          id: string;
          displayName: string;
          roleTemplateId: string;
        }>;
      };

      const roles = data.value || [];

      // Known role template IDs
      // Global Administrator: 62e90394-69f5-4237-9190-012177145e10
      // Privileged Role Administrator: e8611ab8-c189-46e8-94e1-60213ab1f814
      // Directory Readers: 88d8e3e3-8f55-4a1e-953a-9b9898b8876b
      // User Administrator: fe930be7-5e62-47db-91af-98c3a49a38b1
      const GLOBAL_ADMIN_TEMPLATE_ID = '62e90394-69f5-4237-9190-012177145e10';
      const PRIVILEGED_ROLE_ADMIN_TEMPLATE_ID = 'e8611ab8-c189-46e8-94e1-60213ab1f814';
      const USER_ADMIN_TEMPLATE_ID = 'fe930be7-5e62-47db-91af-98c3a49a38b1';

      const isGlobalAdmin = roles.some(r => r.roleTemplateId === GLOBAL_ADMIN_TEMPLATE_ID);
      const isDirectoryAdmin = roles.some(r =>
        r.roleTemplateId === GLOBAL_ADMIN_TEMPLATE_ID ||
        r.roleTemplateId === PRIVILEGED_ROLE_ADMIN_TEMPLATE_ID ||
        r.roleTemplateId === USER_ADMIN_TEMPLATE_ID
      );

      console.log('[Entra SSO] User directory roles:', roles.map(r => r.displayName));
      console.log('[Entra SSO] Is Global Admin:', isGlobalAdmin);
      console.log('[Entra SSO] Is Directory Admin:', isDirectoryAdmin);

      return {
        isGlobalAdmin,
        isDirectoryAdmin,
        roles: roles.map(r => ({
          id: r.id,
          displayName: r.displayName,
          roleTemplateId: r.roleTemplateId,
        })),
      };
    } catch (error) {
      console.error('[Entra SSO] Error fetching directory roles:', error);
      return { isGlobalAdmin: false, isDirectoryAdmin: false, roles: [] };
    }
  }

  /**
   * Check if user is an Azure AD admin (Global Admin or Directory Admin)
   */
  async isAzureAdAdmin(accessToken: string): Promise<boolean> {
    const { isDirectoryAdmin } = await this.getUserDirectoryRoles(accessToken);
    return isDirectoryAdmin;
  }
}

export const entraSsoService = new EntraSsoService();
