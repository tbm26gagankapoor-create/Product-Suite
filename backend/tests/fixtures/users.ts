/**
 * User Test Fixtures
 * Pre-defined test users for consistent testing
 */

import { faker } from '@faker-js/faker';
import database, { now } from '../../src/lib/database.js';
import bcrypt from 'bcryptjs';

export const testUsers = {
  admin: {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin123!',
    designation: 'Admin'
  },
  member: {
    name: 'Member User',
    email: 'member@test.com',
    password: 'Member123!',
    designation: 'Member'
  },
  viewer: {
    name: 'Viewer User',
    email: 'viewer@test.com',
    password: 'Viewer123!',
    designation: 'Member'
  }
};

/**
 * Generate a random user with optional overrides
 */
export function createTestUser(overrides: Partial<typeof testUsers.member> = {}) {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: 'TestPass123!',
    designation: 'Member',
    ...overrides
  };
}

/**
 * Generate multiple random users
 */
export function createTestUsers(count: number, overrides: Partial<typeof testUsers.member> = {}) {
  return Array.from({ length: count }, () => createTestUser(overrides));
}

/**
 * Create a user document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 *
 * @param overrides - Optional fields to override. Can include:
 *   - password: Plain text password to hash
 *   - password_hash: Pre-hashed password (takes precedence over password)
 */
export async function createUserDocument(overrides: Record<string, any> = {}) {
  // Use pre-hashed password if provided, otherwise hash the password
  let passwordHash: string;
  if (overrides.password_hash) {
    passwordHash = overrides.password_hash;
  } else {
    const password = overrides.password || 'TestPass123!';
    passwordHash = await bcrypt.hash(password, 12);
  }

  const user = {
    name: overrides.name || faker.person.fullName(),
    email: overrides.email || faker.internet.email().toLowerCase(),
    password_hash: passwordHash,
    avatar_url: overrides.avatar_url || faker.image.avatar(),
    designation: overrides.designation || 'Member',
    status: overrides.status || 'active',
    organization_id: overrides.organization_id || null,
    oauth_provider: overrides.oauth_provider || null,
    oauth_id: overrides.oauth_id || null,
    created_at: now(),
    updated_at: now(),
  };

  // Return the inserted document which has the correct MongoDB _id as 'id'
  return database.insert<typeof user & { id: string }>('users', user);
}
