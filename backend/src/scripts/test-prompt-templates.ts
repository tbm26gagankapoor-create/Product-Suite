/**
 * Test Prompt Template Versioning
 * Matches actual Vulcan PM database schema
 */

import { promptTemplateService } from '../services/prompt-template.service.js';

async function testPromptTemplates() {
  console.log('📝 Testing Prompt Template Versioning...\n');

  try {
    // Test 1: Create template
    console.log('Test 1: Creating prompt template...');
    const { template, version } = await promptTemplateService.createTemplate({
      name: 'product_desc_gen',
      displayName: 'Product Description Generator',
      description: 'Generates product descriptions',
      category: 'product_generation',
      initialContent: 'Generate description for {{product_name}} in {{industry}}',
      variables: ['product_name', 'industry'],
      createdBy: 'test-user',
      changeNote: 'Initial version'
    });

    console.log(`✅ Created: ${template.display_name}`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Version: ${template.version}\n`);

    // Test 2: Create version 2
    console.log('Test 2: Creating version 2...');
    const v2 = await promptTemplateService.createVersion({
      templateId: template.id,
      content: 'Enhanced: Generate description for {{product_name}} targeting {{market}}',
      variables: ['product_name', 'market'],
      changeNote: 'Added market targeting',
      createdBy: 'test-user',
      makeCurrent: true
    });

    console.log(`✅ Version 2 created: v${v2.version}\n`);

    // Test 3: Get all versions
    console.log('Test 3: Getting all versions...');
    const versions = await promptTemplateService.getVersions(template.id);
    console.log(`✅ Found ${versions.length} versions:`);
    versions.forEach(v => console.log(`   v${v.version} - ${v.change_note}`));
    console.log();

    // Test 4: Rollback to v1
    console.log('Test 4: Rolling back to v1...');
    await promptTemplateService.rollbackToVersion({
      templateId: template.id,
      versionNumber: 1,
      rolledBackBy: 'test-user'
    });

    const afterRollback = await promptTemplateService.getTemplate(template.id);
    console.log(`✅ Rolled back to v${afterRollback?.version}\n`);

    // Test 5: Render template
    console.log('Test 5: Rendering template...');
    const rendered = promptTemplateService.renderTemplate(
      afterRollback?.template_body || '',
      { product_name: 'AI CRM', industry: 'SaaS' }
    );
    console.log(`✅ Rendered: ${rendered}\n`);

    console.log('🎉 All tests passed!');
    console.log(`\nTemplate ID for cleanup: ${template.id}`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPromptTemplates();
