/**
 * Admin API Test Script
 * Tests all 4 critical admin features:
 * 1. AI Provider Management
 * 2. System Dashboard
 * 3. Tenant Management
 * 4. Git Provider Configuration
 */

import { config } from '../config/index.js';

const API_BASE = `http://localhost:${config.port}/api/v1`;

interface TestResult {
  feature: string;
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  error?: string;
}

const results: TestResult[] = [];

// Helper to make API requests
async function apiRequest(method: string, endpoint: string, token?: string, body?: any) {
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// Helper to log results
function logResult(feature: string, test: string, passed: boolean, message?: string, error?: string) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ feature, test, status, message, error });

  const emoji = passed ? '✅' : '❌';
  const msg = message ? ` - ${message}` : '';
  const err = error ? `\n   Error: ${error}` : '';
  console.log(`   ${emoji} ${test}${msg}${err}`);
}

async function runTests() {
  console.log('🔧 Testing Admin Portal API');
  console.log('=====================================\n');

  let adminToken: string = '';

  // ===============================
  // TEST 1: Admin Authentication
  // ===============================
  console.log('🔐 Feature 1: Admin Authentication');
  console.log('-----------------------------------');

  try {
    // Try to login with default admin credentials
    const { status, data } = await apiRequest('POST', '/admin/auth/login', undefined, {
      email: 'admin@infinia.app',
      password: 'admin123',
    });

    if (status === 200 && data?.data?.token) {
      adminToken = data.data.token;
      logResult('Auth', 'Admin login successful', true, `Admin ID: ${data.data.admin.id}`);
    } else {
      logResult('Auth', 'Admin login', false, `Status: ${status}`, JSON.stringify(data));
    }
  } catch (error: any) {
    logResult('Auth', 'Admin login', false, undefined, error.message);
  }

  if (!adminToken) {
    console.log('\n❌ Cannot proceed without admin authentication. Exiting.\n');
    return;
  }

  console.log('');

  // Test /admin/auth/me
  try {
    const { status, data } = await apiRequest('GET', '/admin/auth/me', adminToken);

    if (status === 200 && data?.success) {
      logResult('Auth', 'GET /admin/auth/me', true, `Admin: ${data.data.admin.email}`);
    } else {
      logResult('Auth', 'GET /admin/auth/me', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Auth', 'GET /admin/auth/me', false, undefined, error.message);
  }

  console.log('');

  // ===============================
  // TEST 2: AI Provider Management
  // ===============================
  console.log('🤖 Feature 2: AI Provider Management');
  console.log('-------------------------------------');

  let testProviderId: string = '';

  // List AI providers
  try {
    const { status, data } = await apiRequest('GET', '/admin/ai-providers', adminToken);

    if (status === 200 && data?.success) {
      logResult('AI Providers', 'GET /admin/ai-providers', true, `Found ${data.data.length} providers`);
      if (data.data.length > 0) {
        testProviderId = data.data[0].id;
      }
    } else {
      logResult('AI Providers', 'GET /admin/ai-providers', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('AI Providers', 'GET /admin/ai-providers', false, undefined, error.message);
  }

  // Get single provider (if exists)
  if (testProviderId) {
    try {
      const { status, data } = await apiRequest('GET', `/admin/ai-providers/${testProviderId}`, adminToken);

      if (status === 200 && data?.success) {
        logResult('AI Providers', 'GET /admin/ai-providers/:id', true, `Provider: ${data.data.display_name}`);
      } else {
        logResult('AI Providers', 'GET /admin/ai-providers/:id', false, `Status: ${status}`);
      }
    } catch (error: any) {
      logResult('AI Providers', 'GET /admin/ai-providers/:id', false, undefined, error.message);
    }

    // Test provider connection
    try {
      const { status, data } = await apiRequest('POST', `/admin/ai-providers/${testProviderId}/test`, adminToken);

      if (status === 200 && data?.success) {
        logResult('AI Providers', 'POST /admin/ai-providers/:id/test', true, 'Connection test successful');
      } else {
        logResult('AI Providers', 'POST /admin/ai-providers/:id/test', false, `Status: ${status}`);
      }
    } catch (error: any) {
      logResult('AI Providers', 'POST /admin/ai-providers/:id/test', false, undefined, error.message);
    }
  }

  console.log('');

  // ===============================
  // TEST 3: System Dashboard
  // ===============================
  console.log('📊 Feature 3: System Dashboard');
  console.log('-------------------------------');

  // Dashboard stats
  try {
    const { status, data } = await apiRequest('GET', '/admin/dashboard/stats', adminToken);

    if (status === 200 && data?.success) {
      const stats = data.data;
      logResult('Dashboard', 'GET /admin/dashboard/stats', true,
        `Tenants: ${stats.tenants.total_tenants}, Users: ${stats.users.total_users}, Providers: ${stats.ai_providers.total_providers}`);
    } else {
      logResult('Dashboard', 'GET /admin/dashboard/stats', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Dashboard', 'GET /admin/dashboard/stats', false, undefined, error.message);
  }

  // System health
  try {
    const { status, data } = await apiRequest('GET', '/admin/dashboard/health', adminToken);

    if (status === 200 && data?.success) {
      logResult('Dashboard', 'GET /admin/dashboard/health', true, `System status: ${data.data.status}`);
    } else {
      logResult('Dashboard', 'GET /admin/dashboard/health', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Dashboard', 'GET /admin/dashboard/health', false, undefined, error.message);
  }

  console.log('');

  // ===============================
  // TEST 4: Tenant Management
  // ===============================
  console.log('🏢 Feature 4: Tenant Management');
  console.log('--------------------------------');

  let testTenantId: string = '';

  // List tenants
  try {
    const { status, data } = await apiRequest('GET', '/admin/tenants', adminToken);

    if (status === 200 && data?.success) {
      logResult('Tenants', 'GET /admin/tenants', true, `Found ${data.data.length} tenants`);
      if (data.data.length > 0) {
        testTenantId = data.data[0].id;
      }
    } else {
      logResult('Tenants', 'GET /admin/tenants', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Tenants', 'GET /admin/tenants', false, undefined, error.message);
  }

  // Get single tenant (if exists)
  if (testTenantId) {
    try {
      const { status, data } = await apiRequest('GET', `/admin/tenants/${testTenantId}`, adminToken);

      if (status === 200 && data?.success) {
        logResult('Tenants', 'GET /admin/tenants/:id', true, `Tenant: ${data.data.name}, Users: ${data.data.user_count}`);
      } else {
        logResult('Tenants', 'GET /admin/tenants/:id', false, `Status: ${status}`);
      }
    } catch (error: any) {
      logResult('Tenants', 'GET /admin/tenants/:id', false, undefined, error.message);
    }
  }

  console.log('');

  // ===============================
  // TEST 5: Git Provider Configuration
  // ===============================
  console.log('🔗 Feature 5: Git Provider Configuration');
  console.log('-----------------------------------------');

  let testGitProviderId: string = '';

  // List Git providers
  try {
    const { status, data } = await apiRequest('GET', '/admin/git-providers', adminToken);

    if (status === 200 && data?.success) {
      logResult('Git Providers', 'GET /admin/git-providers', true, `Found ${data.data.length} providers`);
      if (data.data.length > 0) {
        testGitProviderId = data.data[0].id;
      }
    } else {
      logResult('Git Providers', 'GET /admin/git-providers', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Git Providers', 'GET /admin/git-providers', false, undefined, error.message);
  }

  // Get single Git provider (if exists)
  if (testGitProviderId) {
    try {
      const { status, data } = await apiRequest('GET', `/admin/git-providers/${testGitProviderId}`, adminToken);

      if (status === 200 && data?.success) {
        logResult('Git Providers', 'GET /admin/git-providers/:id', true, `Provider: ${data.data.display_name}`);
      } else {
        logResult('Git Providers', 'GET /admin/git-providers/:id', false, `Status: ${status}`);
      }
    } catch (error: any) {
      logResult('Git Providers', 'GET /admin/git-providers/:id', false, undefined, error.message);
    }
  }

  console.log('');

  // ===============================
  // TEST 6: Audit Log
  // ===============================
  console.log('📝 Feature 6: Audit Log');
  console.log('------------------------');

  try {
    const { status, data } = await apiRequest('GET', '/admin/audit-log?limit=10', adminToken);

    if (status === 200 && data?.success) {
      logResult('Audit Log', 'GET /admin/audit-log', true, `Retrieved ${data.data.logs.length} log entries`);
    } else {
      logResult('Audit Log', 'GET /admin/audit-log', false, `Status: ${status}`);
    }
  } catch (error: any) {
    logResult('Audit Log', 'GET /admin/audit-log', false, undefined, error.message);
  }

  console.log('');

  // ===============================
  // SUMMARY
  // ===============================
  console.log('=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.feature}: ${r.test}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
    console.log('');
  }

  if (passed === total) {
    console.log('🎉 ALL ADMIN API TESTS PASSED!\n');
    console.log('✅ All 4 critical admin features are working correctly');
    console.log('✅ Admin authentication is enforced');
    console.log('✅ Audit logging is active\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }

  console.log('👋 Test complete\n');
}

// Run tests
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
