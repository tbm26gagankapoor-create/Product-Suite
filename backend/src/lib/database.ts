import { models } from '../models/index.js';

// Database structure types
export interface DatabaseSchema {
  users: any[];
  projects: any[];
  project_members: any[];
  columns_status: any[];
  sprints: any[];
  tags: any[];
  tasks: any[];
  subtasks: any[];
  task_tags: any[];
  task_links: any[];
  comments: any[];
  attachments: any[];
  activity_log: any[];
  user_preferences: any[];
  teams: any[];
  team_members: any[];
  team_projects: any[];
  oauth_states: any[];
  organizations: any[];
  organization_members: any[];
  organization_join_requests: any[];
  organization_invites: any[];
  github_integrations: any[];
  github_sync_logs: any[];
}

// Helper function to generate UUID
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Helper to get current timestamp
export function now(): string {
  return new Date().toISOString();
}

// Database operations - MongoDB implementation
export const database = {
  // Get all records from a collection
  async getAll<T>(collection: keyof DatabaseSchema): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const docs = await model.find().lean();
    return docs.map((doc: any) => {
      const { _id, __v, ...rest } = doc;
      return rest as T;
    });
  },

  // Find one record by predicate (MongoDB query object)
  async findOne<T>(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const doc = await model.findOne(query).lean();
    if (!doc) return null;
    const { _id, __v, ...rest } = doc as any;
    return rest as T;
  },

  // Find all records matching query
  async findMany<T>(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const docs = await model.find(query).lean();
    return docs.map((doc: any) => {
      const { _id, __v, ...rest } = doc;
      return rest as T;
    });
  },

  // Find by ID (using custom 'id' field, not MongoDB _id)
  async findById<T extends { id: string }>(collection: keyof DatabaseSchema, id: string): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const doc = await model.findOne({ id }).lean();
    if (!doc) return null;
    const { _id, __v, ...rest } = doc as any;
    return rest as T;
  },

  // Insert a new record
  async insert<T>(collection: keyof DatabaseSchema, record: T): Promise<T> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const doc = await model.create(record as Record<string, any>);
    const obj = doc.toObject();
    const { _id, __v, ...rest } = obj;
    return rest as T;
  },

  // Insert many records
  async insertMany<T>(collection: keyof DatabaseSchema, records: T[]): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const docs = await model.insertMany(records);
    return docs.map((doc: any) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      const { _id, __v, ...rest } = obj;
      return rest as T;
    });
  },

  // Update a record
  async update<T extends { id: string }>(
    collection: keyof DatabaseSchema,
    id: string,
    updates: Record<string, any>
  ): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const doc = await model.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    ).lean();
    if (!doc) return null;
    const { _id, __v, ...rest } = doc as any;
    return rest as T;
  },

  // Delete a record
  async delete(collection: keyof DatabaseSchema, id: string): Promise<boolean> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const result = await model.deleteOne({ id });
    return result.deletedCount > 0;
  },

  // Delete many records matching query
  async deleteMany(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<number> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const result = await model.deleteMany(query);
    return result.deletedCount;
  },

  // Count records
  async count(collection: keyof DatabaseSchema, query?: Record<string, any>): Promise<number> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    return model.countDocuments(query || {});
  },

  // Check if a record exists
  async exists(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<boolean> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const count = await model.countDocuments(query);
    return count > 0;
  },

  // Aggregate query (for advanced operations)
  async aggregate<T>(collection: keyof DatabaseSchema, pipeline: any[]): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    return model.aggregate(pipeline);
  },
};

export default database;
