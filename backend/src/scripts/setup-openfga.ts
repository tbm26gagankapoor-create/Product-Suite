/**
 * OpenFGA Setup Script
 *
 * This script:
 * 1. Creates an OpenFGA store (if needed)
 * 2. Writes the authorization model
 * 3. Outputs the store ID and model ID for .env
 *
 * Usage: npm run fga:setup
 */

import { OpenFgaClient } from '@openfga/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENFGA_API_URL = process.env.OPENFGA_API_URL || 'http://localhost:8080';

async function setup() {
  console.log('🔐 Setting up OpenFGA...\n');

  // Create client without store
  const client = new OpenFgaClient({
    apiUrl: OPENFGA_API_URL,
  });

  // Create store
  console.log('📦 Creating store...');
  const { id: storeId } = await client.createStore({
    name: 'infinia-rbac',
  });
  console.log(`   Store ID: ${storeId}\n`);

  // Load model from file
  const modelPath = path.join(__dirname, '../../../auth/openfga-model.json');
  const modelJson = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));

  // Create client with store
  const storeClient = new OpenFgaClient({
    apiUrl: OPENFGA_API_URL,
    storeId,
  });

  // Write authorization model
  console.log('📝 Writing authorization model...');
  const { authorization_model_id: modelId } = await storeClient.writeAuthorizationModel(modelJson);
  console.log(`   Model ID: ${modelId}\n`);

  // Output .env values
  console.log('✅ Setup complete!\n');
  console.log('Add these to your .env file:');
  console.log('─'.repeat(50));
  console.log(`OPENFGA_API_URL=${OPENFGA_API_URL}`);
  console.log(`OPENFGA_STORE_ID=${storeId}`);
  console.log(`OPENFGA_MODEL_ID=${modelId}`);
  console.log('─'.repeat(50));

  // Optionally seed with sample data
  if (process.argv.includes('--seed')) {
    console.log('\n🌱 Seeding sample authorization data...');
    await seedSampleData(storeClient);
  }
}

async function seedSampleData(client: OpenFgaClient) {
  // Create platform
  await client.write({
    writes: [
      // Platform admin
      { user: 'user:admin-1', relation: 'admin', object: 'platform:main' },

      // Tenant setup
      { user: 'platform:main', relation: 'platform', object: 'tenant:acme' },
      { user: 'user:admin-1', relation: 'admin', object: 'tenant:acme' },
      { user: 'user:user-1', relation: 'member', object: 'tenant:acme' },
      { user: 'user:user-2', relation: 'member', object: 'tenant:acme' },

      // Workspace setup
      { user: 'tenant:acme', relation: 'tenant', object: 'workspace:project-1' },
      { user: 'user:admin-1', relation: 'admin', object: 'workspace:project-1' },
      { user: 'user:user-1', relation: 'member', object: 'workspace:project-1' },
      { user: 'user:user-2', relation: 'viewer', object: 'workspace:project-1' },
    ],
  });

  console.log('   Sample data seeded successfully!');
}

setup().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
