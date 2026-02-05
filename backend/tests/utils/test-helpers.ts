/**
 * Test Helper Utilities
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'test-jwt-secret-for-testing-only';

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(userId: string, email: string = 'test@example.com'): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Hash a password for testing
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a valid MongoDB ObjectId
 */
export function generateObjectId(): string {
  return new mongoose.Types.ObjectId().toString();
}

/**
 * Check if a string is a valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Create a date in the past
 */
export function pastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Create a date in the future
 */
export function futureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up test data from a specific collection
 */
export async function cleanCollection(collectionName: string): Promise<void> {
  const collection = mongoose.connection.collection(collectionName);
  await collection.deleteMany({});
}

/**
 * Insert test data into a collection
 */
export async function insertTestData<T>(collectionName: string, data: T | T[]): Promise<void> {
  const collection = mongoose.connection.collection(collectionName);
  if (Array.isArray(data)) {
    await collection.insertMany(data as any[]);
  } else {
    await collection.insertOne(data as any);
  }
}

/**
 * Get all documents from a collection
 */
export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  const collection = mongoose.connection.collection(collectionName);
  return collection.find({}).toArray() as Promise<T[]>;
}

/**
 * Assert that an error has a specific message
 */
export function expectErrorMessage(error: any, expectedMessage: string): void {
  expect(error).toBeDefined();
  expect(error.message).toContain(expectedMessage);
}

/**
 * Create a mock request object
 */
export function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  };
}

/**
 * Create a mock response object
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    data: null
  };
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((data: any) => {
    res.data = data;
    return res;
  });
  res.send = jest.fn().mockReturnThis();
  return res;
}
