import postgresClient from './postgres/client.js';
import { runMigrations } from './postgres/migrate.js';
import mongoClient from './mongo/client.js';
import tenantRouter from './mongo/tenant-router.js';

// Re-export JSON database for backward compatibility
export { database as jsonDatabase, generateUUID, now } from './json/database.js';

export interface DatabaseStatus {
  postgres: boolean;
  mongo: boolean;
}

// Initialize all database connections and run migrations
export async function initializeDatabases(): Promise<DatabaseStatus> {
  console.log('[Database] Initializing connections...');

  const status: DatabaseStatus = {
    postgres: false,
    mongo: false,
  };

  // Connect to PostgreSQL and run migrations
  try {
    const pgConnected = await postgresClient.checkConnection();
    if (pgConnected) {
      console.log('[Database] PostgreSQL connected');
      // Run migrations on startup
      await runMigrations();
      status.postgres = true;
    } else {
      console.warn('[Database] PostgreSQL connection failed');
    }
  } catch (error) {
    console.error('[Database] PostgreSQL error:', error);
  }

  // Connect to MongoDB and initialize
  try {
    await mongoClient.connect();
    // Also initialize the tenant-router connection (separate client used by tenant-scoped services)
    await tenantRouter.connect();
    const mongoConnected = await mongoClient.checkConnection();
    if (mongoConnected) {
      console.log('[Database] MongoDB connected');
      // Initialize collections with validation schemas
      await mongoClient.initializeCollections();
      // Create indexes
      await mongoClient.createIndexes();
      status.mongo = true;
    } else {
      console.warn('[Database] MongoDB connection failed');
    }
  } catch (error) {
    console.error('[Database] MongoDB error:', error);
  }

  console.log('[Database] Initialization complete:', status);
  return status;
}

// Check health of all databases
export async function checkDatabaseHealth(): Promise<DatabaseStatus> {
  return {
    postgres: await postgresClient.checkConnection(),
    mongo: await mongoClient.checkConnection() && await tenantRouter.checkConnection(),
  };
}

// Close all database connections
export async function closeDatabases(): Promise<void> {
  console.log('[Database] Closing connections...');
  await Promise.all([
    postgresClient.close(),
    mongoClient.close(),
    tenantRouter.close(),
  ]);
  console.log('[Database] All connections closed');
}

// Export clients for direct access
export { postgresClient, mongoClient };

// Export repositories
export * from './postgres/repositories/index.js';
export * from './mongo/repositories/index.js';
