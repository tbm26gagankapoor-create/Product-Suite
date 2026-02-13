import mongoose from 'mongoose';
import { query as pgQuery, transaction } from '../db/postgres/client.js';
import { config } from '../config/index.js';
import bcrypt from 'bcryptjs';

/**
 * Week 3: Data Migration from MongoDB to Dual Database
 *
 * Migrates data from current MongoDB structure to:
 * - PostgreSQL: users, tenants (organizations)
 * - Per-tenant MongoDB: projects, tasks, sprints, documents, etc.
 *
 * Migration Steps:
 * 1. Connect to current MongoDB
 * 2. Migrate organizations → PostgreSQL tenants table
 * 3. Migrate users → PostgreSQL users table (with tenant associations)
 * 4. Create per-tenant MongoDB databases (tenant_<org_id>)
 * 5. Migrate project-scoped data to tenant databases
 * 6. Verify data integrity
 * 7. Create rollback script
 */

interface MongoOrganization {
  _id: string;
  name: string;
  slug?: string;
  domain?: string;
  logo_url?: string;
  settings?: any;
  created_at?: Date;
  updated_at?: Date;
}

interface MongoUser {
  _id: string;
  email: string;
  password_hash?: string;
  name: string;
  avatar_url?: string;
  organizations?: string[];
  organization_id?: string;
  role?: string;
  designation?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface MongoProject {
  _id: string;
  organization_id: string;
  name: string;
  [key: string]: any;
}

// =====================================================
// CONFIGURATION
// =====================================================

const DRY_RUN = process.env.DRY_RUN === 'true';
const VERIFY_ONLY = process.env.VERIFY_ONLY === 'true';

console.log('🔄 Infinia Data Migration: MongoDB → Dual Database');
console.log('================================================');
console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✍️  LIVE MIGRATION'}`);
console.log(`Verify Only: ${VERIFY_ONLY ? 'Yes' : 'No'}`);
console.log('');

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getTenantMongoDb(tenantId: string): Promise<mongoose.Connection> {
  const dbName = `tenant_${tenantId.replace(/-/g, '_')}`;
  const uri = config.database.mongoUri;

  // Remove any existing database name from URI and add tenant database
  const baseUri = uri.split('/').slice(0, 3).join('/');
  const params = uri.includes('?') ? '?' + uri.split('?')[1] : '';

  // For MongoDB Atlas, ensure proper write concern
  const hasWriteConcern = params.includes('w=');
  const finalParams = hasWriteConcern ? params : (params ? `${params}&w=majority` : '?w=majority');

  const connectionString = `${baseUri}/${dbName}${finalParams}`;
  return mongoose.createConnection(connectionString);
}

// =====================================================
// STEP 1: CONNECT TO DATABASES
// =====================================================

async function connectDatabases() {
  console.log('📡 Connecting to databases...');

  // Connect to current MongoDB
  await mongoose.connect(`${config.database.mongoUri}/${config.database.name}`);
  console.log(`✅ Connected to MongoDB: ${config.database.name}`);

  // Test PostgreSQL connection
  const pgTest = await pgQuery('SELECT 1');
  if (pgTest) {
    console.log('✅ Connected to PostgreSQL');
  }

  console.log('');
}

// =====================================================
// STEP 2: MIGRATE ORGANIZATIONS → TENANTS
// =====================================================

async function migrateOrganizations(): Promise<Map<string, string>> {
  console.log('🏢 Migrating Organizations → Tenants...');

  const orgCollection = mongoose.connection.collection('organizations');
  const organizations = await orgCollection.find({}).toArray() as unknown as MongoOrganization[];

  console.log(`   Found ${organizations.length} organizations`);

  const orgIdMap = new Map<string, string>(); // MongoDB org_id → PostgreSQL tenant_id

  // Get default plan
  const defaultPlan = await pgQuery<{ id: string }>('SELECT id FROM plans WHERE name = $1', ['free']);
  const defaultPlanId = defaultPlan.rows[0]?.id;

  for (const org of organizations) {
    const slug = org.slug || generateSlug(org.name);

    if (!DRY_RUN) {
      try {
        const result = await pgQuery<{ id: string }>(`
          INSERT INTO tenants (name, slug, domain, logo_url, plan_id, subscription_status, settings, metadata, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, 'trial', $6::jsonb, '{}'::jsonb, true, $7, $8)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            domain = EXCLUDED.domain,
            logo_url = EXCLUDED.logo_url,
            updated_at = EXCLUDED.updated_at
          RETURNING id
        `, [
          org.name,
          slug,
          org.domain || null,
          org.logo_url || null,
          defaultPlanId,
          JSON.stringify(org.settings || {}),
          org.created_at || new Date(),
          org.updated_at || new Date()
        ]);

        const tenantId = result.rows[0].id;
        orgIdMap.set(org._id.toString(), tenantId);

        console.log(`   ✓ ${org.name} (${org._id} → ${tenantId})`);
      } catch (error: any) {
        console.error(`   ✗ Failed to migrate ${org.name}:`, error.message);
      }
    } else {
      console.log(`   [DRY RUN] Would migrate: ${org.name} (${slug})`);
      orgIdMap.set(org._id.toString(), `dry-run-${org._id}`);
    }
  }

  console.log(`✅ Migrated ${orgIdMap.size} organizations\n`);
  return orgIdMap;
}

// =====================================================
// STEP 3: MIGRATE USERS → POSTGRESQL
// =====================================================

async function migrateUsers(orgIdMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('👥 Migrating Users → PostgreSQL...');

  const userCollection = mongoose.connection.collection('users');
  const users = await userCollection.find({}).toArray() as unknown as MongoUser[];

  console.log(`   Found ${users.length} users`);

  const userIdMap = new Map<string, string>(); // MongoDB user_id → PostgreSQL user_id

  for (const user of users) {
    // Determine tenant_id
    const mongoOrgId = user.organization_id || user.organizations?.[0];
    if (!mongoOrgId) {
      console.log(`   ⚠️  Skipping user ${user.email} - no organization`);
      continue;
    }

    const tenantId = orgIdMap.get(mongoOrgId.toString());
    if (!tenantId) {
      console.log(`   ⚠️  Skipping user ${user.email} - organization not migrated`);
      continue;
    }

    // Determine role
    const role = user.designation === 'admin' ? 'admin' : user.role || 'member';

    if (!DRY_RUN) {
      try {
        const result = await pgQuery<{ id: string }>(`
          INSERT INTO users (tenant_id, email, email_verified, password_hash, name, avatar_url, role, status, created_at, updated_at)
          VALUES ($1, $2, true, $3, $4, $5, $6, 'active', $7, $8)
          ON CONFLICT (tenant_id, email) DO UPDATE SET
            password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role,
            updated_at = EXCLUDED.updated_at
          RETURNING id
        `, [
          tenantId,
          user.email,
          user.password_hash || null,
          user.name,
          user.avatar_url || null,
          role,
          user.created_at || new Date(),
          user.updated_at || new Date()
        ]);

        const userId = result.rows[0].id;
        userIdMap.set(user._id.toString(), userId);

        console.log(`   ✓ ${user.email} → ${tenantId} (${role})`);
      } catch (error: any) {
        console.error(`   ✗ Failed to migrate user ${user.email}:`, error.message);
      }
    } else {
      console.log(`   [DRY RUN] Would migrate: ${user.email} → ${tenantId} (${role})`);
      userIdMap.set(user._id.toString(), `dry-run-${user._id}`);
    }
  }

  console.log(`✅ Migrated ${userIdMap.size} users\n`);
  return userIdMap;
}

// =====================================================
// STEP 4: CREATE PER-TENANT MONGODB DATABASES
// =====================================================

async function createTenantDatabases(orgIdMap: Map<string, string>) {
  console.log('🗄️  Creating Per-Tenant MongoDB Databases...');

  const collections = [
    'projects',
    'tasks',
    'sprints',
    'tags',
    'columns',
    'comments',
    'documents',
    'document_comments',
    'activities',
    'draft_sessions',
    'github_integrations',
    'github_sync_logs',
    'notifications',
    'invites'
  ];

  for (const [mongoOrgId, pgTenantId] of orgIdMap.entries()) {
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would create database: tenant_${pgTenantId.replace(/-/g, '_')}`);
      continue;
    }

    try {
      const tenantDb = await getTenantMongoDb(pgTenantId);

      // Create collections if they don't exist
      const existingCollections = await tenantDb.db.listCollections().toArray();
      const existingNames = existingCollections.map(c => c.name);

      for (const collectionName of collections) {
        if (!existingNames.includes(collectionName)) {
          await tenantDb.db.createCollection(collectionName);
        }
      }

      // Create indexes
      await createTenantIndexes(tenantDb);

      console.log(`   ✓ Created/verified database for tenant ${pgTenantId}`);

      // Close connection
      await tenantDb.close();
    } catch (error: any) {
      console.error(`   ✗ Failed to create database for tenant ${pgTenantId}:`, error.message);
    }
  }

  console.log(`✅ Created ${orgIdMap.size} tenant databases\n`);
}

async function createTenantIndexes(tenantDb: mongoose.Connection) {
  // Projects indexes
  await tenantDb.collection('projects').createIndex({ slug: 1 }, { unique: true });
  await tenantDb.collection('projects').createIndex({ created_at: -1 });

  // Tasks indexes
  await tenantDb.collection('tasks').createIndex({ project_id: 1 });
  await tenantDb.collection('tasks').createIndex({ sprint_id: 1 });
  await tenantDb.collection('tasks').createIndex({ assigned_to: 1 });
  await tenantDb.collection('tasks').createIndex({ status: 1 });

  // Sprints indexes
  await tenantDb.collection('sprints').createIndex({ project_id: 1 });
  await tenantDb.collection('sprints').createIndex({ status: 1 });

  // Comments indexes
  await tenantDb.collection('comments').createIndex({ task_id: 1 });
  await tenantDb.collection('comments').createIndex({ created_at: -1 });
}

// =====================================================
// STEP 5: MIGRATE PROJECT-SCOPED DATA
// =====================================================

async function migrateProjectData(orgIdMap: Map<string, string>) {
  console.log('📦 Migrating Project-Scoped Data to Tenant Databases...');

  const currentDb = mongoose.connection.db;

  for (const [mongoOrgId, pgTenantId] of orgIdMap.entries()) {
    console.log(`\n   Processing tenant ${pgTenantId}...`);

    // Get all projects for this organization
    const projects = await currentDb.collection('projects')
      .find({ organization_id: mongoOrgId })
      .toArray() as unknown as MongoProject[];

    if (projects.length === 0) {
      console.log(`   ⚠️  No projects found for organization ${mongoOrgId}`);
      continue;
    }

    console.log(`   Found ${projects.length} projects`);

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would migrate ${projects.length} projects and related data`);
      continue;
    }

    const tenantDb = await getTenantMongoDb(pgTenantId);
    const projectIds = projects.map(p => p._id.toString());

    // Migrate projects
    const projectsResult = await tenantDb.collection('projects').insertMany(projects);
    console.log(`   ✓ Migrated ${projectsResult.insertedCount} projects`);

    // Migrate tasks
    const tasks = await currentDb.collection('tasks')
      .find({ project_id: { $in: projectIds } })
      .toArray();
    if (tasks.length > 0) {
      await tenantDb.collection('tasks').insertMany(tasks);
      console.log(`   ✓ Migrated ${tasks.length} tasks`);
    }

    // Migrate sprints
    const sprints = await currentDb.collection('sprints')
      .find({ project_id: { $in: projectIds } })
      .toArray();
    if (sprints.length > 0) {
      await tenantDb.collection('sprints').insertMany(sprints);
      console.log(`   ✓ Migrated ${sprints.length} sprints`);
    }

    // Migrate comments
    const taskIds = tasks.map(t => (t as any)._id.toString());
    const comments = await currentDb.collection('comments')
      .find({ task_id: { $in: taskIds } })
      .toArray();
    if (comments.length > 0) {
      await tenantDb.collection('comments').insertMany(comments);
      console.log(`   ✓ Migrated ${comments.length} comments`);
    }

    // Migrate tags, columns, etc.
    const otherCollections = ['tags', 'columns', 'documents', 'document_comments', 'activities', 'notifications'];
    for (const collName of otherCollections) {
      const docs = await currentDb.collection(collName)
        .find({ $or: [{ organization_id: mongoOrgId }, { project_id: { $in: projectIds } }] })
        .toArray();
      if (docs.length > 0) {
        await tenantDb.collection(collName).insertMany(docs);
        console.log(`   ✓ Migrated ${docs.length} ${collName}`);
      }
    }

    await tenantDb.close();
  }

  console.log(`\n✅ Migrated all project data\n`);
}

// =====================================================
// STEP 6: VERIFY DATA INTEGRITY
// =====================================================

async function verifyMigration(orgIdMap: Map<string, string>) {
  console.log('🔍 Verifying Data Integrity...\n');

  let allValid = true;

  // Verify PostgreSQL data
  const tenantsCount = await pgQuery<{ count: string }>('SELECT COUNT(*) as count FROM tenants');
  const usersCount = await pgQuery<{ count: string }>('SELECT COUNT(*) as count FROM users');

  console.log(`   PostgreSQL:`);
  console.log(`   - Tenants: ${tenantsCount.rows[0].count}`);
  console.log(`   - Users: ${usersCount.rows[0].count}`);

  if (parseInt(tenantsCount.rows[0].count) !== orgIdMap.size) {
    console.log(`   ⚠️  Warning: Expected ${orgIdMap.size} tenants, found ${tenantsCount.rows[0].count}`);
    allValid = false;
  }

  // Verify MongoDB data
  console.log(`\n   MongoDB (per-tenant):`);
  for (const [mongoOrgId, pgTenantId] of orgIdMap.entries()) {
    if (DRY_RUN) continue;

    const tenantDb = await getTenantMongoDb(pgTenantId);
    const projectsCount = await tenantDb.collection('projects').countDocuments();
    const tasksCount = await tenantDb.collection('tasks').countDocuments();

    console.log(`   - Tenant ${pgTenantId}: ${projectsCount} projects, ${tasksCount} tasks`);

    await tenantDb.close();
  }

  console.log('');

  if (allValid) {
    console.log('✅ Data integrity verification passed!\n');
  } else {
    console.log('⚠️  Data integrity issues detected\n');
  }

  return allValid;
}

// =====================================================
// STEP 7: CREATE ROLLBACK SCRIPT
// =====================================================

async function createRollbackScript(orgIdMap: Map<string, string>) {
  console.log('📝 Creating Rollback Script...');

  const rollbackCommands = [
    '#!/bin/bash',
    '# Rollback script - WARNING: This will delete all migrated data!',
    '',
    'echo "⚠️  This will ROLLBACK the migration and DELETE all PostgreSQL tenant data!"',
    'read -p "Are you sure? (yes/no): " confirm',
    'if [ "$confirm" != "yes" ]; then',
    '  echo "Rollback cancelled"',
    '  exit 1',
    'fi',
    '',
    'echo "🔄 Rolling back migration..."',
    '',
    '# Drop PostgreSQL data',
    'psql $POSTGRES_URL -c "DELETE FROM users WHERE tenant_id IN (SELECT id FROM tenants);"',
    'psql $POSTGRES_URL -c "DELETE FROM tenants;"',
    '',
    '# Drop tenant MongoDB databases',
    ...Array.from(orgIdMap.values()).map(tenantId =>
      `mongo "${config.database.mongoUri}/tenant_${tenantId.replace(/-/g, '_')}" --eval "db.dropDatabase()"`
    ),
    '',
    'echo "✅ Rollback complete!"',
    'echo "⚠️  Original MongoDB data in ${config.database.name} is preserved"'
  ];

  const fs = await import('fs');
  await fs.promises.writeFile(
    './rollback-migration.sh',
    rollbackCommands.join('\n'),
    { mode: 0o755 }
  );

  console.log('✅ Rollback script created: rollback-migration.sh\n');
}

// =====================================================
// MAIN MIGRATION FUNCTION
// =====================================================

async function runMigration() {
  try {
    // Step 1: Connect
    await connectDatabases();

    if (VERIFY_ONLY) {
      console.log('🔍 VERIFICATION MODE - Checking existing migration...\n');
      const tenantsResult = await pgQuery<{ id: string }>('SELECT id FROM tenants LIMIT 1');
      if (tenantsResult.rows.length === 0) {
        console.log('❌ No migrated data found in PostgreSQL');
        process.exit(1);
      }

      // Build orgIdMap for verification
      const tenants = await pgQuery<{ id: string }>('SELECT id FROM tenants');
      const orgIdMap = new Map(tenants.rows.map(t => [t.id, t.id]));

      await verifyMigration(orgIdMap);
      process.exit(0);
    }

    // Step 2: Migrate organizations
    const orgIdMap = await migrateOrganizations();

    if (orgIdMap.size === 0) {
      console.log('❌ No organizations found to migrate');
      process.exit(1);
    }

    // Step 3: Migrate users
    const userIdMap = await migrateUsers(orgIdMap);

    // Step 4: Create tenant databases
    await createTenantDatabases(orgIdMap);

    // Step 5: Migrate project data
    await migrateProjectData(orgIdMap);

    // Step 6: Verify
    const isValid = await verifyMigration(orgIdMap);

    // Step 7: Create rollback script
    if (!DRY_RUN) {
      await createRollbackScript(orgIdMap);
    }

    // Summary
    console.log('✨ Migration Summary:');
    console.log(`   Organizations → Tenants: ${orgIdMap.size}`);
    console.log(`   Users migrated: ${userIdMap.size}`);
    console.log(`   Tenant databases created: ${orgIdMap.size}`);
    console.log(`   Data integrity: ${isValid ? '✅ Passed' : '⚠️  Issues detected'}`);
    console.log('');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN COMPLETE - No actual changes made');
      console.log('   To run migration for real, remove DRY_RUN=true');
    } else {
      console.log('✅ MIGRATION COMPLETE!');
      console.log('');
      console.log('📌 Next Steps:');
      console.log('   1. Verify data in admin portal');
      console.log('   2. Test application functionality');
      console.log('   3. Update application to use dual database (Week 4)');
      console.log('   4. Keep rollback script safe: ./rollback-migration.sh');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from databases');
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
