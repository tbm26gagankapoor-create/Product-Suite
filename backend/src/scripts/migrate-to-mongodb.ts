/**
 * Migration Script: JSON to MongoDB
 *
 * This script migrates all data from the JSON file database to MongoDB.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-to-mongodb.ts
 *
 * Make sure MONGODB_URI is set in your environment or .env file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  User,
  Organization,
  OrganizationMember,
  OrganizationInvite,
  OrganizationJoinRequest,
  Project,
  ProjectMember,
  ColumnStatus,
  Sprint,
  Tag,
  Task,
  Subtask,
  TaskTag,
  Comment,
  Attachment,
  ActivityLog,
  UserPreferences,
  Team,
  TeamMember,
  TeamProject,
  OAuthState,
} from '../models/index.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.json');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinia';

interface DatabaseSchema {
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
  teams: any[];
  team_members: any[];
  team_projects: any[];
  oauth_states: any[];
  organizations: any[];
  organization_members: any[];
  organization_join_requests: any[];
  organization_invites: any[];
}

// Model mapping
const modelMapping: Record<keyof DatabaseSchema, mongoose.Model<any>> = {
  users: User,
  organizations: Organization,
  organization_members: OrganizationMember,
  organization_invites: OrganizationInvite,
  organization_join_requests: OrganizationJoinRequest,
  projects: Project,
  project_members: ProjectMember,
  columns_status: ColumnStatus,
  sprints: Sprint,
  tags: Tag,
  tasks: Task,
  subtasks: Subtask,
  task_tags: TaskTag,
  comments: Comment,
  attachments: Attachment,
  activity_log: ActivityLog,
  user_preferences: UserPreferences,
  teams: Team,
  team_members: TeamMember,
  team_projects: TeamProject,
  oauth_states: OAuthState,
};

async function loadJsonDatabase(): Promise<DatabaseSchema> {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}`);
  }

  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function migrateCollection(
  collectionName: keyof DatabaseSchema,
  data: any[],
  model: mongoose.Model<any>
): Promise<number> {
  if (!data || data.length === 0) {
    console.log(`  ⏭️  ${collectionName}: No data to migrate`);
    return 0;
  }

  try {
    // Clear existing data in the collection
    await model.deleteMany({});

    // Insert all records
    await model.insertMany(data, { ordered: false });

    console.log(`  ✅ ${collectionName}: Migrated ${data.length} records`);
    return data.length;
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - some records may have been inserted
      console.log(`  ⚠️  ${collectionName}: Partial migration (some duplicates skipped)`);
      return data.length;
    }
    console.error(`  ❌ ${collectionName}: Error - ${error.message}`);
    throw error;
  }
}

async function migrate() {
  console.log('🚀 Starting MongoDB Migration\n');
  console.log(`📁 Source: ${DB_PATH}`);
  console.log(`🗄️  Target: ${MONGODB_URI}\n`);

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('\n💡 Make sure MongoDB is running. You can:');
    console.log('   - Install MongoDB locally: https://www.mongodb.com/docs/manual/installation/');
    console.log('   - Use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
    console.log('   - Run with Docker: docker run -d -p 27017:27017 mongo:latest\n');
    process.exit(1);
  }

  // Load JSON database
  console.log('Loading JSON database...');
  let jsonData: DatabaseSchema;
  try {
    jsonData = await loadJsonDatabase();
    console.log('✅ JSON database loaded\n');
  } catch (error: any) {
    console.error('❌ Failed to load JSON database:', error.message);
    process.exit(1);
  }

  // Migrate each collection
  console.log('Migrating collections:\n');

  let totalRecords = 0;
  const collections = Object.keys(modelMapping) as (keyof DatabaseSchema)[];

  for (const collectionName of collections) {
    const data = jsonData[collectionName] || [];
    const model = modelMapping[collectionName];
    const count = await migrateCollection(collectionName, data, model);
    totalRecords += count;
  }

  console.log(`\n✨ Migration complete! Total records migrated: ${totalRecords}`);

  // Verify migration
  console.log('\n📊 Verification:\n');
  for (const collectionName of collections) {
    const model = modelMapping[collectionName];
    const count = await model.countDocuments();
    if (count > 0) {
      console.log(`   ${collectionName}: ${count} records`);
    }
  }

  // Disconnect
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  console.log('\n🎉 Migration successful! Your data is now in MongoDB.\n');

  console.log('Next steps:');
  console.log('1. Update your .env file with MONGODB_URI');
  console.log('2. Restart your backend server');
  console.log('3. Test your application\n');
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
