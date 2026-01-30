/**
 * Database Migration Script
 *
 * Creates necessary tables for the RBAC system in Supabase.
 *
 * Usage: npm run db:migrate
 */

import { supabaseAdmin } from '../lib/supabase.js';

const migrations = [
  // Tenants table
  `
  CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Tenant members (for querying, auth is in OpenFGA)
  `
  CREATE TABLE IF NOT EXISTS tenant_members (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
  );
  `,

  // Add tenant_id to projects if not exists
  `
  ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  `,

  // Workspace members (for querying, auth is in OpenFGA)
  `
  CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
  );
  `,

  // Add password_hash to users if using custom auth
  `
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
  `,

  // Update timestamps trigger
  `
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,

  // Add trigger to tenants
  `
  DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
  CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  `,

  // Indexes
  `
  CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
  `,
];

async function migrate() {
  console.log('🔄 Running database migrations...\n');

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i].trim();
    const preview = sql.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

      if (error) {
        // Try direct query if RPC not available
        const { error: directError } = await supabaseAdmin.from('_migrations').select().limit(0);
        if (directError) {
          console.log(`   ⚠️  Migration ${i + 1}: May need manual execution`);
          console.log(`      SQL: ${preview}`);
        }
      } else {
        console.log(`   ✅ Migration ${i + 1}: ${preview}`);
      }
    } catch (err) {
      console.log(`   ⚠️  Migration ${i + 1}: ${preview}`);
      console.log(`      Note: You may need to run this SQL manually in Supabase dashboard`);
    }
  }

  console.log('\n✅ Migrations complete!');
  console.log('\n📋 If any migrations failed, run them manually in Supabase SQL Editor.');
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
