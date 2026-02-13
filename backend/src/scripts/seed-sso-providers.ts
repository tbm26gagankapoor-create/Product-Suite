/**
 * Seed SSO Providers with OAuth Credentials
 * Populates the sso_providers table with Google and Microsoft OAuth credentials from environment variables
 */

import crypto from 'crypto';
import { query } from '../db/postgres/client.js';
import { config } from '../config/index.js';

function encryptSecret(secret: string, encryptionKey: string): string {
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set in environment variables');
  }

  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function seedSSOProviders() {
  console.log('🔐 Seeding SSO Providers...');

  try {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('❌ ENCRYPTION_KEY not set in environment variables');
      process.exit(1);
    }

    // Update Microsoft Entra ID provider
    if (config.microsoft.clientId && config.microsoft.clientSecret) {
      console.log('  📝 Configuring Microsoft Entra ID...');

      const microsoftSecretEncrypted = encryptSecret(config.microsoft.clientSecret, encryptionKey);

      await query(`
        UPDATE sso_providers
        SET
          client_id = $1,
          client_secret_encrypted = $2,
          tenant_id = $3,
          redirect_uri = $4,
          is_enabled = true,
          scopes = $5,
          updated_at = NOW()
        WHERE provider_type = 'entra_id'
      `, [
        config.microsoft.clientId,
        microsoftSecretEncrypted,
        config.microsoft.tenantId,
        config.microsoft.redirectUri,
        config.microsoft.scopes.join(' ')
      ]);

      console.log('  ✅ Microsoft Entra ID configured and enabled');
    } else {
      console.log('  ⚠️  Skipping Microsoft - credentials not found in environment');
    }

    // Update Google Workspace provider
    if (config.google.clientId && config.google.clientSecret) {
      console.log('  📝 Configuring Google Workspace...');

      const googleSecretEncrypted = encryptSecret(config.google.clientSecret, encryptionKey);

      await query(`
        UPDATE sso_providers
        SET
          client_id = $1,
          client_secret_encrypted = $2,
          redirect_uri = $3,
          is_enabled = true,
          scopes = $4,
          updated_at = NOW()
        WHERE provider_type = 'google_workspace'
      `, [
        config.google.clientId,
        googleSecretEncrypted,
        config.google.redirectUri,
        config.google.scopes.join(' ')
      ]);

      console.log('  ✅ Google Workspace configured and enabled');
    } else {
      console.log('  ⚠️  Skipping Google - credentials not found in environment');
    }

    // Display configured providers
    const result = await query(`
      SELECT provider_type, name, display_name, is_enabled, client_id
      FROM sso_providers
      WHERE is_enabled = true
      ORDER BY display_order
    `);

    console.log('\n✅ SSO Providers configured:');
    result.rows.forEach((provider: any) => {
      console.log(`  • ${provider.display_name} (${provider.provider_type}) - Client ID: ${provider.client_id}`);
    });

    console.log('\n🎉 SSO provider seeding complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding SSO providers:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeder
seedSSOProviders();
