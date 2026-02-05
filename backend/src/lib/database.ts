import { models } from '../models/index.js';
import mongoose from 'mongoose';

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
  document_comments: any[];
  notifications: any[];
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// Helper function to generate ID - now uses MongoDB ObjectId for consistency
export function generateUUID(): string {
  return new mongoose.Types.ObjectId().toString();
}

// Helper to get current timestamp
export function now(): string {
  return new Date().toISOString();
}

// Helper to check if a string is a valid ObjectId
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

// ===================
// Transaction Support
// ===================

export type TransactionCallback<T> = (session: mongoose.ClientSession) => Promise<T>;

/**
 * Execute operations within a MongoDB transaction
 * Automatically handles commit/rollback on success/failure
 *
 * @example
 * const result = await withTransaction(async (session) => {
 *   const project = await models.projects.create([{ name: 'New Project' }], { session });
 *   await models.columns_status.insertMany(defaultColumns, { session });
 *   return project[0];
 * });
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Check if MongoDB supports transactions (replica set required)
 */
export async function supportsTransactions(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const serverStatus = await admin.serverStatus();
    return !!(serverStatus?.repl?.setName);
  } catch {
    return false;
  }
}

// Helper to check if value is a MongoDB ObjectId
function isObjectIdInstance(value: any): boolean {
  return value && typeof value === 'object' &&
    (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId');
}

// Helper to transform nested ObjectIds to strings
function transformNestedObjectIds(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (isObjectIdInstance(obj)) return obj.toString();
  if (Array.isArray(obj)) return obj.map(transformNestedObjectIds);
  if (obj instanceof Date) return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = transformNestedObjectIds(value);
  }
  return result;
}

// Helper to convert _id to id in documents and convert all ObjectIds to strings
function transformDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, __v, id: legacyId, ...rest } = doc;

  // Convert all ObjectId fields to strings for consistency
  const transformed: Record<string, any> = { id: _id?.toString() };

  for (const [key, value] of Object.entries(rest) as [string, any][]) {
    if (isObjectIdInstance(value)) {
      // Convert ObjectId to string
      transformed[key] = value.toString();
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively transform nested objects (but not arrays or dates)
      transformed[key] = transformNestedObjectIds(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed as T;
}

// Database operations - MongoDB implementation with ObjectId standardization
export const database = {
  // Get all records from a collection
  async getAll<T>(collection: keyof DatabaseSchema): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const docs = await model.find().lean();
    return docs.map((doc: any) => transformDoc<T>(doc));
  },

  // Find one record by predicate (MongoDB query object)
  async findOne<T>(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    // Convert 'id' queries to '_id' queries
    const mongoQuery = normalizeQuery(query);
    const doc = await model.findOne(mongoQuery).lean();
    if (!doc) return null;
    return transformDoc<T>(doc);
  },

  // Find all records matching query
  async findMany<T>(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const mongoQuery = normalizeQuery(query);
    const docs = await model.find(mongoQuery).lean();
    return docs.map((doc: any) => transformDoc<T>(doc));
  },

  // Find by ID (using MongoDB _id)
  async findById<T>(collection: keyof DatabaseSchema, id: string): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    // Try to find by _id first (ObjectId), fallback to legacy 'id' field
    let doc = null;
    if (isValidObjectId(id)) {
      doc = await model.findById(id).lean();
    }
    // Fallback: try finding by legacy 'id' field for backward compatibility
    if (!doc) {
      doc = await model.findOne({ id }).lean();
    }

    if (!doc) return null;
    return transformDoc<T>(doc);
  },

  // Insert a new record
  async insert<T>(collection: keyof DatabaseSchema, record: any): Promise<T> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    // Remove 'id' field if present - let MongoDB generate _id
    const { id, ...recordWithoutId } = record;

    // Normalize foreign key fields (fields ending with _id) to ObjectId for consistency
    const normalizedRecord = normalizeRecordForInsert(recordWithoutId);

    const doc = await model.create(normalizedRecord);
    const obj = doc.toObject();
    return transformDoc<T>(obj);
  },

  // Insert many records
  async insertMany<T>(collection: keyof DatabaseSchema, records: any[]): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    // Remove 'id' fields and normalize foreign keys
    const cleanRecords = records.map(({ id, ...rest }) => normalizeRecordForInsert(rest));

    const docs = await model.insertMany(cleanRecords);
    return docs.map((doc: any) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      return transformDoc<T>(obj);
    });
  },

  // Update a record by ID
  async update<T>(
    collection: keyof DatabaseSchema,
    id: string,
    updates: Record<string, any>
  ): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    // Try to update by _id first, fallback to legacy 'id' field
    let doc = null;
    if (isValidObjectId(id)) {
      doc = await model.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).lean();
    }
    // Fallback for legacy 'id' field
    if (!doc) {
      doc = await model.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true }
      ).lean();
    }

    if (!doc) return null;
    return transformDoc<T>(doc);
  },

  // Delete a record by ID
  async delete(collection: keyof DatabaseSchema, id: string): Promise<boolean> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    // Try to delete by _id first, fallback to legacy 'id' field
    let result = { deletedCount: 0 };
    if (isValidObjectId(id)) {
      result = await model.deleteOne({ _id: id });
    }
    if (result.deletedCount === 0) {
      result = await model.deleteOne({ id });
    }

    return result.deletedCount > 0;
  },

  // Delete many records matching query
  async deleteMany(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<number> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const mongoQuery = normalizeQuery(query);
    const result = await model.deleteMany(mongoQuery);
    return result.deletedCount;
  },

  // Count records
  async count(collection: keyof DatabaseSchema, query?: Record<string, any>): Promise<number> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const mongoQuery = query ? normalizeQuery(query) : {};
    return model.countDocuments(mongoQuery);
  },

  // Check if a record exists
  async exists(collection: keyof DatabaseSchema, query: Record<string, any>): Promise<boolean> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const mongoQuery = normalizeQuery(query);
    const count = await model.countDocuments(mongoQuery);
    return count > 0;
  },

  // Aggregate query (for advanced operations)
  async aggregate<T>(collection: keyof DatabaseSchema, pipeline: any[]): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const results = await model.aggregate(pipeline);
    return results.map((doc: any) => transformDoc<T>(doc));
  },

  // Paginated query with sorting
  async findManyPaginated<T>(
    collection: keyof DatabaseSchema,
    query: Record<string, any>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const mongoQuery = normalizeQuery(query);

    const [docs, total] = await Promise.all([
      model.find(mongoQuery)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      model.countDocuments(mongoQuery)
    ]);

    const data = docs.map((doc: any) => transformDoc<T>(doc));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  // Batch find by IDs
  async findByIds<T>(
    collection: keyof DatabaseSchema,
    ids: string[]
  ): Promise<Map<string, T>> {
    if (ids.length === 0) return new Map();

    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const uniqueIds = [...new Set(ids)];

    // Convert to ObjectIds where valid
    const objectIds = uniqueIds.filter(isValidObjectId).map(id => new mongoose.Types.ObjectId(id));
    const stringIds = uniqueIds.filter(id => !isValidObjectId(id));

    // Query both _id (ObjectId) and legacy id (string) fields
    const query: any = { $or: [] };
    if (objectIds.length > 0) {
      query.$or.push({ _id: { $in: objectIds } });
    }
    if (stringIds.length > 0) {
      query.$or.push({ id: { $in: stringIds } });
    }

    if (query.$or.length === 0) return new Map();

    const docs = await model.find(query).lean();

    const map = new Map<string, T>();
    docs.forEach((doc: any) => {
      const transformed = transformDoc<T>(doc);
      map.set((transformed as any).id, transformed);
    });

    return map;
  },

  // Batch find by field (for N+1 fixes on foreign keys)
  async findManyByField<T>(
    collection: keyof DatabaseSchema,
    field: string,
    values: string[]
  ): Promise<Map<string, T[]>> {
    if (values.length === 0) return new Map();

    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const uniqueValues = [...new Set(values)];

    // Convert to ObjectIds where the field might be a reference
    const query = buildFieldQuery(field, uniqueValues);
    const docs = await model.find(query).lean();

    const map = new Map<string, T[]>();
    uniqueValues.forEach(v => map.set(v, []));

    docs.forEach((doc: any) => {
      const transformed = transformDoc<T>(doc);
      const key = String((doc as any)[field] || '');
      const arr = map.get(key) || [];
      arr.push(transformed);
      map.set(key, arr);
    });

    return map;
  },

  // Count by field values (for batch counting)
  async countByField(
    collection: keyof DatabaseSchema,
    field: string,
    values: string[]
  ): Promise<Map<string, number>> {
    if (values.length === 0) return new Map();

    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const uniqueValues = [...new Set(values)];
    const query = buildFieldQuery(field, uniqueValues);

    const results = await model.aggregate([
      { $match: query },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } }
    ]);

    const map = new Map<string, number>();
    uniqueValues.forEach(v => map.set(v, 0));
    results.forEach((r: any) => map.set(String(r._id), r.count));

    return map;
  },

  // ===================
  // Transaction-aware Operations
  // ===================

  /**
   * Insert a record within a transaction
   */
  async insertWithSession<T>(
    collection: keyof DatabaseSchema,
    record: any,
    session: mongoose.ClientSession
  ): Promise<T> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const { id, ...recordWithoutId } = record;
    const normalizedRecord = normalizeRecordForInsert(recordWithoutId);
    const [doc] = await model.create([normalizedRecord], { session });
    const obj = doc.toObject();
    return transformDoc<T>(obj);
  },

  /**
   * Insert many records within a transaction
   */
  async insertManyWithSession<T>(
    collection: keyof DatabaseSchema,
    records: any[],
    session: mongoose.ClientSession
  ): Promise<T[]> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    const cleanRecords = records.map(({ id, ...rest }) => normalizeRecordForInsert(rest));
    const docs = await model.insertMany(cleanRecords, { session });
    return docs.map((doc: any) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      return transformDoc<T>(obj);
    });
  },

  /**
   * Update a record within a transaction
   */
  async updateWithSession<T>(
    collection: keyof DatabaseSchema,
    id: string,
    updates: Record<string, any>,
    session: mongoose.ClientSession
  ): Promise<T | null> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    let doc = null;
    if (isValidObjectId(id)) {
      doc = await model.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, session }
      ).lean();
    }
    if (!doc) {
      doc = await model.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, session }
      ).lean();
    }

    if (!doc) return null;
    return transformDoc<T>(doc);
  },

  /**
   * Delete a record within a transaction
   */
  async deleteWithSession(
    collection: keyof DatabaseSchema,
    id: string,
    session: mongoose.ClientSession
  ): Promise<boolean> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);

    let result = { deletedCount: 0 };
    if (isValidObjectId(id)) {
      result = await model.deleteOne({ _id: id }, { session });
    }
    if (result.deletedCount === 0) {
      result = await model.deleteOne({ id }, { session });
    }

    return result.deletedCount > 0;
  },

  /**
   * Delete many records within a transaction
   */
  async deleteManyWithSession(
    collection: keyof DatabaseSchema,
    query: Record<string, any>,
    session: mongoose.ClientSession
  ): Promise<number> {
    const model = models[collection];
    if (!model) throw new Error(`Unknown collection: ${collection}`);
    const mongoQuery = normalizeQuery(query);
    const result = await model.deleteMany(mongoQuery, { session });
    return result.deletedCount;
  },
};

// Helper to normalize record data for insert - converts foreign key strings to ObjectId
function normalizeRecordForInsert(record: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && isValidObjectId(value) && key.endsWith('_id')) {
      // Convert foreign key fields to ObjectId for consistency
      normalized[key] = new mongoose.Types.ObjectId(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively normalize nested objects (but not arrays or dates)
      normalized[key] = normalizeRecordForInsert(value);
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

// Helper to normalize queries - converts 'id' to '_id' for ObjectId fields
function normalizeQuery(query: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    if (key === 'id' && typeof value === 'string' && isValidObjectId(value)) {
      // Convert id query to _id
      normalized._id = new mongoose.Types.ObjectId(value);
    } else if (key === 'id' && typeof value === 'object' && value.$in) {
      // Handle $in queries on id field
      const objectIds = value.$in.filter((v: string) => isValidObjectId(v)).map((v: string) => new mongoose.Types.ObjectId(v));
      const stringIds = value.$in.filter((v: string) => !isValidObjectId(v));
      if (objectIds.length > 0 && stringIds.length > 0) {
        normalized.$or = [{ _id: { $in: objectIds } }, { id: { $in: stringIds } }];
      } else if (objectIds.length > 0) {
        normalized._id = { $in: objectIds };
      } else {
        normalized.id = value;
      }
    } else if (typeof value === 'string' && isValidObjectId(value) && key.endsWith('_id')) {
      // Convert foreign key fields to ObjectId
      normalized[key] = new mongoose.Types.ObjectId(value);
    } else if ((key === '$or' || key === '$and') && Array.isArray(value)) {
      // Handle $or and $and arrays - recursively normalize each subquery
      normalized[key] = value.map((subQuery: any) => normalizeQuery(subQuery));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively normalize nested objects
      if (value.$in && Array.isArray(value.$in) && key.endsWith('_id')) {
        const objectIds = value.$in.filter((v: any) => typeof v === 'string' && isValidObjectId(v)).map((v: string) => new mongoose.Types.ObjectId(v));
        if (objectIds.length === value.$in.length) {
          normalized[key] = { $in: objectIds };
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = value;
      }
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

// Helper to build field query with ObjectId support
function buildFieldQuery(field: string, values: string[]): Record<string, any> {
  // For _id fields or fields ending in _id, try to use ObjectId
  if (field === '_id' || field.endsWith('_id')) {
    const objectIds = values.filter(isValidObjectId).map(v => new mongoose.Types.ObjectId(v));
    const stringIds = values.filter(v => !isValidObjectId(v));

    if (objectIds.length > 0 && stringIds.length > 0) {
      return { $or: [{ [field]: { $in: objectIds } }, { [field]: { $in: stringIds } }] };
    } else if (objectIds.length > 0) {
      return { [field]: { $in: objectIds } };
    }
  }

  return { [field]: { $in: values } };
}

export default database;
