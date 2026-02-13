/**
 * JSON File Database - For local development and fallback
 * In production, use PostgreSQL for auth and MongoDB for content
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/database.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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
  comments: any[];
  attachments: any[];
  activity_log: any[];
  user_preferences: any[];
  tenants: any[];
  plans: any[];
  sso_connections: any[];
}

const defaultDb: DatabaseSchema = {
  users: [],
  projects: [],
  project_members: [],
  columns_status: [],
  sprints: [],
  tags: [],
  tasks: [],
  subtasks: [],
  task_tags: [],
  comments: [],
  attachments: [],
  activity_log: [],
  user_preferences: [],
  tenants: [],
  plans: [],
  sso_connections: [],
};

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return { ...defaultDb, ...JSON.parse(data) };
    }
  } catch (error) {
    console.warn('[JSON DB] Failed to load, using defaults:', error);
  }
  return { ...defaultDb };
}

function saveDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[JSON DB] Failed to save:', error);
  }
}

let db: DatabaseSchema = loadDb();

export function generateUUID(): string {
  return randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export const database = {
  getAll<T>(collection: keyof DatabaseSchema): T[] {
    return (db[collection] || []) as T[];
  },

  findOne<T>(collection: keyof DatabaseSchema, predicate: (item: T) => boolean): T | undefined {
    return (db[collection] as T[]).find(predicate);
  },

  findMany<T>(collection: keyof DatabaseSchema, predicate: (item: T) => boolean): T[] {
    return (db[collection] as T[]).filter(predicate);
  },

  findById<T extends { id: string }>(collection: keyof DatabaseSchema, id: string): T | undefined {
    return (db[collection] as T[]).find(item => item.id === id);
  },

  insert<T>(collection: keyof DatabaseSchema, record: T): T {
    (db[collection] as T[]).push(record);
    saveDb(db);
    return record;
  },

  update<T extends { id: string }>(
    collection: keyof DatabaseSchema,
    id: string,
    updates: Record<string, any>
  ): T | undefined {
    const items = db[collection] as T[];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return undefined;
    items[index] = { ...items[index], ...updates };
    saveDb(db);
    return items[index];
  },

  delete(collection: keyof DatabaseSchema, id: string): boolean {
    const items = db[collection] as any[];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    saveDb(db);
    return true;
  },

  deleteMany(collection: keyof DatabaseSchema, predicate: (item: any) => boolean): number {
    const items = db[collection] as any[];
    const originalLength = items.length;
    db[collection] = items.filter(item => !predicate(item));
    saveDb(db);
    return originalLength - db[collection].length;
  },

  count(collection: keyof DatabaseSchema, predicate?: (item: any) => boolean): number {
    if (predicate) {
      return (db[collection] as any[]).filter(predicate).length;
    }
    return db[collection].length;
  },

  reset(): void {
    db = { ...defaultDb };
    saveDb(db);
  },

  reload(): void {
    db = loadDb();
  },
};

export default database;
