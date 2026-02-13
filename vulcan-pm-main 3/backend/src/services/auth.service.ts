import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import database, { generateUUID, now } from '../db/json/database.js';
import { config } from '../config/index.js';

interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
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
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export const authService = {
  async register(data: RegisterData): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // Check if user exists
    const existing = database.findOne<User>('users', u => u.email.toLowerCase() === data.email.toLowerCase());
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

    database.insert('users', user);

    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  async login(data: LoginData): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // Get user
    const user = database.findOne<User>('users', u => u.email.toLowerCase() === data.email.toLowerCase());

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
    const user = database.findById<User>('users', userId);

    if (!user) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateProfile(userId: string, data: { name?: string; avatar_url?: string }): Promise<Omit<User, 'password_hash'>> {
    const updated = database.update<User>('users', userId, { ...data, updated_at: now() });

    if (!updated) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = database.findById<User>('users', userId);

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

    database.update<User>('users', userId, { password_hash: passwordHash, updated_at: now() });
  },
};
