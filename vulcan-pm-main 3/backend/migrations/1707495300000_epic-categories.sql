-- Epic Categories Migration
-- Creates the 14-category system for comprehensive project plan generation
-- Each category has minimum task guarantees and AI-specific prompt guidance

-- Create epic_categories table
CREATE TABLE IF NOT EXISTS epic_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_tasks INTEGER NOT NULL DEFAULT 8,
    order_index INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    prompt_guidance TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_epic_categories_enabled ON epic_categories(is_enabled);
CREATE INDEX IF NOT EXISTS idx_epic_categories_order ON epic_categories(order_index);
CREATE INDEX IF NOT EXISTS idx_epic_categories_name ON epic_categories(name);

-- Seed 14 default categories with batch grouping
-- Batch 1: Categories 1-3 (Infrastructure, Database, Auth)
INSERT INTO epic_categories (name, display_name, description, minimum_tasks, order_index, prompt_guidance, metadata) VALUES
(
    'infrastructure_setup',
    'Infrastructure & Setup',
    'CI/CD pipelines, development environments, build tooling, linting, and project scaffolding',
    8,
    1,
    $$Focus on DevOps, build configuration, environment setup, and foundational tooling. Include specific tasks for Docker, CI/CD providers, env config, and code quality tools.$$,
    '{"batch_group": 1, "typical_roles": ["DevOps", "Backend"]}'::jsonb
),
(
    'database_layer',
    'Database & Data Layer',
    'Database schemas, migrations, seed data, ORM setup, and data access patterns',
    10,
    2,
    $$Generate granular tasks for each entity schema, migration files, repository patterns, indexes, and seed data scripts. Include both relational and NoSQL if applicable.$$,
    '{"batch_group": 1, "typical_roles": ["Backend", "Database"]}'::jsonb
),
(
    'auth_authorization',
    'Authentication & Authorization',
    'Login, registration, JWT/session management, OAuth, SSO, RBAC, and permission systems',
    12,
    3,
    $$Break down into separate tasks: user registration API, login API, token generation, middleware, SSO integration, role definitions, permission checks, and password reset flows.$$,
    '{"batch_group": 1, "typical_roles": ["Backend", "Security"]}'::jsonb
),

-- Batch 2: Categories 4-6 (User Management, Core Features)
(
    'user_management',
    'User Management',
    'User profiles, settings, preferences, notifications, and account management',
    8,
    4,
    $$Include tasks for profile CRUD, avatar upload, notification preferences, email/SMS notifications, and user settings persistence.$$,
    '{"batch_group": 2, "typical_roles": ["Backend", "Frontend"]}'::jsonb
),
(
    'core_features_part1',
    'Core Features - Part 1',
    'Primary product features as defined in the PRD (first half)',
    15,
    5,
    $$Extract the most critical features from the PRD. Break each feature into API, business logic, database, and UI tasks. Ensure atomic granularity.$$,
    '{"batch_group": 2, "typical_roles": ["Backend", "Frontend"]}'::jsonb
),
(
    'core_features_part2',
    'Core Features - Part 2',
    'Secondary product features as defined in the PRD (second half)',
    15,
    6,
    $$Cover remaining PRD features. Maintain same atomic granularity as Part 1. Include edge cases and error handling.$$,
    '{"batch_group": 2, "typical_roles": ["Backend", "Frontend"]}'::jsonb
),

-- Batch 3: Categories 7-9 (API, UI Components, UI Pages)
(
    'api_development',
    'API Development',
    'REST/GraphQL endpoints, request validation, error handling, API documentation',
    12,
    7,
    $$Generate tasks for each API endpoint: route definition, controller logic, input validation, error responses, rate limiting, and OpenAPI/Swagger documentation.$$,
    '{"batch_group": 3, "typical_roles": ["Backend"]}'::jsonb
),
(
    'ui_components',
    'UI Components & Design System',
    'Reusable UI components, design tokens, component library, and styling patterns',
    12,
    8,
    $$Create tasks for each reusable component: buttons, forms, modals, cards, tables, navigation. Include Storybook/documentation tasks.$$,
    '{"batch_group": 3, "typical_roles": ["Frontend", "Design"]}'::jsonb
),
(
    'ui_pages',
    'UI Pages & User Flows',
    'Complete pages, user flows, responsive design, and navigation',
    12,
    9,
    $$Generate tasks for each major page/route: layout, state management, API integration, form handling, loading states, error boundaries, and mobile responsiveness.$$,
    '{"batch_group": 3, "typical_roles": ["Frontend"]}'::jsonb
),

-- Batch 4: Categories 10-12 (Analytics, Testing, DevOps)
(
    'analytics_monitoring',
    'Analytics & Monitoring',
    'Event tracking, logging, error monitoring, performance metrics, and observability',
    8,
    10,
    $$Include tasks for analytics integration (e.g., Mixpanel, Amplitude), error tracking (Sentry), application logs, performance monitoring, and dashboards.$$,
    '{"batch_group": 4, "typical_roles": ["Backend", "DevOps"]}'::jsonb
),
(
    'testing_qa',
    'Testing & QA',
    'Unit tests, integration tests, E2E tests, test coverage, and QA automation',
    10,
    11,
    $$Break down by test type: unit test suites for each module, integration tests for APIs, E2E tests for critical flows, test data factories, and CI test automation.$$,
    '{"batch_group": 4, "typical_roles": ["QA", "Backend", "Frontend"]}'::jsonb
),
(
    'deployment_devops',
    'Deployment & DevOps',
    'Staging/production deployments, infrastructure provisioning, monitoring setup, and rollback procedures',
    8,
    12,
    $$Include tasks for environment provisioning, deployment scripts, health checks, rollback strategies, database migration automation, and production monitoring setup.$$,
    '{"batch_group": 4, "typical_roles": ["DevOps"]}'::jsonb
),

-- Batch 5: Categories 13-14 (Integrations, Documentation)
(
    'third_party_integrations',
    'Third-Party Integrations',
    'External APIs, webhooks, payment gateways, email services, and integrations',
    10,
    13,
    $$Generate tasks for each integration: API client setup, authentication, webhook handlers, error handling, retry logic, and integration testing.$$,
    '{"batch_group": 5, "typical_roles": ["Backend"]}'::jsonb
),
(
    'documentation_onboarding',
    'Documentation & Onboarding',
    'API documentation, user guides, developer onboarding, and runbooks',
    6,
    14,
    $$Include tasks for API docs (OpenAPI), README setup, architecture diagrams, deployment guides, troubleshooting docs, and developer onboarding materials.$$,
    '{"batch_group": 5, "typical_roles": ["Technical Writer", "Backend", "Frontend"]}'::jsonb
)

ON CONFLICT (name) DO NOTHING;
