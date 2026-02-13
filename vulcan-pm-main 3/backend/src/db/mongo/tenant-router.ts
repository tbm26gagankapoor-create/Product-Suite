import { MongoClient, Db, Collection, Document } from 'mongodb';
import { config } from '../../config/index.js';

/**
 * TenantRouter - Routes to tenant-specific databases
 *
 * Architecture:
 *   - One MongoDB cluster/connection
 *   - One database per tenant: tenant_<tenantId>
 *   - Shared system database for cross-tenant data
 */

let client: MongoClient | null = null;

// Database name prefix for tenant databases
const TENANT_DB_PREFIX = 'tenant_';
const SYSTEM_DB_NAME = config.mongo.dbName || 'infinia_system';

/**
 * Initialize MongoDB connection
 */
export async function connect(): Promise<MongoClient> {
  if (client) return client;

  client = new MongoClient(config.mongo.url, {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  });

  await client.connect();
  console.log('[MongoDB] Connected to cluster');

  return client;
}

/**
 * Get the MongoDB client
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new Error('[MongoDB] Not connected. Call connect() first.');
  }
  return client;
}

/**
 * Get the system database (for cross-tenant data)
 */
export function getSystemDb(): Db {
  return getClient().db(SYSTEM_DB_NAME);
}

/**
 * Get tenant-specific database
 * Creates: tenant_<tenantId>
 */
export function getTenantDb(tenantId: string): Db {
  if (!tenantId) {
    throw new Error('[MongoDB] tenantId is required');
  }

  // Sanitize tenant ID for database name (alphanumeric + underscore only)
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dbName = `${TENANT_DB_PREFIX}${safeTenantId}`;

  return getClient().db(dbName);
}

/**
 * Get collection from tenant database
 */
export function getTenantCollection<T extends Document>(
  tenantId: string,
  collectionName: string
): Collection<T> {
  return getTenantDb(tenantId).collection<T>(collectionName);
}

/**
 * Get collection from system database
 */
export function getSystemCollection<T extends Document>(
  collectionName: string
): Collection<T> {
  return getSystemDb().collection<T>(collectionName);
}

/**
 * Collection names (same structure in each tenant DB)
 */
export const Collections = {
  // Tenant-specific collections
  PROJECTS: 'projects',
  TASKS: 'tasks',
  SPRINTS: 'sprints',
  COLUMNS: 'columns',
  TAGS: 'tags',
  COMMENTS: 'comments',
  SUBTASKS: 'subtasks',
  ATTACHMENTS: 'attachments',
  ACTIVITY_LOG: 'activity_log',
  DOCUMENTS: 'documents',
  PROJECT_MEMBERS: 'project_members',
} as const;

/**
 * Initialize collections and indexes for a tenant database
 */
export async function initializeTenantDb(tenantId: string): Promise<void> {
  const db = getTenantDb(tenantId);
  console.log(`[MongoDB] Initializing tenant database: ${db.databaseName}`);

  // Get existing collections
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map(c => c.name));

  // Create collections if they don't exist
  for (const name of Object.values(Collections)) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }

  // Create indexes
  await createTenantIndexes(db);

  console.log(`[MongoDB] Tenant database initialized: ${db.databaseName}`);
}

/**
 * Create indexes for a tenant database
 */
async function createTenantIndexes(db: Db): Promise<void> {
  // Projects indexes
  await db.collection(Collections.PROJECTS).createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { owner_id: 1 } },
    { key: { created_at: -1 } },
  ]);

  // Tasks indexes
  await db.collection(Collections.TASKS).createIndexes([
    { key: { project_id: 1 } },
    { key: { sprint_id: 1 } },
    { key: { assignee_id: 1 } },
    { key: { column_id: 1 } },
    { key: { type: 1 } },
    { key: { priority: 1 } },
    { key: { created_at: -1 } },
    { key: { project_id: 1, task_number: 1 }, unique: true },
    { key: { task_key: 1 }, unique: true },
  ]);

  // Sprints indexes
  await db.collection(Collections.SPRINTS).createIndexes([
    { key: { project_id: 1 } },
    { key: { status: 1 } },
    { key: { start_date: 1 } },
  ]);

  // Comments indexes
  await db.collection(Collections.COMMENTS).createIndexes([
    { key: { task_id: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } },
  ]);

  // Activity log with TTL
  await db.collection(Collections.ACTIVITY_LOG).createIndexes([
    { key: { entity_type: 1, entity_id: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } },
    { key: { created_at: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 },
  ]);

  // Project members
  await db.collection(Collections.PROJECT_MEMBERS).createIndexes([
    { key: { project_id: 1 } },
    { key: { user_id: 1 } },
    { key: { project_id: 1, user_id: 1 }, unique: true },
  ]);

  // Tags & Columns
  await db.collection(Collections.TAGS).createIndexes([
    { key: { project_id: 1 } },
  ]);

  await db.collection(Collections.COLUMNS).createIndexes([
    { key: { project_id: 1 } },
    { key: { project_id: 1, display_order: 1 } },
  ]);
}

/**
 * Drop a tenant's database (use with caution!)
 */
export async function dropTenantDb(tenantId: string): Promise<void> {
  const db = getTenantDb(tenantId);
  console.log(`[MongoDB] Dropping tenant database: ${db.databaseName}`);
  await db.dropDatabase();
}

/**
 * List all tenant databases
 */
export async function listTenantDbs(): Promise<string[]> {
  const adminDb = getClient().db().admin();
  const { databases } = await adminDb.listDatabases();

  return databases
    .map(db => db.name)
    .filter(name => name.startsWith(TENANT_DB_PREFIX))
    .map(name => name.replace(TENANT_DB_PREFIX, ''));
}

/**
 * Check connection health
 */
export async function checkConnection(): Promise<boolean> {
  try {
    if (!client) return false;
    await client.db().admin().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close connection
 */
export async function close(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    console.log('[MongoDB] Connection closed');
  }
}

/**
 * TenantDb - Convenience class for working with a tenant's database
 */
export class TenantDb {
  private db: Db;

  constructor(tenantId: string) {
    this.db = getTenantDb(tenantId);
  }

  get databaseName(): string {
    return this.db.databaseName;
  }

  projects<T extends Document = Document>() {
    return this.db.collection<T>(Collections.PROJECTS);
  }

  tasks<T extends Document = Document>() {
    return this.db.collection<T>(Collections.TASKS);
  }

  sprints<T extends Document = Document>() {
    return this.db.collection<T>(Collections.SPRINTS);
  }

  columns<T extends Document = Document>() {
    return this.db.collection<T>(Collections.COLUMNS);
  }

  tags<T extends Document = Document>() {
    return this.db.collection<T>(Collections.TAGS);
  }

  comments<T extends Document = Document>() {
    return this.db.collection<T>(Collections.COMMENTS);
  }

  subtasks<T extends Document = Document>() {
    return this.db.collection<T>(Collections.SUBTASKS);
  }

  attachments<T extends Document = Document>() {
    return this.db.collection<T>(Collections.ATTACHMENTS);
  }

  activityLog<T extends Document = Document>() {
    return this.db.collection<T>(Collections.ACTIVITY_LOG);
  }

  documents<T extends Document = Document>() {
    return this.db.collection<T>(Collections.DOCUMENTS);
  }

  projectMembers<T extends Document = Document>() {
    return this.db.collection<T>(Collections.PROJECT_MEMBERS);
  }

  collection<T extends Document = Document>(name: string) {
    return this.db.collection<T>(name);
  }
}

/**
 * Factory function to create TenantDb instance
 */
export function createTenantDb(tenantId: string): TenantDb {
  return new TenantDb(tenantId);
}

export default {
  connect,
  getClient,
  getSystemDb,
  getTenantDb,
  getTenantCollection,
  getSystemCollection,
  initializeTenantDb,
  dropTenantDb,
  listTenantDbs,
  checkConnection,
  close,
  createTenantDb,
  TenantDb,
  Collections,
};
