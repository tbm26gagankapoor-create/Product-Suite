/**
 * SSO Provider Service
 * Fetches OAuth/SSO provider configuration from PostgreSQL database
 */

import crypto from 'crypto';
import { query } from '../db/postgres/client.js';

export interface SSOProvider {
  id: string;
  provider_type: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  client_id: string;
  client_secret: string; // Decrypted
  tenant_id?: string;
  redirect_uri: string;
  scopes: string[];
  issuer_url?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
}

// Cache for SSO providers (60 second TTL)
let providersCache: Map<string, { provider: SSOProvider; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

function decryptSecret(encrypted: string, encryptionKey: string): string {
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set in environment variables');
  }

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export const ssoProviderService = {
  /**
   * Get OAuth provider by type from database
   */
  async getProviderByType(providerType: string): Promise<SSOProvider | null> {
    // Check cache first
    const cached = providersCache.get(providerType);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`[SSO] Using cached provider: ${providerType}`);
      return cached.provider;
    }

    try {
      const result = await query(
        `SELECT * FROM sso_providers WHERE provider_type = $1 AND is_enabled = true LIMIT 1`,
        [providerType]
      );

      if (result.rows.length === 0) {
        console.warn(`[SSO] Provider not found or disabled: ${providerType}`);
        return null;
      }

      const row = result.rows[0];
      const encryptionKey = process.env.ENCRYPTION_KEY;

      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not set in environment variables');
      }

      // Decrypt client secret
      let clientSecret = '';
      if (row.client_secret_encrypted) {
        try {
          clientSecret = decryptSecret(row.client_secret_encrypted, encryptionKey);
        } catch (error: any) {
          console.error(`[SSO] Failed to decrypt secret for ${providerType}:`, error.message);
          // Fall back to unencrypted value if decryption fails (for testing)
          clientSecret = row.client_secret_encrypted;
        }
      }

      const provider: SSOProvider = {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        display_name: row.display_name,
        is_enabled: row.is_enabled,
        client_id: row.client_id || '',
        client_secret: clientSecret,
        tenant_id: row.tenant_id || 'common',
        redirect_uri: row.redirect_uri || '',
        scopes: row.scopes ? row.scopes.split(' ') : [],
        issuer_url: row.issuer_url,
        authorization_endpoint: row.authorization_endpoint,
        token_endpoint: row.token_endpoint,
        userinfo_endpoint: row.userinfo_endpoint,
      };

      // Cache the provider
      providersCache.set(providerType, { provider, timestamp: Date.now() });

      console.log(`[SSO] Loaded provider from database: ${providerType}`);
      return provider;
    } catch (error: any) {
      console.error(`[SSO] Error fetching provider ${providerType}:`, error.message);
      return null;
    }
  },

  /**
   * Get all enabled OAuth providers
   */
  async getEnabledProviders(): Promise<SSOProvider[]> {
    try {
      const result = await query(
        `SELECT * FROM sso_providers WHERE is_enabled = true ORDER BY display_order`
      );

      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not set in environment variables');
      }

      return result.rows.map(row => {
        let clientSecret = '';
        if (row.client_secret_encrypted) {
          try {
            clientSecret = decryptSecret(row.client_secret_encrypted, encryptionKey);
          } catch (error) {
            console.warn(`[SSO] Failed to decrypt secret for ${row.provider_type}`);
            clientSecret = row.client_secret_encrypted;
          }
        }

        return {
          id: row.id,
          provider_type: row.provider_type,
          name: row.name,
          display_name: row.display_name,
          is_enabled: row.is_enabled,
          client_id: row.client_id || '',
          client_secret: clientSecret,
          tenant_id: row.tenant_id || 'common',
          redirect_uri: row.redirect_uri || '',
          scopes: row.scopes ? row.scopes.split(' ') : [],
          issuer_url: row.issuer_url,
          authorization_endpoint: row.authorization_endpoint,
          token_endpoint: row.token_endpoint,
          userinfo_endpoint: row.userinfo_endpoint,
        };
      });
    } catch (error: any) {
      console.error('[SSO] Error fetching enabled providers:', error.message);
      return [];
    }
  },

  /**
   * Check if a provider is configured
   */
  async isProviderConfigured(providerType: string): Promise<boolean> {
    const provider = await this.getProviderByType(providerType);
    return provider !== null && provider.client_id !== '' && provider.client_secret !== '';
  },

  /**
   * Clear the provider cache (useful after updating provider config)
   */
  clearCache(): void {
    providersCache.clear();
    console.log('[SSO] Provider cache cleared');
  },
};
