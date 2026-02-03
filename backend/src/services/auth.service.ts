import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import database, { generateUUID, now } from '../lib/database.js';
import { config } from '../config/index.js';

interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  role: string | null;
  organization_id?: string;
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
    const existing = await database.findOne<User>('users', {
      email: data.email.toLowerCase()
    });
    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user: User = {
      id: generateUUID(),
      name: data.name,
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      role: 'Member',
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('users', user);

    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  async login(data: LoginData): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // Get user
    const user = await database.findOne<User>('users', {
      email: data.email.toLowerCase()
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

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
    const user = await database.findById<User>('users', userId);

    if (!user) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateProfile(userId: string, data: { name?: string; avatar_url?: string }): Promise<Omit<User, 'password_hash'>> {
    const updated = await database.update<User>('users', userId, { ...data, updated_at: now() });

    if (!updated) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await database.findById<User>('users', userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash || '');

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await database.update<User>('users', userId, { password_hash: passwordHash, updated_at: now() });
  },

  async findOrCreateOAuthUser(data: OAuthUserData): Promise<{ user: Omit<User, 'password_hash'>; token: string; isNewUser: boolean }> {
    const normalizedEmail = data.email.toLowerCase();

    // First, try to find by OAuth provider ID (exact match for returning OAuth users)
    let user = await database.findOne<User>('users', {
      oauth_provider: data.oauthProvider,
      oauth_provider_id: data.oauthProviderId
    });

    if (user) {
      // User exists with this OAuth account - return token
      const token = generateToken(user);
      const { password_hash, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token, isNewUser: false };
    }

    // Try to find by email (for account linking)
    user = await database.findOne<User>('users', { email: normalizedEmail });

    if (user) {
      // Existing user found by email - link OAuth account
      const updated = await database.update<User>('users', user.id, {
        oauth_provider: data.oauthProvider,
        oauth_provider_id: data.oauthProviderId,
        updated_at: now(),
        avatar_url: user.avatar_url || data.avatarUrl || user.avatar_url,
      });

      const token = generateToken(updated!);
      const { password_hash, ...userWithoutPassword } = updated!;
      return { user: userWithoutPassword, token, isNewUser: false };
    }

    // No existing user - create new OAuth user
    const newUser: User = {
      id: generateUUID(),
      name: data.name,
      email: normalizedEmail,
      password_hash: undefined,
      avatar_url: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      role: 'Member',
      oauth_provider: data.oauthProvider,
      oauth_provider_id: data.oauthProviderId,
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('users', newUser);

    const token = generateToken(newUser);
    const { password_hash, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword, token, isNewUser: true };
  },
};
