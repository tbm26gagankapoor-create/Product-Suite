import { query } from '../client.js';

export interface GitProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: 'github' | 'gitlab' | 'bitbucket';
  oauth_client_id: string | null;
  oauth_client_secret_encrypted: string | null;
  oauth_scopes: string | null;
  api_base_url: string | null;
  auth_url: string | null;
  token_url: string | null;
  is_enabled: boolean;
  is_oauth_configured: boolean;
  icon_url: string | null;
  config: Record<string, any>;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateGitProviderInput {
  display_name?: string;
  oauth_client_id?: string;
  oauth_client_secret_encrypted?: string;
  oauth_scopes?: string;
  api_base_url?: string;
  auth_url?: string;
  token_url?: string;
  is_enabled?: boolean;
  is_oauth_configured?: boolean;
  icon_url?: string;
  config?: Record<string, any>;
}

export const gitProvidersRepository = {
  /**
   * Get all Git providers
   */
  async findAll(): Promise<GitProvider[]> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers ORDER BY display_order, display_name'
    );
    return result.rows;
  },

  /**
   * Get provider by ID
   */
  async findById(id: string): Promise<GitProvider | null> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get provider by name (github, gitlab, bitbucket)
   */
  async findByName(name: string): Promise<GitProvider | null> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  },

  /**
   * Get provider by type
   */
  async findByType(providerType: string): Promise<GitProvider | null> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers WHERE provider_type = $1',
      [providerType]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all enabled providers
   */
  async findEnabled(): Promise<GitProvider[]> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers WHERE is_enabled = true ORDER BY display_order, display_name'
    );
    return result.rows;
  },

  /**
   * Get providers with OAuth configured
   */
  async findWithOAuth(): Promise<GitProvider[]> {
    const result = await query<GitProvider>(
      'SELECT * FROM git_providers WHERE is_enabled = true AND is_oauth_configured = true ORDER BY display_order, display_name'
    );
    return result.rows;
  },

  /**
   * Update provider configuration
   */
  async update(id: string, input: UpdateGitProviderInput): Promise<GitProvider | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(input.display_name);
    }
    if (input.oauth_client_id !== undefined) {
      fields.push(`oauth_client_id = $${paramIndex++}`);
      values.push(input.oauth_client_id);
    }
    if (input.oauth_client_secret_encrypted !== undefined) {
      fields.push(`oauth_client_secret_encrypted = $${paramIndex++}`);
      values.push(input.oauth_client_secret_encrypted);
    }
    if (input.oauth_scopes !== undefined) {
      fields.push(`oauth_scopes = $${paramIndex++}`);
      values.push(input.oauth_scopes);
    }
    if (input.api_base_url !== undefined) {
      fields.push(`api_base_url = $${paramIndex++}`);
      values.push(input.api_base_url);
    }
    if (input.auth_url !== undefined) {
      fields.push(`auth_url = $${paramIndex++}`);
      values.push(input.auth_url);
    }
    if (input.token_url !== undefined) {
      fields.push(`token_url = $${paramIndex++}`);
      values.push(input.token_url);
    }
    if (input.is_enabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      values.push(input.is_enabled);
    }
    if (input.is_oauth_configured !== undefined) {
      fields.push(`is_oauth_configured = $${paramIndex++}`);
      values.push(input.is_oauth_configured);
    }
    if (input.icon_url !== undefined) {
      fields.push(`icon_url = $${paramIndex++}`);
      values.push(input.icon_url);
    }
    if (input.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(input.config));
    }

    // Auto-set is_oauth_configured if client credentials are being set
    if (input.oauth_client_id && input.oauth_client_secret_encrypted) {
      if (!fields.some(f => f.includes('is_oauth_configured'))) {
        fields.push(`is_oauth_configured = $${paramIndex++}`);
        values.push(true);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<GitProvider>(
      `UPDATE git_providers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Enable/disable a provider
   */
  async setEnabled(id: string, enabled: boolean): Promise<GitProvider | null> {
    const result = await query<GitProvider>(
      `UPDATE git_providers SET is_enabled = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [enabled, id]
    );
    return result.rows[0] || null;
  },

  /**
   * Clear OAuth credentials for a provider
   */
  async clearOAuthCredentials(id: string): Promise<GitProvider | null> {
    const result = await query<GitProvider>(
      `UPDATE git_providers SET
        oauth_client_id = NULL,
        oauth_client_secret_encrypted = NULL,
        is_oauth_configured = false,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get count of enabled providers
   */
  async countEnabled(): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM git_providers WHERE is_enabled = true'
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  },
};

export default gitProvidersRepository;
