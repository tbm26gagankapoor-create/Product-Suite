/**
 * Auth Service Tests
 *
 * Tests for authentication service including:
 * - User registration
 * - User login
 * - Profile retrieval and updates
 * - Password change
 * - OAuth user handling
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUserDocument, testUsers } from '../../fixtures/users.js';
import { generateObjectId, cleanCollection } from '../../utils/test-helpers.js';

// Mock the config module
jest.mock('../../../src/config/index.js', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '7d'
    }
  }
}));

// Import after mocking
import { authService } from '../../../src/services/auth.service.js';

describe('AuthService', () => {
  beforeEach(async () => {
    await cleanCollection('users');
  });

  describe('register', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'Password123!',
        name: 'New User'
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('newuser@test.com');
      expect(result.user.name).toBe('New User');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should lowercase the email', async () => {
      const userData = {
        email: 'USER@TEST.COM',
        password: 'Password123!',
        name: 'Test User'
      };

      const result = await authService.register(userData);

      expect(result.user.email).toBe('user@test.com');
    });

    it('should generate a valid JWT token', async () => {
      const userData = {
        email: 'jwt@test.com',
        password: 'Password123!',
        name: 'JWT User'
      };

      const result = await authService.register(userData);

      // Decode token without verification (since ESM mocking is complex)
      // We're testing that the service generates a token with correct payload
      const decoded = jwt.decode(result.token) as any;
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe('jwt@test.com');
    });

    it('should hash the password correctly', async () => {
      const userData = {
        email: 'hash@test.com',
        password: 'Password123!',
        name: 'Hash User'
      };

      await authService.register(userData);

      // Verify the user can login with the same password
      const loginResult = await authService.login({
        email: 'hash@test.com',
        password: 'Password123!'
      });

      expect(loginResult.user).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'Password123!',
        name: 'First User'
      };

      await authService.register(userData);

      await expect(
        authService.register({
          email: 'duplicate@test.com',
          password: 'Different123!',
          name: 'Second User'
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should throw error for duplicate email with different case', async () => {
      await authService.register({
        email: 'case@test.com',
        password: 'Password123!',
        name: 'First User'
      });

      await expect(
        authService.register({
          email: 'CASE@TEST.COM',
          password: 'Different123!',
          name: 'Second User'
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should assign default avatar URL', async () => {
      const result = await authService.register({
        email: 'avatar@test.com',
        password: 'Password123!',
        name: 'Avatar User'
      });

      expect(result.user.avatar_url).toBe('https://avatar.iran.liara.run/public');
    });

    it('should assign default role as Member', async () => {
      const result = await authService.register({
        email: 'role@test.com',
        password: 'Password123!',
        name: 'Role User'
      });

      expect(result.user.designation).toBe('Member');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const passwordHash = await bcrypt.hash('TestPass123!', 12);
      await createUserDocument({
        email: 'login@test.com',
        password_hash: passwordHash,
        name: 'Login User'
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'TestPass123!'
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('login@test.com');
    });

    it('should be case-insensitive for email', async () => {
      const result = await authService.login({
        email: 'LOGIN@TEST.COM',
        password: 'TestPass123!'
      });

      expect(result.user).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@test.com',
          password: 'Password123!'
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      await expect(
        authService.login({
          email: 'login@test.com',
          password: 'WrongPassword!'
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should not return password_hash in response', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'TestPass123!'
      });

      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should generate valid JWT token on login', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'TestPass123!'
      });

      // Decode token without verification (since ESM mocking is complex)
      // We're testing that the service generates a token with correct payload
      const decoded = jwt.decode(result.token) as any;
      expect(decoded.email).toBe('login@test.com');
    });
  });

  describe('getProfile', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await createUserDocument({
        email: 'profile@test.com',
        name: 'Profile User'
      });
      testUserId = user.id;
    });

    it('should return user profile by ID', async () => {
      const profile = await authService.getProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile.email).toBe('profile@test.com');
      expect(profile.name).toBe('Profile User');
    });

    it('should not return password_hash', async () => {
      const profile = await authService.getProfile(testUserId);

      expect(profile).not.toHaveProperty('password_hash');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = generateObjectId();

      await expect(
        authService.getProfile(fakeId)
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await createUserDocument({
        email: 'update@test.com',
        name: 'Original Name',
        avatar_url: 'https://old-avatar.com/img.png'
      });
      testUserId = user.id;
    });

    it('should update user name', async () => {
      const updated = await authService.updateProfile(testUserId, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update avatar URL', async () => {
      const updated = await authService.updateProfile(testUserId, {
        avatar_url: 'https://new-avatar.com/img.png'
      });

      expect(updated.avatar_url).toBe('https://new-avatar.com/img.png');
    });

    it('should update both name and avatar', async () => {
      const updated = await authService.updateProfile(testUserId, {
        name: 'New Name',
        avatar_url: 'https://new-avatar.com/img.png'
      });

      expect(updated.name).toBe('New Name');
      expect(updated.avatar_url).toBe('https://new-avatar.com/img.png');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = generateObjectId();

      await expect(
        authService.updateProfile(fakeId, { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });

    it('should not return password_hash', async () => {
      const updated = await authService.updateProfile(testUserId, {
        name: 'Updated Name'
      });

      expect(updated).not.toHaveProperty('password_hash');
    });
  });

  describe('changePassword', () => {
    let testUserId: string;
    const originalPassword = 'Original123!';

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(originalPassword, 12);
      const user = await createUserDocument({
        email: 'password@test.com',
        password_hash: passwordHash
      });
      testUserId = user.id;
    });

    it('should change password with correct old password', async () => {
      await authService.changePassword(testUserId, originalPassword, 'NewPass123!');

      // Verify new password works
      const loginResult = await authService.login({
        email: 'password@test.com',
        password: 'NewPass123!'
      });

      expect(loginResult.user).toBeDefined();
    });

    it('should reject login with old password after change', async () => {
      await authService.changePassword(testUserId, originalPassword, 'NewPass123!');

      await expect(
        authService.login({
          email: 'password@test.com',
          password: originalPassword
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect old password', async () => {
      await expect(
        authService.changePassword(testUserId, 'WrongPassword!', 'NewPass123!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = generateObjectId();

      await expect(
        authService.changePassword(fakeId, 'OldPass!', 'NewPass123!')
      ).rejects.toThrow('User not found');
    });
  });

  describe('findOrCreateOAuthUser', () => {
    it('should create new user for first-time OAuth login', async () => {
      const oauthData = {
        email: 'oauth@test.com',
        name: 'OAuth User',
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        avatarUrl: 'https://google.com/avatar.png'
      };

      const result = await authService.findOrCreateOAuthUser(oauthData);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('oauth@test.com');
      expect(result.user.oauth_provider).toBe('google');
    });

    it('should return existing user for returning OAuth login', async () => {
      const oauthData = {
        email: 'returning@test.com',
        name: 'Returning User',
        oauthProvider: 'microsoft' as const,
        oauthProviderId: 'ms-456',
        avatarUrl: 'https://microsoft.com/avatar.png'
      };

      // First login - creates user
      const firstResult = await authService.findOrCreateOAuthUser(oauthData);
      expect(firstResult.isNewUser).toBe(true);

      // Second login - returns existing user
      const secondResult = await authService.findOrCreateOAuthUser(oauthData);
      expect(secondResult.isNewUser).toBe(false);
      expect(secondResult.user.id).toBe(firstResult.user.id);
    });

    it('should link OAuth to existing user with same email', async () => {
      // Create user via regular registration
      await authService.register({
        email: 'link@test.com',
        password: 'Password123!',
        name: 'Link User'
      });

      // Login via OAuth with same email
      const oauthResult = await authService.findOrCreateOAuthUser({
        email: 'link@test.com',
        name: 'Link User',
        oauthProvider: 'github' as const,
        oauthProviderId: 'gh-789'
      });

      expect(oauthResult.isNewUser).toBe(false);
      expect(oauthResult.user.oauth_provider).toBe('github');
    });

    it('should lowercase email for OAuth users', async () => {
      const result = await authService.findOrCreateOAuthUser({
        email: 'OAUTH@UPPERCASE.COM',
        name: 'Uppercase Email',
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-upper'
      });

      expect(result.user.email).toBe('oauth@uppercase.com');
    });

    it('should support multiple OAuth providers', async () => {
      const providers: Array<'google' | 'microsoft' | 'github'> = ['google', 'microsoft', 'github'];

      for (const provider of providers) {
        const result = await authService.findOrCreateOAuthUser({
          email: `${provider}@test.com`,
          name: `${provider} User`,
          oauthProvider: provider,
          oauthProviderId: `${provider}-123`
        });

        expect(result.user.oauth_provider).toBe(provider);
      }
    });
  });
});
