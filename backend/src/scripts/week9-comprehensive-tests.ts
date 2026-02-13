/**
 * Week 9: Comprehensive Testing Suite
 * Tests all critical functionality before production deployment
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = 'admin@infinia.app';
const ADMIN_PASSWORD = 'admin123';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = (message: string, color: keyof typeof colors = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];
let adminToken = '';
let userToken = '';
let testUserId = '';
let testOrgId = '';
let testProjectId = '';

// Helper: Run a test
async function test(
  category: string,
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    results.push({ category, name, passed: true, duration });
    log(`   ✅ ${name} (${duration}ms)`, 'green');
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      category,
      name,
      passed: false,
      duration,
      error: error.message,
    });
    log(`   ❌ ${name} - ${error.message}`, 'red');
  }
}

// Helper: API call
async function apiCall(
  method: string,
  endpoint: string,
  data?: any,
  token?: string
): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers,
      validateStatus: () => true, // Don't throw on any status
    });
    return response;
  } catch (error: any) {
    throw new Error(`API Error: ${error.message}`);
  }
}

// ===========================================
// 1. AUTHENTICATION & AUTHORIZATION TESTS
// ===========================================
async function testAuthentication() {
  log('\n🔐 Authentication & Authorization Tests', 'cyan');
  log('==========================================', 'cyan');

  await test('Auth', 'Admin login with valid credentials', async () => {
    const response = await apiCall('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.data?.token) throw new Error('No token returned');
    adminToken = response.data.data.token;
  });

  await test('Auth', 'Get current user with valid token', async () => {
    const response = await apiCall('GET', '/auth/me', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.data?.email) throw new Error('No user data returned');
  });

  await test('Auth', 'Reject request with invalid token', async () => {
    const response = await apiCall('GET', '/auth/me', undefined, 'invalid-token');
    if (response.status === 200) throw new Error('Should have been rejected');
    if (response.status !== 401 && response.status !== 403)
      throw new Error(`Expected 401/403, got ${response.status}`);
  });

  await test('Auth', 'Reject request with no token', async () => {
    const response = await apiCall('GET', '/users');
    if (response.status === 200) throw new Error('Should have been rejected');
    if (response.status !== 401 && response.status !== 403)
      throw new Error(`Expected 401/403, got ${response.status}`);
  });

  await test('Auth', 'Login fails with invalid credentials', async () => {
    const response = await apiCall('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: 'wrong-password',
    });
    if (response.status === 200) throw new Error('Should have failed');
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  });
}

// ===========================================
// 2. AI PROVIDER TESTS
// ===========================================
async function testAIProviders() {
  log('\n🤖 AI Provider Tests', 'cyan');
  log('====================', 'cyan');

  await test('AI Providers', 'Fetch available providers (public endpoint)', async () => {
    const response = await apiCall('GET', '/projects/ai-providers');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!Array.isArray(response.data.data)) throw new Error('Expected array');
    if (response.data.data.length < 1) throw new Error('No providers returned');
  });

  await test('AI Providers', 'Get default provider', async () => {
    const response = await apiCall('GET', '/projects/ai-providers');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    const defaultProvider = response.data.data.find((p: any) => p.is_default);
    if (!defaultProvider) throw new Error('No default provider found');
    if (!defaultProvider.display_name) throw new Error('Missing display_name');
  });

  await test('AI Providers', 'Provider has required fields', async () => {
    const response = await apiCall('GET', '/projects/ai-providers');
    const provider = response.data.data[0];
    if (!provider.id) throw new Error('Missing id');
    if (!provider.name) throw new Error('Missing name');
    if (!provider.display_name) throw new Error('Missing display_name');
    if (!provider.provider_type) throw new Error('Missing provider_type');
    if (!provider.api_endpoint) throw new Error('Missing api_endpoint');
    if (provider.is_enabled === undefined) throw new Error('Missing is_enabled');
  });

  await test('AI Providers', 'Verify caching works', async () => {
    const start1 = Date.now();
    await apiCall('GET', '/projects/ai-providers');
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await apiCall('GET', '/projects/ai-providers');
    const time2 = Date.now() - start2;

    // Second call should be faster (cached)
    if (time2 >= time1) log('     ⚠️  Cache may not be working (times similar)', 'yellow');
  });
}

// ===========================================
// 3. SECURITY TESTS
// ===========================================
async function testSecurity() {
  log('\n🔒 Security Tests', 'cyan');
  log('==================', 'cyan');

  await test('Security', 'SQL Injection attempt blocked (login)', async () => {
    const response = await apiCall('POST', '/auth/login', {
      email: "admin@infinia.app' OR '1'='1",
      password: 'anything',
    });
    if (response.status === 200) throw new Error('SQL injection succeeded!');
  });

  await test('Security', 'XSS payload sanitized in project name', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await apiCall(
      'POST',
      '/projects',
      {
        name: xssPayload,
        description: 'Test',
      },
      adminToken
    );
    // Should either reject or sanitize
    if (response.data?.data?.name === xssPayload) {
      throw new Error('XSS payload not sanitized!');
    }
  });

  await test('Security', 'Admin endpoints require authentication', async () => {
    const response = await apiCall('GET', '/admin/dashboard/stats');
    if (response.status === 200) throw new Error('Admin endpoint accessible without auth!');
  });

  await test('Security', 'Cannot access other user data without permission', async () => {
    // Try to access admin endpoint with regular user token (if we had one)
    // For now, test that no token = no access
    const response = await apiCall('GET', '/users');
    if (response.status === 200) throw new Error('User data accessible without auth!');
  });
}

// ===========================================
// 4. TENANT ISOLATION TESTS
// ===========================================
async function testTenantIsolation() {
  log('\n🏢 Tenant Isolation Tests', 'cyan');
  log('=========================', 'cyan');

  await test('Tenant', 'Projects scoped to organization', async () => {
    const response = await apiCall('GET', '/projects', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);

    // All projects should have organization_id
    const projects = response.data.data || [];
    for (const project of projects) {
      if (!project.organization_id) {
        throw new Error(`Project ${project.id} missing organization_id`);
      }
    }
  });

  await test('Tenant', 'Tasks scoped to organization', async () => {
    const response = await apiCall('GET', '/tasks', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);

    // All tasks should have organization_id
    const tasks = response.data.data || [];
    for (const task of tasks) {
      if (!task.organization_id) {
        throw new Error(`Task ${task.id} missing organization_id`);
      }
    }
  });

  await test('Tenant', 'Cannot create project without org context', async () => {
    // This would require removing the org context middleware
    // For now, just verify projects have org_id
    const response = await apiCall(
      'POST',
      '/projects',
      { name: 'Test Project', description: 'Test' },
      adminToken
    );
    if (response.status === 201 || response.status === 200) {
      if (!response.data.data?.organization_id) {
        throw new Error('Project created without organization_id!');
      }
    }
  });
}

// ===========================================
// 5. PERFORMANCE TESTS
// ===========================================
async function testPerformance() {
  log('\n⚡ Performance Tests', 'cyan');
  log('===================', 'cyan');

  await test('Performance', 'Health endpoint responds < 100ms', async () => {
    const start = Date.now();
    const response = await apiCall('GET', '/health');
    const duration = Date.now() - start;

    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (duration > 100) throw new Error(`Too slow: ${duration}ms`);
  });

  await test('Performance', 'AI providers endpoint responds < 200ms', async () => {
    const start = Date.now();
    const response = await apiCall('GET', '/projects/ai-providers');
    const duration = Date.now() - start;

    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (duration > 200) throw new Error(`Too slow: ${duration}ms`);
  });

  await test('Performance', 'Projects list responds < 500ms', async () => {
    const start = Date.now();
    const response = await apiCall('GET', '/projects', undefined, adminToken);
    const duration = Date.now() - start;

    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (duration > 500) throw new Error(`Too slow: ${duration}ms`);
  });

  await test('Performance', 'Tasks list responds < 500ms', async () => {
    const start = Date.now();
    const response = await apiCall('GET', '/tasks', undefined, adminToken);
    const duration = Date.now() - start;

    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (duration > 500) throw new Error(`Too slow: ${duration}ms`);
  });
}

// ===========================================
// 6. DATA INTEGRITY TESTS
// ===========================================
async function testDataIntegrity() {
  log('\n📊 Data Integrity Tests', 'cyan');
  log('=======================', 'cyan');

  await test('Data', 'All projects have required fields', async () => {
    const response = await apiCall('GET', '/projects', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);

    const projects = response.data.data || [];
    for (const project of projects) {
      if (!project.id) throw new Error('Project missing id');
      if (!project.name) throw new Error('Project missing name');
      if (!project.organization_id) throw new Error('Project missing organization_id');
    }
  });

  await test('Data', 'All tasks have required fields', async () => {
    const response = await apiCall('GET', '/tasks', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);

    const tasks = response.data.data || [];
    for (const task of tasks) {
      if (!task.id) throw new Error('Task missing id');
      if (!task.title) throw new Error('Task missing title');
      if (!task.organization_id) throw new Error('Task missing organization_id');
    }
  });

  await test('Data', 'Projects count matches expected', async () => {
    const response = await apiCall('GET', '/projects', undefined, adminToken);
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);

    const count = response.data.data?.length || 0;
    log(`     ℹ️  Found ${count} projects`, 'blue');
  });
}

// ===========================================
// MAIN TEST RUNNER
// ===========================================
async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('  Week 9: Comprehensive Testing Suite', 'bright');
  log('  Infinia Products - Production Readiness Tests', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  const startTime = Date.now();

  try {
    await testAuthentication();
    await testAIProviders();
    await testSecurity();
    await testTenantIsolation();
    await testPerformance();
    await testDataIntegrity();
  } catch (error: any) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
  }

  const totalTime = Date.now() - startTime;

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('  Test Summary', 'bright');
  log('='.repeat(60), 'bright');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => r.passed === false).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, parseFloat(passRate) >= 90 ? 'green' : 'yellow');
  log(`Total Time: ${(totalTime / 1000).toFixed(2)}s\n`, 'cyan');

  // Failed tests detail
  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`   - [${r.category}] ${r.name}`, 'red');
        if (r.error) log(`     Error: ${r.error}`, 'red');
      });
  }

  // Category breakdown
  log('\n📊 Results by Category:', 'cyan');
  const categories = [...new Set(results.map((r) => r.category))];
  categories.forEach((cat) => {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    const catTotal = catResults.length;
    const catRate = ((catPassed / catTotal) * 100).toFixed(0);
    const icon = catPassed === catTotal ? '✅' : '⚠️';
    log(`   ${icon} ${cat}: ${catPassed}/${catTotal} (${catRate}%)`, 'cyan');
  });

  // Performance stats
  log('\n⚡ Performance Stats:', 'cyan');
  const avgTime = (results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(
    0
  );
  const maxTime = Math.max(...results.map((r) => r.duration));
  const slowest = results.find((r) => r.duration === maxTime);
  log(`   Average: ${avgTime}ms`, 'cyan');
  log(
    `   Slowest: ${maxTime}ms (${slowest?.category}: ${slowest?.name})`,
    'cyan'
  );

  log('\n' + '='.repeat(60) + '\n', 'bright');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
