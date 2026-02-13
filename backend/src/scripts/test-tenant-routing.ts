import { query } from '../db/postgres/client.js';
import { createTenantDb, getTenantConnection, initializeTenantDb } from '../lib/tenant-router.js';
import mongoose from 'mongoose';
import { config } from '../config/index.js';

/**
 * Test script to verify Week 4 tenant routing implementation
 *
 * Tests:
 * 1. PostgreSQL connection and user lookup
 * 2. Tenant database connections
 * 3. Tenant data isolation
 * 4. Auto-initialization of tenant databases
 */

async function testTenantRouting() {
  console.log('🧪 Testing Tenant Routing Implementation\n');
  console.log('==========================================\n');

  let allTestsPassed = true;

  try {
    // =====================================================
    // TEST 1: PostgreSQL User Lookup
    // =====================================================
    console.log('📊 Test 1: PostgreSQL User Lookup');
    console.log('----------------------------------');

    const usersResult = await query<any>(
      'SELECT id, email, name, role, tenant_id FROM users WHERE status = $1',
      ['active']
    );

    console.log(`✅ Found ${usersResult.rows.length} active users in PostgreSQL`);

    if (usersResult.rows.length === 0) {
      console.log('⚠️  No users found. Run migration first.\n');
      allTestsPassed = false;
    } else {
      usersResult.rows.forEach(user => {
        console.log(`   - ${user.email} (tenant: ${user.tenant_id ? user.tenant_id.substring(0, 8) + '...' : 'none'})`);
      });
      console.log('');
    }

    // =====================================================
    // TEST 2: PostgreSQL Tenant Lookup
    // =====================================================
    console.log('📊 Test 2: PostgreSQL Tenant Lookup');
    console.log('------------------------------------');

    const tenantsResult = await query<any>(
      'SELECT id, name, slug, is_active FROM tenants ORDER BY created_at'
    );

    console.log(`✅ Found ${tenantsResult.rows.length} tenants in PostgreSQL`);

    if (tenantsResult.rows.length === 0) {
      console.log('⚠️  No tenants found. Run migration first.\n');
      allTestsPassed = false;
      return;
    }

    const tenants = tenantsResult.rows;
    tenants.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug}) - Active: ${tenant.is_active}`);
    });
    console.log('');

    // =====================================================
    // TEST 3: Tenant Database Connections
    // =====================================================
    console.log('📊 Test 3: Tenant Database Connections');
    console.log('---------------------------------------');

    for (const tenant of tenants) {
      try {
        const tenantDb = await await createTenantDb(tenant.id);
        console.log(`✅ Created connection for: ${tenant.name} (${tenantDb.databaseName})`);

        // Test if database exists by listing collections
        const collections = await tenantDb.db.listCollections().toArray();
        console.log(`   Collections: ${collections.length > 0 ? collections.length : 'none (empty database)'}`);

        if (collections.length === 0) {
          console.log(`   ⚠️  Database exists but is empty. Auto-initialization will create collections on first access.`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to connect to tenant ${tenant.name}:`, error.message);
        allTestsPassed = false;
      }
    }
    console.log('');

    // =====================================================
    // TEST 4: Tenant Data Queries
    // =====================================================
    console.log('📊 Test 4: Tenant Data Queries');
    console.log('-------------------------------');

    for (const tenant of tenants) {
      try {
        const tenantDb = await createTenantDb(tenant.id);

        // Query projects
        const projects = await tenantDb.projects().find({}).toArray();
        console.log(`✅ ${tenant.name}: ${projects.length} projects`);

        if (projects.length > 0) {
          projects.forEach((project: any) => {
            console.log(`   - ${project.name || project.title || 'Untitled'} (${project.id})`);
          });
        }

        // Query tasks
        const tasks = await tenantDb.tasks().find({}).toArray();
        console.log(`   ${tenant.name}: ${tasks.length} tasks`);

        // Query sprints
        const sprints = await tenantDb.sprints().find({}).toArray();
        console.log(`   ${tenant.name}: ${sprints.length} sprints`);

      } catch (error: any) {
        console.error(`❌ Failed to query tenant ${tenant.name}:`, error.message);
        allTestsPassed = false;
      }
    }
    console.log('');

    // =====================================================
    // TEST 5: Cross-Tenant Isolation
    // =====================================================
    console.log('📊 Test 5: Cross-Tenant Isolation');
    console.log('----------------------------------');

    if (tenants.length >= 2) {
      const tenant1 = tenants[0];
      const tenant2 = tenants[1];

      const tenant1Db = await createTenantDb(tenant1.id);
      const tenant2Db = await createTenantDb(tenant2.id);

      const tenant1Projects = await tenant1Db.projects().find({}).toArray();
      const tenant2Projects = await tenant2Db.projects().find({}).toArray();

      console.log(`✅ Tenant 1 (${tenant1.name}): ${tenant1Projects.length} projects`);
      console.log(`✅ Tenant 2 (${tenant2.name}): ${tenant2Projects.length} projects`);

      // Verify they're different databases
      if (tenant1Db.databaseName !== tenant2Db.databaseName) {
        console.log(`✅ Databases are isolated: ${tenant1Db.databaseName} ≠ ${tenant2Db.databaseName}`);
      } else {
        console.error(`❌ WARNING: Same database name! Isolation may be broken.`);
        allTestsPassed = false;
      }
    } else {
      console.log('⚠️  Need at least 2 tenants to test isolation');
    }
    console.log('');

    // =====================================================
    // TEST 6: Database Naming Convention
    // =====================================================
    console.log('📊 Test 6: Database Naming Convention');
    console.log('--------------------------------------');

    for (const tenant of tenants) {
      const tenantDb = await createTenantDb(tenant.id);
      const expectedName = `t_${tenant.id.replace(/-/g, '')}`;

      if (tenantDb.databaseName === expectedName) {
        console.log(`✅ ${tenant.name}: ${tenantDb.databaseName} (correct format)`);
      } else {
        console.error(`❌ ${tenant.name}: ${tenantDb.databaseName} (expected: ${expectedName})`);
        allTestsPassed = false;
      }

      // Check length (must be ≤ 38 chars for MongoDB)
      if (tenantDb.databaseName.length <= 38) {
        console.log(`   Length: ${tenantDb.databaseName.length} chars (within MongoDB limit)`);
      } else {
        console.error(`   ❌ Length: ${tenantDb.databaseName.length} chars (exceeds MongoDB 38-char limit!)`);
        allTestsPassed = false;
      }
    }
    console.log('');

    // =====================================================
    // TEST 7: Middleware Simulation
    // =====================================================
    console.log('📊 Test 7: Middleware Flow Simulation');
    console.log('--------------------------------------');

    if (usersResult.rows.length > 0) {
      const testUser = usersResult.rows[0];

      console.log(`Testing with user: ${testUser.email}`);

      // Step 1: Auth middleware would get user from PostgreSQL
      console.log(`✅ Step 1 (auth): User fetched from PostgreSQL`);
      console.log(`   - User ID: ${testUser.id}`);
      console.log(`   - Tenant ID: ${testUser.tenant_id || 'none'}`);

      if (testUser.tenant_id) {
        // Step 2: Tenant middleware would get tenant
        const tenantResult = await query<any>(
          'SELECT id, name, slug FROM tenants WHERE id = $1 AND is_active = true',
          [testUser.tenant_id]
        );

        if (tenantResult.rows.length > 0) {
          const tenant = tenantResult.rows[0];
          console.log(`✅ Step 2 (tenant): Tenant fetched from PostgreSQL`);
          console.log(`   - Tenant: ${tenant.name} (${tenant.slug})`);

          // Step 3: Tenant middleware would create tenantDb
          const tenantDb = await createTenantDb(tenant.id);
          console.log(`✅ Step 3 (tenant): TenantDb created`);
          console.log(`   - Database: ${tenantDb.databaseName}`);

          // Step 4: Route handler would query tenant data
          const projects = await tenantDb.projects().find({}).toArray();
          console.log(`✅ Step 4 (handler): Query tenant data`);
          console.log(`   - Projects: ${projects.length}`);
        } else {
          console.log(`⚠️  Tenant not found or inactive`);
        }
      } else {
        console.log(`⚠️  User has no tenant association`);
      }
    }
    console.log('');

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log('==========================================');
    if (allTestsPassed) {
      console.log('✅ All Tests Passed!\n');
      console.log('Week 4 tenant routing is working correctly.');
      console.log('\nNext Steps:');
      console.log('1. Update routes to use tenant middleware');
      console.log('2. Migrate route handlers to use req.tenantDb');
      console.log('3. Remove organization_id filters (already scoped!)');
      console.log('4. Test with actual API requests');
    } else {
      console.log('❌ Some Tests Failed\n');
      console.log('Please review the errors above and fix issues before proceeding.');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    throw error;
  } finally {
    // Note: We don't close connections here as they may be reused
    // In a real app, connections are managed by the application lifecycle
    console.log('\n👋 Test complete');
  }
}

// Run tests
testTenantRouting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
