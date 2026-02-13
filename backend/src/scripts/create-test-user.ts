import { query } from '../db/postgres/client.js';
import bcrypt from 'bcryptjs';

/**
 * Create a test user for API testing
 * Email: test@infinia.app
 * Password: test123
 */

async function createTestUser() {
  console.log('👤 Creating test user for API testing...\n');

  try {
    // Check if test user already exists
    const existingUser = await query(
      'SELECT id, email FROM users WHERE email = $1',
      ['test@infinia.app']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('   Email: test@infinia.app');
      console.log('   Password: test123');
      console.log('   User ID:', existingUser.rows[0].id);
      return;
    }

    // Get the first tenant to associate the user with
    const tenantResult = await query('SELECT id, name FROM tenants ORDER BY created_at LIMIT 1');
    if (tenantResult.rows.length === 0) {
      console.error('❌ No tenants found. Please run seed script first.');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];
    console.log(`📊 Using tenant: ${tenant.name} (${tenant.id})\n`);

    // Hash password
    const passwordHash = await bcrypt.hash('test123', 10);

    // Create test user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, tenant_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role`,
      ['test@infinia.app', passwordHash, 'Test User', 'admin', tenant.id, 'active']
    );

    const user = result.rows[0];
    console.log('✅ Test user created successfully!');
    console.log('   Email: test@infinia.app');
    console.log('   Password: test123');
    console.log('   User ID:', user.id);
    console.log('   Role:', user.role);
    console.log('   Tenant:', tenant.name);

  } catch (error: any) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUser()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { createTestUser };
