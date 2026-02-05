/**
 * Jest Setup File
 * Configures MongoDB Memory Server for isolated testing
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Global test utilities
export const testUtils = {
  /**
   * Generate a valid MongoDB ObjectId string
   */
  generateId(): string {
    return new mongoose.Types.ObjectId().toString();
  },

  /**
   * Wait for a specified duration
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Get the mongoose connection
   */
  getConnection() {
    return mongoose.connection;
  }
};
