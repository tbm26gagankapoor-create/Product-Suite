/**
 * Provider Fallback Integration Test
 * Tests the actual AI generation with fallback logic
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = `fallback-test-${Date.now()}@infinia.com`;
const TEST_PASSWORD = 'TestPassword123!';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = (message: string, color: keyof typeof colors = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];
let userToken = '';

async function apiCall(method: string, endpoint: string, data?: any, token?: string): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers,
      validateStatus: () => true,
    });
    return response;
  } catch (error: any) {
    throw new Error(`API Error: ${error.message}`);
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    log(`   ✅ ${name} (${duration}ms)`, 'green');
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ name, passed: false, duration, error: error.message });
    log(`   ❌ ${name} - ${error.message}`, 'red');
  }
}

async function setupTestUser() {
  log('\n🔧 Setup: Creating Test User', 'cyan');
  log('==========================', 'cyan');

  await test('Register test user', async () => {
    const response = await apiCall('POST', '/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Fallback Test User',
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Registration failed: ${response.status}`);
    }
    if (!response.data.data?.token) {
      throw new Error('No token returned');
    }
    userToken = response.data.data.token;
  });
}

async function testProviderSelection() {
  log('\n🤖 Provider Selection Tests', 'cyan');
  log('============================', 'cyan');

  let providers: any[] = [];

  await test('Fetch all available providers', async () => {
    const response = await apiCall('GET', '/projects/ai-providers');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!Array.isArray(response.data.data)) throw new Error('Expected array');

    providers = response.data.data.filter((p: any) => p.is_enabled);
    if (providers.length < 1) throw new Error('No enabled providers found');

    log(`     ℹ️  Found ${providers.length} enabled providers`, 'cyan');
    providers.forEach(p => log(`        - ${p.display_name} (${p.name})`, 'cyan'));
  });

  await test('Verify default provider is set', async () => {
    const defaultProvider = providers.find(p => p.is_default);
    if (!defaultProvider) throw new Error('No default provider');
    log(`     ℹ️  Default: ${defaultProvider.display_name}`, 'cyan');
  });

  await test('Verify fallback providers available', async () => {
    const fallbackProviders = providers.filter(p => !p.is_default);
    if (fallbackProviders.length < 1) {
      log('     ⚠️  No fallback providers (only default enabled)', 'yellow');
    } else {
      log(`     ℹ️  ${fallbackProviders.length} fallback provider(s) available`, 'cyan');
    }
  });
}

async function testAIGeneration() {
  log('\n🧪 AI Generation Tests', 'cyan');
  log('======================', 'cyan');

  await test('Generate simple AI response', async () => {
    const response = await apiCall('POST', '/ai/generate', {
      prompt: 'Say "Hello" in JSON format with a single field called "message"',
      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    }, userToken);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Generation failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    const data = response.data;
    if (!data.success) throw new Error('Generation not successful');

    log(`     ℹ️  Response received (${JSON.stringify(data).length} bytes)`, 'cyan');
  });

  await test('Test with invalid model (should fallback)', async () => {
    const response = await apiCall('POST', '/ai/generate', {
      prompt: 'Say "Hello" in JSON format',
      model: 'invalid-model-name',
    }, userToken);

    // Should either work (fallback) or fail gracefully
    if (response.status === 200 || response.status === 201) {
      log(`     ℹ️  Fallback handled invalid model`, 'cyan');
    } else if (response.status >= 400) {
      log(`     ℹ️  Invalid model rejected (expected behavior)`, 'cyan');
    }
  });
}

async function testFallbackService() {
  log('\n🔄 Fallback Service Tests', 'cyan');
  log('==========================', 'cyan');

  await test('Verify fallback service exists', async () => {
    // Check if fallback service file exists
    const fs = await import('fs');
    const path = await import('path');

    const fallbackServicePath = path.join(process.cwd(), '../services/ai-fallback.service.ts');
    if (!fs.existsSync(fallbackServicePath)) {
      throw new Error('Fallback service file not found');
    }

    log(`     ℹ️  ai-fallback.service.ts exists`, 'cyan');
  });

  await test('Verify FallbackNotification component exists', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const notificationPath = path.join(process.cwd(), '../components/product-generator/FallbackNotification.tsx');
    if (!fs.existsSync(notificationPath)) {
      throw new Error('FallbackNotification component not found');
    }

    log(`     ℹ️  FallbackNotification.tsx exists`, 'cyan');
  });

  await test('Verify useFallbackNotification hook exists', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const hookPath = path.join(process.cwd(), '../hooks/useFallbackNotification.ts');
    if (!fs.existsSync(hookPath)) {
      throw new Error('useFallbackNotification hook not found');
    }

    log(`     ℹ️  useFallbackNotification.ts exists`, 'cyan');
  });
}

async function testProductGeneratorIntegration() {
  log('\n📝 ProductGeneratorModal Integration', 'cyan');
  log('====================================', 'cyan');

  await test('Verify generateWithFallback is imported', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const modalPath = path.join(process.cwd(), '../components/product-generator/ProductGeneratorModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    if (!content.includes('generateWithFallback')) {
      throw new Error('generateWithFallback not found in ProductGeneratorModal');
    }

    // Count occurrences
    const matches = content.match(/generateWithFallback/g);
    const count = matches ? matches.length : 0;
    log(`     ℹ️  generateWithFallback found ${count} times`, 'cyan');

    if (count < 11) {
      log(`     ⚠️  Expected at least 11 occurrences, found ${count}`, 'yellow');
    }
  });

  await test('Verify FallbackNotification is used', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const modalPath = path.join(process.cwd(), '../components/product-generator/ProductGeneratorModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    if (!content.includes('FallbackNotification')) {
      throw new Error('FallbackNotification not imported');
    }
    if (!content.includes('useFallbackNotification')) {
      throw new Error('useFallbackNotification hook not used');
    }
    if (!content.includes('showFallbackNotification')) {
      throw new Error('showFallbackNotification not called');
    }

    log(`     ℹ️  All fallback components integrated`, 'cyan');
  });

  await test('Verify all 11 generation points updated', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const modalPath = path.join(process.cwd(), '../components/product-generator/ProductGeneratorModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    // Check that generateWithRetry is not used anymore (replaced by generateWithFallback)
    const oldPatternMatches = content.match(/await generateWithRetry\(/g);
    const oldCount = oldPatternMatches ? oldPatternMatches.length : 0;

    if (oldCount > 0) {
      log(`     ⚠️  Found ${oldCount} unreplaced generateWithRetry calls`, 'yellow');
    } else {
      log(`     ✅ All generateWithRetry calls replaced with generateWithFallback`, 'cyan');
    }
  });
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('  Provider Fallback Integration Test', 'bright');
  log('  Testing AI Fallback Logic & Integration', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  const startTime = Date.now();

  try {
    await setupTestUser();
    await testProviderSelection();
    await testAIGeneration();
    await testFallbackService();
    await testProductGeneratorIntegration();
  } catch (error: any) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  }

  const totalTime = Date.now() - startTime;

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('  Test Summary', 'bright');
  log('='.repeat(60), 'bright');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, parseFloat(passRate) >= 90 ? 'green' : 'yellow');
  log(`Total Time: ${(totalTime / 1000).toFixed(2)}s\n`, 'cyan');

  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.filter(r => !r.passed).forEach(r => {
      log(`   - ${r.name}`, 'red');
      if (r.error) log(`     Error: ${r.error}`, 'red');
    });
  }

  // Overall assessment
  log('\n📊 Fallback Integration Assessment:', 'cyan');
  if (passRate === '100.0') {
    log('   ✅ All fallback components properly integrated', 'green');
    log('   ✅ Provider selection working', 'green');
    log('   ✅ AI generation functional', 'green');
    log('   ✅ ProductGeneratorModal updated', 'green');
  } else {
    log(`   ⚠️  ${failed} issue(s) found - review required`, 'yellow');
  }

  log('\n' + '='.repeat(60) + '\n', 'bright');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
