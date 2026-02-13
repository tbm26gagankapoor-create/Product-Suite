import mongoose from 'mongoose';
import { config } from '../config/index.js';

/**
 * TenantRouter - Routes to tenant-specific MongoDB databases
 *
 * Architecture:
 *   - One MongoDB cluster/connection
 *   - One database per tenant: t_<tenantId_without_hyphens>
 *   - Uses Mongoose for connection management
 *
 * Database naming: t_{uuid_without_hyphens}  (34 chars, under MongoDB's 38-byte limit)
 */

// Cache of tenant connections
const tenantConnections = new Map<string, mongoose.Connection>();

// Database name prefix for tenant databases
const TENANT_DB_PREFIX = 't_';

/**
 * Get tenant-specific MongoDB connection (async)
 * Creates: t_<tenantId without hyphens>
 *
 * @param tenantId - The tenant UUID (with or without hyphens)
 * @returns Promise resolving to Mongoose connection for the tenant's database
 */
export async function getTenantConnection(tenantId: string): Promise<mongoose.Connection> {
  if (!tenantId) {
    throw new Error('[TenantRouter] tenantId is required');
  }

  // Check cache first
  const cached = tenantConnections.get(tenantId);
  if (cached && cached.readyState === 1) {
    return cached;
  }

  // Create database name: remove hyphens from UUID
  // t_ + UUID without hyphens = 34 chars (under MongoDB's 38 byte limit)
  const safeTenantId = tenantId.replace(/-/g, '');
  const dbName = `${TENANT_DB_PREFIX}${safeTenantId}`;

  // Parse MongoDB URI to extract base and query params
  const baseUri = config.database.mongoUri.split('/').slice(0, 3).join('/');
  const queryParams = config.database.mongoUri.includes('?')
    ? '?' + config.database.mongoUri.split('?')[1]
    : '';

  // Ensure write concern for MongoDB Atlas
  const hasWriteConcern = queryParams.includes('w=');
  const finalParams = hasWriteConcern
    ? queryParams
    : (queryParams ? `${queryParams}&w=majority` : '?w=majority');

  const tenantUri = `${baseUri}/${dbName}${finalParams}`;

  // Create new connection for this tenant
  const connection = mongoose.createConnection(tenantUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });

  // Wait for connection to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`[TenantRouter] Connection timeout for ${dbName}`));
    }, 10000);

    connection.once('connected', () => {
      clearTimeout(timeout);
      console.log(`[TenantRouter] Connected to tenant database: ${dbName}`);
      resolve();
    });

    connection.once('error', (err) => {
      clearTimeout(timeout);
      console.error(`[TenantRouter] Connection error for ${dbName}:`, err.message);
      reject(err);
    });
  });

  // Cache the connection
  tenantConnections.set(tenantId, connection);

  connection.on('disconnected', () => {
    console.log(`[TenantRouter] Disconnected from tenant database: ${dbName}`);
    tenantConnections.delete(tenantId);
  });

  return connection;
}

/**
 * Close a tenant's database connection
 */
export async function closeTenantConnection(tenantId: string): Promise<void> {
  const connection = tenantConnections.get(tenantId);
  if (connection) {
    await connection.close();
    tenantConnections.delete(tenantId);
  }
}

/**
 * Close all tenant connections
 */
export async function closeAllTenantConnections(): Promise<void> {
  const closePromises = Array.from(tenantConnections.values()).map(conn => conn.close());
  await Promise.all(closePromises);
  tenantConnections.clear();
  console.log('[TenantRouter] All tenant connections closed');
}

/**
 * Collection names (same structure in each tenant DB)
 */
export const Collections = {
  PROJECTS: 'projects',
  TASKS: 'tasks',
  SPRINTS: 'sprints',
  COLUMNS: 'columns',
  TAGS: 'tags',
  COMMENTS: 'comments',
  DOCUMENTS: 'documents',
  DOCUMENT_COMMENTS: 'document_comments',
  ACTIVITY_LOG: 'activities',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  DRAFT_PROJECTS: 'draft_projects',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
} as const;

/**
 * Initialize collections and indexes for a tenant database
 */
export async function initializeTenantDb(tenantId: string): Promise<void> {
  const connection = getTenantConnection(tenantId);
  const dbName = `t_${tenantId.replace(/-/g, '')}`;

  console.log(`[TenantRouter] Initializing tenant database: ${dbName}`);

  try {
    // Wait for connection to be ready
    if (connection.readyState !== 1) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    // Create indexes
    await createTenantIndexes(connection);

    console.log(`[TenantRouter] Tenant database initialized: ${dbName}`);
  } catch (error) {
    console.error(`[TenantRouter] Failed to initialize ${dbName}:`, error);
    throw error;
  }
}

/**
 * Create indexes for a tenant database
 */
async function createTenantIndexes(connection: mongoose.Connection): Promise<void> {
  const db = connection.db;

  // Projects indexes
  await db.collection(Collections.PROJECTS).createIndex({ slug: 1 }, { unique: true });
  await db.collection(Collections.PROJECTS).createIndex({ created_at: -1 });

  // Tasks indexes
  await db.collection(Collections.TASKS).createIndex({ project_id: 1 });
  await db.collection(Collections.TASKS).createIndex({ sprint_id: 1 });
  await db.collection(Collections.TASKS).createIndex({ assigned_to: 1 });
  await db.collection(Collections.TASKS).createIndex({ status: 1 });
  await db.collection(Collections.TASKS).createIndex({ type: 1 });

  // Sprints indexes
  await db.collection(Collections.SPRINTS).createIndex({ project_id: 1 });
  await db.collection(Collections.SPRINTS).createIndex({ status: 1 });
  await db.collection(Collections.SPRINTS).createIndex({ start_date: 1 });

  // Comments indexes
  await db.collection(Collections.COMMENTS).createIndex({ task_id: 1 });
  await db.collection(Collections.COMMENTS).createIndex({ created_at: -1 });

  // Documents indexes
  await db.collection(Collections.DOCUMENTS).createIndex({ project_id: 1 });
  await db.collection(Collections.DOCUMENTS).createIndex({ type: 1 });

  // Document comments indexes
  await db.collection(Collections.DOCUMENT_COMMENTS).createIndex({ document_id: 1 });
  await db.collection(Collections.DOCUMENT_COMMENTS).createIndex({ created_at: -1 });

  // Activity log with TTL (90 days)
  await db.collection(Collections.ACTIVITY_LOG).createIndex({ entity_type: 1, entity_id: 1 });
  await db.collection(Collections.ACTIVITY_LOG).createIndex({ user_id: 1 });
  await db.collection(Collections.ACTIVITY_LOG).createIndex({ created_at: -1 });
  await db.collection(Collections.ACTIVITY_LOG).createIndex(
    { created_at: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  );

  // Notifications indexes
  await db.collection(Collections.NOTIFICATIONS).createIndex({ user_id: 1 });
  await db.collection(Collections.NOTIFICATIONS).createIndex({ read: 1 });
  await db.collection(Collections.NOTIFICATIONS).createIndex({ created_at: -1 });

  // Draft projects indexes
  await db.collection(Collections.DRAFT_PROJECTS).createIndex({ user_id: 1 });
  await db.collection(Collections.DRAFT_PROJECTS).createIndex({ created_at: -1 });

  // Teams indexes
  await db.collection(Collections.TEAMS).createIndex({ project_id: 1 });

  // Team members indexes
  await db.collection(Collections.TEAM_MEMBERS).createIndex({ team_id: 1 });
  await db.collection(Collections.TEAM_MEMBERS).createIndex({ user_id: 1 });

  // Tags & Columns indexes
  await db.collection(Collections.TAGS).createIndex({ project_id: 1 });
  await db.collection(Collections.COLUMNS).createIndex({ project_id: 1 });
  await db.collection(Collections.COLUMNS).createIndex({ display_order: 1 });
}

/**
 * TenantDb - Convenience class for working with a tenant's database
 */
export class TenantDb {
  private connection: mongoose.Connection;
  public readonly tenantId: string;

  private constructor(tenantId: string, connection: mongoose.Connection) {
    this.tenantId = tenantId;
    this.connection = connection;
  }

  /**
   * Create a TenantDb instance (async factory method)
   */
  static async create(tenantId: string): Promise<TenantDb> {
    const connection = await getTenantConnection(tenantId);
    return new TenantDb(tenantId, connection);
  }

  get databaseName(): string {
    return this.connection.name;
  }

  get db(): mongoose.Connection['db'] {
    return this.connection.db;
  }

  // Collection accessors
  projects() {
    return this.connection.db.collection(Collections.PROJECTS);
  }

  tasks() {
    return this.connection.db.collection(Collections.TASKS);
  }

  sprints() {
    return this.connection.db.collection(Collections.SPRINTS);
  }

  columns() {
    return this.connection.db.collection(Collections.COLUMNS);
  }

  tags() {
    return this.connection.db.collection(Collections.TAGS);
  }

  comments() {
    return this.connection.db.collection(Collections.COMMENTS);
  }

  documents() {
    return this.connection.db.collection(Collections.DOCUMENTS);
  }

  documentComments() {
    return this.connection.db.collection(Collections.DOCUMENT_COMMENTS);
  }

  activityLog() {
    return this.connection.db.collection(Collections.ACTIVITY_LOG);
  }

  notifications() {
    return this.connection.db.collection(Collections.NOTIFICATIONS);
  }

  notificationPreferences() {
    return this.connection.db.collection(Collections.NOTIFICATION_PREFERENCES);
  }

  draftProjects() {
    return this.connection.db.collection(Collections.DRAFT_PROJECTS);
  }

  teams() {
    return this.connection.db.collection(Collections.TEAMS);
  }

  teamMembers() {
    return this.connection.db.collection(Collections.TEAM_MEMBERS);
  }

  // Generic collection accessor
  collection(name: string) {
    return this.connection.db.collection(name);
  }

  // Get Mongoose models for this tenant
  model<T>(name: string, schema: mongoose.Schema<T>): mongoose.Model<T> {
    return this.connection.model<T>(name, schema);
  }
}

/**
 * Factory function to create TenantDb instance (async)
 */
export async function createTenantDb(tenantId: string): Promise<TenantDb> {
  return await TenantDb.create(tenantId);
}

/**
 * Check if a tenant database exists
 */
export async function tenantDbExists(tenantId: string): Promise<boolean> {
  try {
    const connection = getTenantConnection(tenantId);
    const collections = await connection.db.listCollections().toArray();
    return collections.length > 0;
  } catch {
    return false;
  }
}

export default {
  getTenantConnection,
  closeTenantConnection,
  closeAllTenantConnections,
  initializeTenantDb,
  createTenantDb,
  tenantDbExists,
  TenantDb,
  Collections,
};
