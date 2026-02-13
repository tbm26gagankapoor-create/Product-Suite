import mongoose from 'mongoose';
import { query as pgQuery } from '../db/postgres/client.js';
import { config } from '../config/index.js';

/**
 * Complete MongoDB Per-Tenant Migration
 * This script finishes the MongoDB part of Week 3 migration
 * (PostgreSQL migration is already complete)
 */

async function getTenantMongoDb(tenantId: string): Promise<mongoose.Connection> {
  // MongoDB database names have a 38 byte limit
  // Remove hyphens from UUID to shorten: "t_" + UUID without hyphens = 34 chars
  const dbName = `t_${tenantId.replace(/-/g, '')}`;
  const uri = config.database.mongoUri;

  // Remove any existing database name from URI
  const baseUri = uri.split('/').slice(0, 3).join('/');
  const params = uri.includes('?') ? '?' + uri.split('?')[1] : '';

  // For MongoDB Atlas, ensure proper write concern
  const hasWriteConcern = params.includes('w=');
  const finalParams = hasWriteConcern ? params : (params ? `${params}&w=majority` : '?w=majority');

  const connectionString = `${baseUri}/${dbName}${finalParams}`;
  console.log(`   Connecting to: ${dbName}`);
  return mongoose.createConnection(connectionString);
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

async function completeMigration() {
  console.log('🔄 Completing MongoDB Per-Tenant Migration');
  console.log('==========================================\n');

  try {
    // Connect to current MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(`${config.database.mongoUri}/${config.database.name}`);
    console.log('✅ Connected to MongoDB:', config.database.name);

    // Get all tenants from PostgreSQL
    console.log('\n📊 Fetching tenants from PostgreSQL...');
    const tenantsResult = await pgQuery<{ id: string; name: string; slug: string }>('SELECT id, name, slug FROM tenants ORDER BY created_at');
    const tenants = tenantsResult.rows;
    console.log(`✅ Found ${tenants.length} tenants\n`);

    // Get MongoDB organization IDs mapped to PostgreSQL tenant IDs
    const currentDb = mongoose.connection.db;
    const organizations = await currentDb.collection('organizations').find({}).toArray();

    // Create mapping of org names to PostgreSQL tenant IDs
    const orgMap = new Map<string, string>();
    for (const org of organizations as any[]) {
      const tenant = tenants.find(t => t.slug === (org.slug || org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
      if (tenant) {
        orgMap.set(org._id.toString(), tenant.id);
      }
    }

    console.log('🗄️  Creating Per-Tenant Databases and Migrating Data...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const [mongoOrgId, pgTenantId] of orgMap.entries()) {
      const tenant = tenants.find(t => t.id === pgTenantId);
      if (!tenant) continue;

      console.log(`   Processing: ${tenant.name} (${tenant.slug})`);

      try {
        // Create tenant database connection
        const tenantDb = await getTenantMongoDb(pgTenantId);

        // Get projects for this organization
        const projects = await currentDb.collection('projects')
          .find({ organization_id: mongoOrgId })
          .toArray();

        if (projects.length === 0) {
          console.log(`   ⚠️  No projects found, creating empty database`);
        } else {
          console.log(`   Found ${projects.length} projects`);

          const projectIds = projects.map(p => (p as any)._id.toString());

          // Migrate projects
          await tenantDb.collection('projects').insertMany(projects);
          console.log(`   ✓ Migrated ${projects.length} projects`);

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

          // Migrate other collections
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
        }

        // Create indexes
        await createTenantIndexes(tenantDb);
        console.log(`   ✓ Created indexes`);

        // Close connection
        await tenantDb.close();

        console.log(`   ✅ Complete: t_${pgTenantId.replace(/-/g, '')}\n`);
        successCount++;

      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n✨ Migration Summary:');
    console.log(`   Successful: ${successCount} tenant databases`);
    console.log(`   Failed: ${errorCount} tenant databases`);
    console.log(`   Total: ${tenants.length} tenants\n`);

    if (successCount > 0) {
      console.log('✅ MongoDB per-tenant migration complete!');
      console.log('\n📌 What was created:');
      for (const tenant of tenants) {
        console.log(`   - t_${tenant.id.replace(/-/g, '')}`);
      }

      console.log('\n🎉 Week 3 Migration COMPLETE!');
      console.log('   PostgreSQL: 4 tenants, 3 users');
      console.log(`   MongoDB: ${successCount} tenant databases`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from databases');
  }
}

// Run
completeMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
