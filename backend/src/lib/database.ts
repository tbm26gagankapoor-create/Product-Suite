import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database structure
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
}

// Default empty database
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
};

// Load database from file
function loadDb(): DatabaseSchema {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  }
  return { ...defaultDb };
}

// Save database to file
function saveDb(data: DatabaseSchema): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Database singleton
let db: DatabaseSchema = loadDb();

// Helper function to generate UUID
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Helper to get current timestamp
export function now(): string {
  return new Date().toISOString();
}

// Database operations
export const database = {
  // Get all records from a collection
  getAll<T>(collection: keyof DatabaseSchema): T[] {
    return db[collection] as T[];
  },

  // Find one record by predicate
  findOne<T>(collection: keyof DatabaseSchema, predicate: (item: T) => boolean): T | undefined {
    return (db[collection] as T[]).find(predicate);
  },

  // Find all records matching predicate
  findMany<T>(collection: keyof DatabaseSchema, predicate: (item: T) => boolean): T[] {
    return (db[collection] as T[]).filter(predicate);
  },

  // Find by ID
  findById<T extends { id: string }>(collection: keyof DatabaseSchema, id: string): T | undefined {
    return (db[collection] as T[]).find(item => item.id === id);
  },

  // Insert a new record
  insert<T>(collection: keyof DatabaseSchema, record: T): T {
    (db[collection] as T[]).push(record);
    saveDb(db);
    return record;
  },

  // Update a record
  update<T extends { id: string }>(
    collection: keyof DatabaseSchema,
    id: string,
    updates: Partial<T>
  ): T | undefined {
    const items = db[collection] as T[];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return undefined;

    items[index] = { ...items[index], ...updates };
    saveDb(db);
    return items[index];
  },

  // Delete a record
  delete(collection: keyof DatabaseSchema, id: string): boolean {
    const items = db[collection] as any[];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;

    items.splice(index, 1);
    saveDb(db);
    return true;
  },

  // Delete many records matching predicate
  deleteMany(collection: keyof DatabaseSchema, predicate: (item: any) => boolean): number {
    const items = db[collection] as any[];
    const originalLength = items.length;
    db[collection] = items.filter(item => !predicate(item));
    saveDb(db);
    return originalLength - db[collection].length;
  },

  // Count records
  count(collection: keyof DatabaseSchema, predicate?: (item: any) => boolean): number {
    if (predicate) {
      return (db[collection] as any[]).filter(predicate).length;
    }
    return db[collection].length;
  },

  // Reset database
  reset(): void {
    db = { ...defaultDb };
    saveDb(db);
  },

  // Save current state
  save(): void {
    saveDb(db);
  },

  // Reload from file
  reload(): void {
    db = loadDb();
  },
};

export default database;
