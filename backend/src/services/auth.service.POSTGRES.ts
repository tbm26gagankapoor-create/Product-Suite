import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/postgres/client.js';
import { config } from '../config/index.js';

interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  designation: string | null;  // Maps to 'role' in frontend, 'designation' in DB
  tenant_id?: string;  // Changed from organization_id to tenant_id
  created_at: string;
  updated_at: string;
  oauth_provider?: 'microsoft' | 'google' | 'github' | null;
  oauth_provider_id?: string | null;
}

interface OAuthUserData {
  email: string;
  name: string;
  oauthProvider: 'microsoft' | 'google' | 'github';
  oauthProviderId: string;
  avatarUrl?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

export const authService = {
  async register(data: RegisterData): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // Check if user exists
    const existingResult = await query<User>(
      'SELECT id FROM users WHERE email = $1',
      [data.email.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Get first tenant (for simplicity - in production, this should be specified or from domain)
    const tenantResult = await query<{ id: string }>(
      'SELECT id FROM tenants WHERE is_active = true ORDER BY created_at LIMIT 1'
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('No active tenant found');
    }

    const tenantId = tenantResult.rows[0].id;

    // Create user
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, name, role, tenant_id, status, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id`,
      [
        data.email.toLowerCase(),
        passwordHash,
        data.name,
        'member',
        tenantId,
        'active',
        'https://avatar.iran.liara.run/public'
      ]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  async login(data: LoginData): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // Get user from PostgreSQL
    const result = await query<User>(
      `SELECT id, email, password_hash, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id
       FROM users
       WHERE email = $1 AND status = 'active'`,
      [data.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.password_hash || '');

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const result = await query<User>(
      `SELECT id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = result.rows[0] as any;
    return userWithoutPassword;
  },

  async updateProfile(userId: string, data: { name?: string; avatar_url?: string }): Promise<Omit<User, 'password_hash'>> {
    const result = await query<User>(
      `UPDATE users
       SET name = COALESCE($1, name),
           avatar_url = COALESCE($2, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'active'
       RETURNING id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id`,
      [data.name, data.avatar_url, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = result.rows[0] as any;
    return userWithoutPassword;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const result = await query<User>(
      'SELECT id, password_hash FROM users WHERE id = $1 AND status = $2',
      [userId, 'active']
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash || '');

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );
  },

  async findOrCreateOAuthUser(data: OAuthUserData): Promise<{ user: Omit<User, 'password_hash'>; token: string; isNewUser: boolean }> {
    const normalizedEmail = data.email.toLowerCase();

    // First, try to find by OAuth provider ID (exact match for returning OAuth users)
    let result = await query<User>(
      `SELECT id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id
       FROM users
       WHERE oauth_provider = $1 AND oauth_provider_id = $2 AND status = 'active'`,
      [data.oauthProvider, data.oauthProviderId]
    );

    if (result.rows.length > 0) {
      // User exists with this OAuth account - return token
      const user = result.rows[0];
      const token = generateToken(user);
      const { password_hash, ...userWithoutPassword } = user as any;
      return { user: userWithoutPassword, token, isNewUser: false };
    }

    // Try to find by email (for account linking)
    result = await query<User>(
      `SELECT id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id, password_hash
       FROM users
       WHERE email = $1 AND status = 'active'`,
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      // Existing user found by email - link OAuth account
      const user = result.rows[0];
      const updateResult = await query<User>(
        `UPDATE users
         SET oauth_provider = $1,
             oauth_provider_id = $2,
             avatar_url = COALESCE($3, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id`,
        [data.oauthProvider, data.oauthProviderId, data.avatarUrl, user.id]
      );

      const updated = updateResult.rows[0];
      const token = generateToken(updated);
      const { password_hash, ...userWithoutPassword } = updated as any;
      return { user: userWithoutPassword, token, isNewUser: false };
    }

    // No existing user - create new OAuth user
    // Get first tenant
    const tenantResult = await query<{ id: string }>(
      'SELECT id FROM tenants WHERE is_active = true ORDER BY created_at LIMIT 1'
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('No active tenant found');
    }

    const tenantId = tenantResult.rows[0].id;

    const newUserResult = await query<User>(
      `INSERT INTO users (email, name, role, tenant_id, status, avatar_url, oauth_provider, oauth_provider_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, name, role as designation, tenant_id, created_at, updated_at, avatar_url, oauth_provider, oauth_provider_id`,
      [
        normalizedEmail,
        data.name,
        'member',
        tenantId,
        'active',
        data.avatarUrl || 'https://avatar.iran.liara.run/public',
        data.oauthProvider,
        data.oauthProviderId
      ]
    );

    const newUser = newUserResult.rows[0];
    const token = generateToken(newUser);
    const { password_hash, ...userWithoutPassword } = newUser as any;
    return { user: userWithoutPassword, token, isNewUser: true };
  },
};
