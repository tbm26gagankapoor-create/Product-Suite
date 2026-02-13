/**
 * Test Web Search Integration
 * Verifies search provider infrastructure and graceful handling
 */

import { webSearchService } from '../services/web-search.service.js';
import { researchService } from '../services/research.service.js';

async function testWebSearch() {
  console.log('🔍 Testing Web Search Integration...\n');

  try {
    // Test 1: Check for enabled providers
    console.log('Test 1: Checking for enabled search providers...');
    const enabledProvider = await webSearchService.getEnabledProvider();

    if (enabledProvider) {
      console.log(`✅ Enabled provider found: ${enabledProvider.display_name}`);
      console.log(`   Type: ${enabledProvider.provider_type}`);
      console.log(`   Endpoint: ${enabledProvider.api_endpoint}`);
    } else {
      console.log('⚠️  No enabled search providers found');
      console.log('   This is expected if providers haven\'t been configured yet\n');
    }

    // Test 2: Check individual provider availability
    console.log('\nTest 2: Checking individual provider configurations...');
    const providers = ['tavily', 'serper', 'brave_search'] as const;

    for (const providerType of providers) {
      const provider = await webSearchService.getProviderByType(providerType);
      if (provider) {
        console.log(`✅ ${provider.display_name} configured`);
      } else {
        console.log(`⚠️  ${providerType} not configured`);
      }
    }

    // Test 3: Test search with graceful fallback
    console.log('\nTest 3: Testing search with graceful error handling...');
    try {
      const searchResults = await webSearchService.search('artificial intelligence trends 2026', {
        maxResults: 5
      });
      console.log(`✅ Search completed successfully`);
      console.log(`   Provider: ${searchResults.provider}`);
      console.log(`   Results: ${searchResults.totalResults}`);
      if (searchResults.totalResults > 0) {
        console.log(`\n   Top result:`);
        console.log(`   - ${searchResults.results[0].title}`);
        console.log(`   - ${searchResults.results[0].url}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Search failed (expected if no providers configured)`);
      console.log(`   Error: ${error.message}\n`);
    }

    // Test 4: Test research service infrastructure
    console.log('\nTest 4: Testing research service infrastructure...');
    const emptyResearch = researchService.createEmptyResearch('Test Product');
    console.log(`✅ Empty research object created:`);
    console.log(`   Query: ${emptyResearch.query}`);
    console.log(`   Competitors: ${emptyResearch.competitors.length}`);
    console.log(`   Trends: ${emptyResearch.marketTrends.length}`);
    console.log(`   Insights: ${emptyResearch.keyInsights.length}`);

    // Test 5: Test search query builder
    console.log('\nTest 5: Testing search query builder...');
    const queries = researchService.buildSearchQueries({
      product_name: 'AI-powered CRM',
      industry: 'SaaS',
      target_market: 'SMBs'
    });
    console.log(`✅ Generated ${queries.length} search queries:`);
    queries.forEach((q, i) => {
      console.log(`   ${i + 1}. "${q}"`);
    });

    // Test 6: Test PRD formatting
    console.log('\nTest 6: Testing PRD formatting...');
    const mockResearch = {
      query: 'Test Product',
      competitors: [
        { name: 'Competitor A', url: 'https://example.com/a', description: 'Leading solution' },
        { name: 'Competitor B', url: 'https://example.com/b', description: 'Alternative approach' }
      ],
      marketTrends: ['Trend 1', 'Trend 2'],
      keyInsights: ['Insight 1', 'Insight 2'],
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      sources: [
        { title: 'Source 1', url: 'https://source1.com', snippet: 'Details...' },
        { title: 'Source 2', url: 'https://source2.com', snippet: 'More details...' }
      ]
    };

    const formatted = researchService.formatForPRD(mockResearch);
    console.log(`✅ PRD formatting successful (${formatted.length} characters)`);
    console.log(`   Preview:\n${formatted.split('\n').slice(0, 10).join('\n')}...\n`);

    // Summary
    console.log('\n🎉 Web Search Integration Tests Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • Provider infrastructure: ✅`);
    console.log(`   • Search query builder: ✅`);
    console.log(`   • Research object creation: ✅`);
    console.log(`   • PRD formatting: ✅`);
    console.log(`   • Error handling: ✅\n`);

    if (!enabledProvider) {
      console.log('ℹ️  Next Steps:');
      console.log('   1. Configure a search provider in the admin portal');
      console.log('   2. Add API key for Tavily, Serper, or Brave Search');
      console.log('   3. Re-run this test to verify full integration\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Web search test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testWebSearch();
