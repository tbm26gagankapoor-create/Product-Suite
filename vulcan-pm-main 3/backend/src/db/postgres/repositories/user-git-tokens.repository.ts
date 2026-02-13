import { query } from '../client.js';

export interface UserGitToken {
  id: string;
  user_id: string;
  provider_id: string;
  auth_type: 'oauth' | 'pat';
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
  scopes: string | null;
  provider_user_id: string | null;
  provider_username: string | null;
  provider_email: string | null;
  provider_avatar_url: string | null;
  is_valid: boolean;
  last_used_at: Date | null;
  last_validated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserGitTokenWithProvider extends UserGitToken {
  provider_name: string;
  provider_display_name: string;
  provider_type: string;
  provider_icon_url: string | null;
}

export interface CreateUserGitTokenInput {
  user_id: string;
  provider_id: string;
  auth_type: 'oauth' | 'pat';
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  token_expires_at?: Date;
  scopes?: string;
  provider_user_id?: string;
  provider_username?: string;
  provider_email?: string;
  provider_avatar_url?: string;
}

export interface UpdateUserGitTokenInput {
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: Date;
  scopes?: string;
  provider_user_id?: string;
  provider_username?: string;
  provider_email?: string;
  provider_avatar_url?: string;
  is_valid?: boolean;
  last_used_at?: Date;
  last_validated_at?: Date;
}

export const userGitTokensRepository = {
  /**
   * Get token by ID
   */
  async findById(id: string): Promise<UserGitToken | null> {
    const result = await query<UserGitToken>(
      'SELECT * FROM user_git_tokens WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get user's token for a specific provider
   */
  async findByUserAndProvider(userId: string, providerId: string): Promise<UserGitToken | null> {
    const result = await query<UserGitToken>(
      'SELECT * FROM user_git_tokens WHERE user_id = $1 AND provider_id = $2',
      [userId, providerId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all tokens for a user (with provider details)
   */
  async findByUser(userId: string): Promise<UserGitTokenWithProvider[]> {
    const result = await query<UserGitTokenWithProvider>(
      `SELECT t.*,
              p.name as provider_name,
              p.display_name as provider_display_name,
              p.provider_type,
              p.icon_url as provider_icon_url
       FROM user_git_tokens t
       JOIN git_providers p ON t.provider_id = p.id
       WHERE t.user_id = $1
       ORDER BY p.display_order, p.display_name`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Get all valid tokens for a user
   */
  async findValidByUser(userId: string): Promise<UserGitTokenWithProvider[]> {
    const result = await query<UserGitTokenWithProvider>(
      `SELECT t.*,
              p.name as provider_name,
              p.display_name as provider_display_name,
              p.provider_type,
              p.icon_url as provider_icon_url
       FROM user_git_tokens t
       JOIN git_providers p ON t.provider_id = p.id
       WHERE t.user_id = $1 AND t.is_valid = true
       ORDER BY p.display_order, p.display_name`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Create or update a user's token for a provider
   * Uses UPSERT to handle both cases
   */
  async upsert(input: CreateUserGitTokenInput): Promise<UserGitToken> {
    const result = await query<UserGitToken>(
      `INSERT INTO user_git_tokens (
        user_id, provider_id, auth_type, access_token_encrypted,
        refresh_token_encrypted, token_expires_at, scopes,
        provider_user_id, provider_username, provider_email, provider_avatar_url,
        is_valid, last_validated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
      ON CONFLICT (user_id, provider_id) DO UPDATE SET
        auth_type = EXCLUDED.auth_type,
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        scopes = EXCLUDED.scopes,
        provider_user_id = EXCLUDED.provider_user_id,
        provider_username = EXCLUDED.provider_username,
        provider_email = EXCLUDED.provider_email,
        provider_avatar_url = EXCLUDED.provider_avatar_url,
        is_valid = true,
        last_validated_at = NOW(),
        updated_at = NOW()
      RETURNING *`,
      [
        input.user_id,
        input.provider_id,
        input.auth_type,
        input.access_token_encrypted,
        input.refresh_token_encrypted || null,
        input.token_expires_at || null,
        input.scopes || null,
        input.provider_user_id || null,
        input.provider_username || null,
        input.provider_email || null,
        input.provider_avatar_url || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Create a new token
   */
  async create(input: CreateUserGitTokenInput): Promise<UserGitToken> {
    const result = await query<UserGitToken>(
      `INSERT INTO user_git_tokens (
        user_id, provider_id, auth_type, access_token_encrypted,
        refresh_token_encrypted, token_expires_at, scopes,
        provider_user_id, provider_username, provider_email, provider_avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        input.user_id,
        input.provider_id,
        input.auth_type,
        input.access_token_encrypted,
        input.refresh_token_encrypted || null,
        input.token_expires_at || null,
        input.scopes || null,
        input.provider_user_id || null,
        input.provider_username || null,
        input.provider_email || null,
        input.provider_avatar_url || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Update token
   */
  async update(id: string, input: UpdateUserGitTokenInput): Promise<UserGitToken | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.access_token_encrypted !== undefined) {
      fields.push(`access_token_encrypted = $${paramIndex++}`);
      values.push(input.access_token_encrypted);
    }
    if (input.refresh_token_encrypted !== undefined) {
      fields.push(`refresh_token_encrypted = $${paramIndex++}`);
      values.push(input.refresh_token_encrypted);
    }
    if (input.token_expires_at !== undefined) {
      fields.push(`token_expires_at = $${paramIndex++}`);
      values.push(input.token_expires_at);
    }
    if (input.scopes !== undefined) {
      fields.push(`scopes = $${paramIndex++}`);
      values.push(input.scopes);
    }
    if (input.provider_user_id !== undefined) {
      fields.push(`provider_user_id = $${paramIndex++}`);
      values.push(input.provider_user_id);
    }
    if (input.provider_username !== undefined) {
      fields.push(`provider_username = $${paramIndex++}`);
      values.push(input.provider_username);
    }
    if (input.provider_email !== undefined) {
      fields.push(`provider_email = $${paramIndex++}`);
      values.push(input.provider_email);
    }
    if (input.provider_avatar_url !== undefined) {
      fields.push(`provider_avatar_url = $${paramIndex++}`);
      values.push(input.provider_avatar_url);
    }
    if (input.is_valid !== undefined) {
      fields.push(`is_valid = $${paramIndex++}`);
      values.push(input.is_valid);
    }
    if (input.last_used_at !== undefined) {
      fields.push(`last_used_at = $${paramIndex++}`);
      values.push(input.last_used_at);
    }
    if (input.last_validated_at !== undefined) {
      fields.push(`last_validated_at = $${paramIndex++}`);
      values.push(input.last_validated_at);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<UserGitToken>(
      `UPDATE user_git_tokens SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Mark token as invalid (e.g., after 401 response)
   */
  async markAsInvalid(id: string): Promise<UserGitToken | null> {
    const result = await query<UserGitToken>(
      `UPDATE user_git_tokens SET is_valid = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    await query(
      `UPDATE user_git_tokens SET last_used_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  /**
   * Delete token (disconnect provider)
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM user_git_tokens WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Delete user's token for a provider
   */
  async deleteByUserAndProvider(userId: string, providerId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM user_git_tokens WHERE user_id = $1 AND provider_id = $2',
      [userId, providerId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Delete all tokens for a user
   */
  async deleteAllByUser(userId: string): Promise<number> {
    const result = await query(
      'DELETE FROM user_git_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rowCount ?? 0;
  },

  /**
   * Count tokens by provider (for analytics)
   */
  async countByProvider(providerId: string): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_git_tokens WHERE provider_id = $1 AND is_valid = true',
      [providerId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  /**
   * Check if user has valid token for provider
   */
  async hasValidToken(userId: string, providerId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM user_git_tokens
        WHERE user_id = $1 AND provider_id = $2 AND is_valid = true
      ) as exists`,
      [userId, providerId]
    );
    return result.rows[0]?.exists || false;
  },
};

export default userGitTokensRepository;
