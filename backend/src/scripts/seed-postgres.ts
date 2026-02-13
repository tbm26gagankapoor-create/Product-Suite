import { query } from '../db/postgres/client.js';
import crypto from 'crypto';

/**
 * Seed PostgreSQL database with default data
 * - Default AI providers (OpenAI, Anthropic, Google, SAIF AI)
 * - Default admin user
 * - Default plan (Free tier)
 */

// Encryption helper (matches Vulcan's approach)
function encryptApiKey(apiKey: string, encryptionKey: string): string {
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set in environment variables');
  }

  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function seedPostgres() {
  console.log('🌱 Seeding PostgreSQL database...');

  try {
    // =====================================================
    // 1. SEED DEFAULT PLAN
    // =====================================================
    console.log('📦 Creating default plan...');

    await query(`
      INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, features, limits, is_active, sort_order)
      VALUES (
        'free',
        'Free',
        'Perfect for individuals and small teams getting started',
        0,
        0,
        '{"ai_generation": true, "basic_analytics": true, "github_integration": true}',
        '{"max_users": 5, "max_projects": 10, "max_storage_gb": 5, "max_ai_requests_per_month": 100}',
        true,
        0
      )
      ON CONFLICT (name) DO NOTHING
    `);

    const planResult = await query<{ id: string }>('SELECT id FROM plans WHERE name = $1', ['free']);
    const defaultPlanId = planResult.rows[0]?.id;

    console.log('✅ Default plan created');

    // =====================================================
    // 2. SEED AI PROVIDERS
    // =====================================================
    console.log('🤖 Creating default AI providers...');

    const providers = [
      {
        name: 'openai',
        display_name: 'OpenAI',
        provider_type: 'openai',
        api_endpoint: 'https://api.openai.com/v1',
        is_enabled: true,
        is_default: false,
        config: JSON.stringify({ organization: null }),
        rate_limits: JSON.stringify({ requests_per_minute: 60, tokens_per_minute: 90000 })
      },
      {
        name: 'anthropic',
        display_name: 'Anthropic',
        provider_type: 'anthropic',
        api_endpoint: 'https://api.anthropic.com/v1',
        is_enabled: true,
        is_default: true, // Set Anthropic as default
        config: JSON.stringify({ version: '2023-06-01' }),
        rate_limits: JSON.stringify({ requests_per_minute: 50, tokens_per_minute: 100000 })
      },
      {
        name: 'google',
        display_name: 'Google AI',
        provider_type: 'google',
        api_endpoint: 'https://generativelanguage.googleapis.com/v1',
        is_enabled: true,
        is_default: false,
        config: JSON.stringify({}),
        rate_limits: JSON.stringify({ requests_per_minute: 60 })
      },
      {
        name: 'saif',
        display_name: 'SAIF AI',
        provider_type: 'openai_compatible',
        api_endpoint: 'https://api.saif.ai/v1',
        is_enabled: true,
        is_default: false,
        config: JSON.stringify({ compatibility_mode: 'openai' }),
        rate_limits: JSON.stringify({ requests_per_minute: 30 })
      }
    ];

    for (const provider of providers) {
      await query(`
        INSERT INTO ai_providers (name, display_name, provider_type, api_endpoint, is_enabled, is_default, config, rate_limits)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          provider_type = EXCLUDED.provider_type,
          api_endpoint = EXCLUDED.api_endpoint,
          is_enabled = EXCLUDED.is_enabled,
          is_default = EXCLUDED.is_default,
          config = EXCLUDED.config,
          rate_limits = EXCLUDED.rate_limits
      `, [
        provider.name,
        provider.display_name,
        provider.provider_type,
        provider.api_endpoint,
        provider.is_enabled,
        provider.is_default,
        provider.config,
        provider.rate_limits
      ]);
    }

    console.log(`✅ ${providers.length} AI providers created`);

    // =====================================================
    // 3. SEED AI PROVIDER MODELS
    // =====================================================
    console.log('🎯 Creating AI provider models...');

    const models = [
      // OpenAI models
      { provider: 'openai', model_id: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', model_type: 'chat', context_window: 128000, max_output_tokens: 4096, input_cost_per_1k: 0.01, output_cost_per_1k: 0.03, capabilities: ['chat', 'code', 'analysis'] },
      { provider: 'openai', model_id: 'gpt-4', display_name: 'GPT-4', model_type: 'chat', context_window: 8192, max_output_tokens: 4096, input_cost_per_1k: 0.03, output_cost_per_1k: 0.06, capabilities: ['chat', 'code', 'analysis'] },
      { provider: 'openai', model_id: 'gpt-3.5-turbo', display_name: 'GPT-3.5 Turbo', model_type: 'chat', context_window: 16385, max_output_tokens: 4096, input_cost_per_1k: 0.0005, output_cost_per_1k: 0.0015, capabilities: ['chat', 'code'] },

      // Anthropic models
      { provider: 'anthropic', model_id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', model_type: 'chat', context_window: 200000, max_output_tokens: 8192, input_cost_per_1k: 0.003, output_cost_per_1k: 0.015, capabilities: ['chat', 'code', 'analysis', 'vision'] },
      { provider: 'anthropic', model_id: 'claude-3-opus-20240229', display_name: 'Claude 3 Opus', model_type: 'chat', context_window: 200000, max_output_tokens: 4096, input_cost_per_1k: 0.015, output_cost_per_1k: 0.075, capabilities: ['chat', 'code', 'analysis', 'vision'] },
      { provider: 'anthropic', model_id: 'claude-3-haiku-20240307', display_name: 'Claude 3 Haiku', model_type: 'chat', context_window: 200000, max_output_tokens: 4096, input_cost_per_1k: 0.00025, output_cost_per_1k: 0.00125, capabilities: ['chat', 'code'] },

      // Google models
      { provider: 'google', model_id: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', model_type: 'chat', context_window: 1000000, max_output_tokens: 8192, input_cost_per_1k: 0.00125, output_cost_per_1k: 0.005, capabilities: ['chat', 'code', 'analysis', 'vision'] },
      { provider: 'google', model_id: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', model_type: 'chat', context_window: 1000000, max_output_tokens: 8192, input_cost_per_1k: 0.000075, output_cost_per_1k: 0.0003, capabilities: ['chat', 'code', 'vision'] },

      // SAIF AI models (OpenAI-compatible)
      { provider: 'saif', model_id: 'Qwen/Qwen2.5-72B-Instruct', display_name: 'Qwen 2.5 72B', model_type: 'chat', context_window: 32768, max_output_tokens: 8192, input_cost_per_1k: 0.0004, output_cost_per_1k: 0.0004, capabilities: ['chat', 'code', 'analysis'] },
    ];

    for (const model of models) {
      const providerResult = await query<{ id: string }>('SELECT id FROM ai_providers WHERE name = $1', [model.provider]);
      const providerId = providerResult.rows[0]?.id;

      if (providerId) {
        await query(`
          INSERT INTO ai_provider_models (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, is_enabled, capabilities)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
          ON CONFLICT (provider_id, model_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            model_type = EXCLUDED.model_type,
            context_window = EXCLUDED.context_window,
            max_output_tokens = EXCLUDED.max_output_tokens,
            input_cost_per_1k = EXCLUDED.input_cost_per_1k,
            output_cost_per_1k = EXCLUDED.output_cost_per_1k,
            capabilities = EXCLUDED.capabilities
        `, [providerId, model.model_id, model.display_name, model.model_type, model.context_window, model.max_output_tokens, model.input_cost_per_1k, model.output_cost_per_1k, model.capabilities]);
      }
    }

    console.log(`✅ ${models.length} AI models created`);

    // =====================================================
    // 4. SEED DEFAULT ADMIN USER
    // =====================================================
    console.log('👤 Creating default admin user...');

    const bcrypt = await import('bcryptjs');
    const adminPassword = 'admin123'; // CHANGE THIS IN PRODUCTION
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    await query(`
      INSERT INTO admin_users (email, password_hash, name, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@infinia.app', adminPasswordHash, 'Admin User', 'super_admin']);

    console.log('✅ Default admin user created');
    console.log('   📧 Email: admin@infinia.app');
    console.log('   🔑 Password: admin123 (CHANGE THIS IN PRODUCTION!)');

    // =====================================================
    // 5. SEED EPIC CATEGORIES
    // =====================================================
    console.log('📊 Creating default epic categories...');

    const categories = [
      {
        name: 'core_infrastructure',
        display_name: 'Core Infrastructure',
        description: 'Backend systems, databases, APIs, authentication',
        color: '#3B82F6',
        icon: 'server',
        sort_order: 1,
        minimum_tasks: 8,
        ai_prompt_guidance: 'Focus on scalable backend architecture, API design, database schema, authentication/authorization, and core business logic. Break down into atomic backend tasks.',
        is_active: true
      },
      {
        name: 'frontend_ui',
        display_name: 'Frontend & UI',
        description: 'User interface, components, responsive design',
        color: '#8B5CF6',
        icon: 'layout',
        sort_order: 2,
        minimum_tasks: 8,
        ai_prompt_guidance: 'Focus on user-facing components, responsive layouts, accessibility, and user experience. Create granular UI implementation tasks.',
        is_active: true
      },
      {
        name: 'integrations',
        display_name: 'Integrations',
        description: 'Third-party APIs, webhooks, external services',
        color: '#10B981',
        icon: 'plug',
        sort_order: 3,
        minimum_tasks: 5,
        ai_prompt_guidance: 'Focus on third-party service integration, API clients, webhook handling, and data synchronization.',
        is_active: true
      },
      {
        name: 'testing_qa',
        display_name: 'Testing & QA',
        description: 'Unit tests, integration tests, E2E testing',
        color: '#F59E0B',
        icon: 'check-circle',
        sort_order: 4,
        minimum_tasks: 5,
        ai_prompt_guidance: 'Focus on comprehensive test coverage, test automation, and quality assurance processes.',
        is_active: true
      },
      {
        name: 'devops',
        display_name: 'DevOps & Infrastructure',
        description: 'CI/CD, deployment, monitoring, infrastructure',
        color: '#EF4444',
        icon: 'cloud',
        sort_order: 5,
        minimum_tasks: 5,
        ai_prompt_guidance: 'Focus on deployment pipelines, infrastructure as code, monitoring, logging, and operational excellence.',
        is_active: true
      }
    ];

    for (const category of categories) {
      await query(`
        INSERT INTO epic_categories (name, display_name, description, color, icon, sort_order, minimum_tasks, ai_prompt_guidance, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          minimum_tasks = EXCLUDED.minimum_tasks,
          ai_prompt_guidance = EXCLUDED.ai_prompt_guidance,
          is_active = EXCLUDED.is_active
      `, [
        category.name,
        category.display_name,
        category.description,
        category.color,
        category.icon,
        category.sort_order,
        category.minimum_tasks,
        category.ai_prompt_guidance,
        category.is_active
      ]);
    }

    console.log(`✅ ${categories.length} epic categories created`);

    // =====================================================
    // SUCCESS SUMMARY
    // =====================================================
    console.log('\n✨ PostgreSQL database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 default plan (Free)`);
    console.log(`   - ${providers.length} AI providers`);
    console.log(`   - ${models.length} AI models`);
    console.log(`   - ${categories.length} epic categories`);
    console.log(`   - 1 admin user (admin@infinia.app / admin123)`);
    console.log('\n🚀 Next steps:');
    console.log('   1. Configure AI provider API keys in admin portal');
    console.log('   2. Create your first tenant/organization');
    console.log('   3. Run data migration from MongoDB (Week 3)');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPostgres()
    .then(() => {
      console.log('\n✅ Seed complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedPostgres };
