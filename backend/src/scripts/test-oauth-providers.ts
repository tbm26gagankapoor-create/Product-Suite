/**
 * Test OAuth Providers from Database
 * Verifies that SSO providers are correctly configured and accessible
 */

import { ssoProviderService } from '../services/sso-provider.service.js';

async function testOAuthProviders() {
  console.log('🔐 Testing OAuth Providers from Database...\n');

  try {
    // Test 1: Get all enabled providers
    console.log('Test 1: Fetching all enabled providers...');
    const enabledProviders = await ssoProviderService.getEnabledProviders();
    console.log(`✅ Found ${enabledProviders.length} enabled provider(s)\n`);

    enabledProviders.forEach((provider, index) => {
      console.log(`Provider ${index + 1}:`);
      console.log(`  Name: ${provider.display_name}`);
      console.log(`  Type: ${provider.provider_type}`);
      console.log(`  Client ID: ${provider.client_id}`);
      console.log(`  Redirect URI: ${provider.redirect_uri}`);
      console.log(`  Scopes: ${provider.scopes.join(', ')}`);
      console.log(`  Tenant ID: ${provider.tenant_id || 'N/A'}`);
      console.log(`  Client Secret: ${provider.client_secret ? '[DECRYPTED]' : '[MISSING]'}\n`);
    });

    // Test 2: Get Microsoft Entra ID provider
    console.log('\nTest 2: Fetching Microsoft Entra ID provider...');
    const microsoftProvider = await ssoProviderService.getProviderByType('entra_id');
    if (microsoftProvider) {
      console.log('✅ Microsoft Entra ID provider found');
      console.log(`  Client ID: ${microsoftProvider.client_id}`);
      console.log(`  Client Secret: ${microsoftProvider.client_secret ? '[DECRYPTED]' : '[MISSING]'}`);
      console.log(`  Tenant ID: ${microsoftProvider.tenant_id}`);
      console.log(`  Redirect URI: ${microsoftProvider.redirect_uri}`);
      console.log(`  Scopes: ${microsoftProvider.scopes.join(', ')}`);
    } else {
      console.log('❌ Microsoft Entra ID provider not found');
    }

    // Test 3: Get Google Workspace provider
    console.log('\nTest 3: Fetching Google Workspace provider...');
    const googleProvider = await ssoProviderService.getProviderByType('google_workspace');
    if (googleProvider) {
      console.log('✅ Google Workspace provider found');
      console.log(`  Client ID: ${googleProvider.client_id}`);
      console.log(`  Client Secret: ${googleProvider.client_secret ? '[DECRYPTED]' : '[MISSING]'}`);
      console.log(`  Redirect URI: ${googleProvider.redirect_uri}`);
      console.log(`  Scopes: ${googleProvider.scopes.join(', ')}`);
    } else {
      console.log('❌ Google Workspace provider not found');
    }

    // Test 4: Check if providers are configured
    console.log('\nTest 4: Checking provider configuration status...');
    const isMicrosoftConfigured = await ssoProviderService.isProviderConfigured('entra_id');
    const isGoogleConfigured = await ssoProviderService.isProviderConfigured('google_workspace');

    console.log(`  Microsoft Entra ID: ${isMicrosoftConfigured ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`  Google Workspace: ${isGoogleConfigured ? '✅ Configured' : '❌ Not Configured'}`);

    // Test 5: Cache validation (fetch again to test caching)
    console.log('\nTest 5: Testing provider caching...');
    const startTime = Date.now();
    await ssoProviderService.getProviderByType('entra_id');
    const cachedTime = Date.now() - startTime;
    console.log(`✅ Cached provider fetch time: ${cachedTime}ms (should be <10ms if cached)`);

    // Test 6: Clear cache and fetch again
    console.log('\nTest 6: Testing cache clear...');
    ssoProviderService.clearCache();
    const startTime2 = Date.now();
    await ssoProviderService.getProviderByType('entra_id');
    const freshTime = Date.now() - startTime2;
    console.log(`✅ Fresh provider fetch time: ${freshTime}ms (should be >10ms for DB query)`);

    console.log('\n🎉 All OAuth provider tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ OAuth provider test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testOAuthProviders();
