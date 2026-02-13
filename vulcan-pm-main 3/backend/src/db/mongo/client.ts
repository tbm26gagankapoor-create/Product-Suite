import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import { config } from '../../config/index.js';

let client: MongoClient | null = null;
let db: Db | null = null;

// Connect to MongoDB
export async function connect(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongo.url, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  });

  await client.connect();
  db = client.db(config.mongo.dbName);

  console.log('[MongoDB] Connected to database:', config.mongo.dbName);

  return db;
}

// Get database instance
export function getDb(): Db {
  if (!db) {
    throw new Error('[MongoDB] Database not connected. Call connect() first.');
  }
  return db;
}

// Get collection with type safety
export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// Collection names
export const Collections = {
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
  DRAFT_SESSIONS: 'draft_sessions',
} as const;

// Helper to convert string ID to ObjectId
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

// Helper to generate new ObjectId as string
export function generateId(): string {
  return new ObjectId().toHexString();
}

// Check connection
export async function checkConnection(): Promise<boolean> {
  try {
    if (!client) return false;
    await client.db().admin().ping();
    return true;
  } catch {
    return false;
  }
}

// Close connection (for graceful shutdown)
export async function close(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

// Initialize collections with validation schemas
export async function initializeCollections(): Promise<void> {
  const database = getDb();
  console.log('[MongoDB] Initializing collections...');

  // Get existing collections
  const existingCollections = await database.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  // Projects collection with validation
  if (!existingNames.has(Collections.PROJECTS)) {
    await database.createCollection(Collections.PROJECTS, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'tenant_id', 'owner_id', 'name', 'code'],
          properties: {
            id: { bsonType: 'string' },
            tenant_id: { bsonType: 'string' },
            owner_id: { bsonType: 'string' },
            name: { bsonType: 'string' },
            code: { bsonType: 'string' },
            description: { bsonType: ['string', 'null'] },
            status: { enum: ['active', 'archived', 'completed'] },
            visibility: { enum: ['private', 'team', 'public'] },
          },
        },
      },
    });
  }

  // Tasks collection with validation
  if (!existingNames.has(Collections.TASKS)) {
    await database.createCollection(Collections.TASKS, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'project_id', 'title', 'task_number', 'task_key'],
          properties: {
            id: { bsonType: 'string' },
            project_id: { bsonType: 'string' },
            title: { bsonType: 'string' },
            task_number: { bsonType: 'int' },
            task_key: { bsonType: 'string' },
            type: { enum: ['epic', 'feature', 'task', 'bug', 'story'] },
            priority: { enum: ['highest', 'high', 'medium', 'low', 'lowest'] },
          },
        },
      },
    });
  }

  // Create other collections (no validation required)
  const simpleCollections = [
    Collections.SPRINTS,
    Collections.COLUMNS,
    Collections.TAGS,
    Collections.COMMENTS,
    Collections.SUBTASKS,
    Collections.ATTACHMENTS,
    Collections.ACTIVITY_LOG,
    Collections.DOCUMENTS,
    Collections.PROJECT_MEMBERS,
    Collections.DRAFT_SESSIONS,
  ];

  for (const name of simpleCollections) {
    if (!existingNames.has(name)) {
      await database.createCollection(name);
    }
  }

  console.log('[MongoDB] Collections initialized');
}

// Create indexes for optimal performance
export async function createIndexes(): Promise<void> {
  const database = getDb();
  console.log('[MongoDB] Creating indexes...');

  // Projects indexes
  await database.collection(Collections.PROJECTS).createIndexes([
    { key: { tenant_id: 1 } },
    { key: { owner_id: 1 } },
    { key: { code: 1 }, unique: true },
    { key: { created_at: -1 } },
  ]);

  // Tasks indexes
  await database.collection(Collections.TASKS).createIndexes([
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
  await database.collection(Collections.SPRINTS).createIndexes([
    { key: { project_id: 1 } },
    { key: { status: 1 } },
    { key: { start_date: 1 } },
  ]);

  // Comments indexes
  await database.collection(Collections.COMMENTS).createIndexes([
    { key: { task_id: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } },
  ]);

  // Activity log indexes with TTL
  await database.collection(Collections.ACTIVITY_LOG).createIndexes([
    { key: { entity_type: 1, entity_id: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } },
    { key: { created_at: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 }, // TTL: 90 days
  ]);

  // Project members indexes
  await database.collection(Collections.PROJECT_MEMBERS).createIndexes([
    { key: { project_id: 1 } },
    { key: { user_id: 1 } },
    { key: { project_id: 1, user_id: 1 }, unique: true },
  ]);

  // Documents indexes
  await database.collection(Collections.DOCUMENTS).createIndexes([
    { key: { project_id: 1 } },
    { key: { project_id: 1, section_id: 1 }, unique: true },
  ]);

  // Tags indexes
  await database.collection(Collections.TAGS).createIndexes([
    { key: { project_id: 1 } },
  ]);

  // Columns indexes
  await database.collection(Collections.COLUMNS).createIndexes([
    { key: { project_id: 1 } },
    { key: { project_id: 1, display_order: 1 } },
  ]);

  // Draft sessions indexes
  await database.collection(Collections.DRAFT_SESSIONS).createIndexes([
    { key: { user_id: 1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ]);

  console.log('[MongoDB] Indexes created');
}

// Re-export tenant utilities
export { TenantScope, createTenantScope } from './tenant-scope.js';
export {
  TenantDb,
  createTenantDb,
  getTenantDb,
  getTenantCollection,
  initializeTenantDb,
  dropTenantDb,
  listTenantDbs,
} from './tenant-router.js';

export { ObjectId };
export default { connect, getDb, getCollection, checkConnection, close, initializeCollections, createIndexes, Collections, toObjectId, generateId };
