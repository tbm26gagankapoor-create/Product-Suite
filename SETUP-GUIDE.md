# Infinia Products - PostgreSQL Setup Guide

This guide will help you set up the PostgreSQL database for the Infinia + Vulcan PM merge.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed (recommended: PostgreSQL 16)
- MongoDB installed and running (for existing data)

---

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Verify installation
psql --version
# Should output: psql (PostgreSQL) 16.x
```

### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-16 postgresql-contrib-16

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Windows
1. Download installer from https://www.postgresql.org/download/windows/
2. Run the installer and follow the wizard
3. Remember the password you set for the `postgres` user
4. Verify installation by opening pgAdmin or command line

---

## Step 2: Create the Database

### macOS/Linux
```bash
# Create the infinia_system database
createdb infinia_system

# Verify database was created
psql -l | grep infinia_system
```

### Windows
```cmd
# Open Command Prompt or PowerShell
# Navigate to PostgreSQL bin directory (usually C:\Program Files\PostgreSQL\16\bin)

# Create database
createdb -U postgres infinia_system

# Enter the postgres password when prompted
```

### Alternative: Using psql
```bash
# Connect to PostgreSQL
psql postgres

# Inside psql, create the database
CREATE DATABASE infinia_system;

# List databases to verify
\l

# Exit psql
\q
```

---

## Step 3: Configure Environment

Update your `backend/.env` file with the PostgreSQL connection string:

```bash
# PostgreSQL (System/Admin Database)
POSTGRES_URL=postgresql://localhost:5432/infinia_system

# If you set a custom user/password:
# POSTGRES_URL=postgresql://username:password@localhost:5432/infinia_system

# Encryption Key (IMPORTANT: Change in production!)
ENCRYPTION_KEY=dev-encryption-key-change-in-production-min-32-chars
```

**Production Note:** Generate a secure encryption key:
```bash
openssl rand -base64 32
```

---

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `pg` - PostgreSQL client
- `node-pg-migrate` - Migration tool
- `@types/pg` - TypeScript definitions

---

## Step 5: Run Migrations

Migrations will create all 14 PostgreSQL tables:

```bash
cd backend

# Run all migrations
npm run db:migrate:pg

# Expected output:
# > Running migration 1707494300000_initial-schema.sql
# > Running migration 1707494400000_ai-providers.sql
# > Running migration 1707494500000_admin-sso.sql
# > ... (11 migrations total)
# > Migrations complete!
```

### Verify Tables Were Created

```bash
# Connect to database
psql infinia_system

# List all tables
\dt

# Expected output: 14 tables
# - admin_audit_log
# - admin_users
# - ai_provider_models
# - ai_providers
# - api_keys
# - domain_whitelist
# - epic_categories
# - git_providers
# - pgmigrations (migration tracking)
# - plans
# - prompt_template_versions
# - prompt_templates
# - search_providers
# - sessions
# - sso_connections
# - tenants
# - user_git_tokens
# - user_sso_identities
# - users

# View table structure (example)
\d ai_providers

# Exit psql
\q
```

---

## Step 6: Seed Default Data

Seed the database with default AI providers, admin user, and categories:

```bash
cd backend

# Run seed script
npm run db:seed:pg
```

This will create:
- **1 default plan** (Free tier)
- **4 AI providers**: OpenAI, Anthropic (default), Google AI, SAIF AI
- **9 AI models**: GPT-4 Turbo, GPT-4, GPT-3.5, Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, Gemini 1.5 Pro, Gemini 1.5 Flash, Qwen 2.5 72B
- **5 epic categories**: Core Infrastructure, Frontend & UI, Integrations, Testing & QA, DevOps
- **1 admin user**:
  - Email: `admin@infinia.app`
  - Password: `admin123` ⚠️ **CHANGE THIS IN PRODUCTION!**

### Verify Seed Data

```bash
psql infinia_system

# Check AI providers
SELECT name, display_name, is_default FROM ai_providers;

# Check admin user
SELECT email, role FROM admin_users;

# Check plans
SELECT name, display_name FROM plans;

# Exit
\q
```

---

## Step 7: Test Connection

Create a simple test script to verify everything works:

```bash
# Test PostgreSQL connection
node -e "
const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://localhost:5432/infinia_system' });
pool.query('SELECT COUNT(*) FROM ai_providers')
  .then(res => console.log('✅ Connected! AI Providers:', res.rows[0].count))
  .catch(err => console.error('❌ Error:', err))
  .finally(() => pool.end());
"
```

Expected output:
```
✅ Connected! AI Providers: 4
```

---

## Troubleshooting

### Issue: "database does not exist"
```bash
# Recreate the database
createdb infinia_system

# Or using psql
psql postgres -c "CREATE DATABASE infinia_system;"
```

### Issue: "connection refused"
```bash
# Check if PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Restart if needed
brew services restart postgresql@16  # macOS
sudo systemctl restart postgresql    # Linux
```

### Issue: "role does not exist"
```bash
# Create a PostgreSQL user (if needed)
# macOS - usually not needed, uses your system user
# Linux/Windows - create user
sudo -u postgres createuser -s $USER  # Linux
createuser -U postgres $USER          # Windows
```

### Issue: "permission denied"
```bash
# Grant permissions to your user
psql postgres -c "ALTER USER $USER CREATEDB;"

# Or connect as postgres user
sudo -u postgres psql
# Then run: ALTER USER your_username CREATEDB;
```

### Issue: Migration fails partway through
```bash
# Rollback all migrations
npm run db:migrate:pg:down

# Drop and recreate database
dropdb infinia_system
createdb infinia_system

# Re-run migrations
npm run db:migrate:pg
```

---

## Next Steps

Once PostgreSQL is set up and seeded:

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Verify health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Proceed to Week 3: Data Migration**
   - Migrate existing MongoDB data to dual-database architecture
   - Create per-tenant MongoDB databases
   - Move organizations → tenants table
   - Move users to PostgreSQL

---

## Production Deployment

### Environment Variables

For production, set these in your hosting environment:

```bash
# PostgreSQL Connection
POSTGRES_URL=postgresql://user:password@hostname:5432/dbname
# Example for Railway, Render, Heroku (provided automatically)
DATABASE_URL=postgresql://user:password@hostname:5432/dbname

# Encryption (CRITICAL - Generate secure key)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Admin SSO (Optional - for admin portal SSO)
ADMIN_ENTRA_TENANT_ID=your-tenant-id
ADMIN_ENTRA_CLIENT_ID=your-client-id
ADMIN_ENTRA_CLIENT_SECRET=your-client-secret
```

### Connection Pooling

For production, consider using a connection pooler like PgBouncer:
- Reduces connection overhead
- Handles connection limits
- Improves performance under load

### Backup Strategy

```bash
# Backup PostgreSQL database
pg_dump infinia_system > backup_$(date +%Y%m%d).sql

# Restore from backup
psql infinia_system < backup_20260212.sql
```

---

## Schema Reference

### Core Tables (14 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **plans** | Subscription tiers | name, price_monthly, features, limits |
| **tenants** | Organizations | name, slug, domain, plan_id, subscription_status |
| **users** | Cross-tenant users | email, tenant_id, role, status |
| **admin_users** | Admin portal users | email, password_hash, role (super_admin/admin) |
| **admin_audit_log** | Admin action tracking | admin_user_id, action, entity_type, changes |
| **ai_providers** | AI provider config | name, provider_type, api_endpoint, api_key_encrypted |
| **ai_provider_models** | Model definitions | provider_id, model_id, context_window, pricing |
| **git_providers** | Git OAuth config | name, provider_type (github/gitlab/bitbucket), client_id |
| **search_providers** | Web search config | name, provider_type (tavily/serper/brave), api_key_encrypted |
| **sso_connections** | SSO providers per tenant | tenant_id, provider, client_id, is_enabled |
| **user_sso_identities** | User SSO mappings | user_id, sso_connection_id, provider_user_id |
| **domain_whitelist** | Email domain access | domain, entra_tenant_id, is_enabled |
| **prompt_templates** | AI prompt management | name, category, template_body, variables |
| **prompt_template_versions** | Version history | template_id, version, template_body, change_note |
| **epic_categories** | Custom epic types | name, display_name, minimum_tasks, ai_prompt_guidance |

---

## Migration Script Commands

```bash
# Create new migration
npm run db:migrate:pg:create add_new_table

# Run migrations
npm run db:migrate:pg

# Rollback last migration
npm run db:migrate:pg:down

# Show migration status
node-pg-migrate list
```

---

## Support

If you encounter issues:

1. Check PostgreSQL logs:
   ```bash
   # macOS
   tail -f /opt/homebrew/var/log/postgresql@16.log

   # Linux
   sudo tail -f /var/log/postgresql/postgresql-16-main.log
   ```

2. Verify connection string format:
   ```
   postgresql://[user[:password]@][host][:port][/database]
   ```

3. Test direct psql connection:
   ```bash
   psql postgresql://localhost:5432/infinia_system
   ```

---

## ✅ Setup Complete!

You should now have:
- [x] PostgreSQL installed and running
- [x] Database `infinia_system` created
- [x] All 14 tables created via migrations
- [x] Default data seeded (AI providers, admin user, categories)
- [x] Backend configured to connect to PostgreSQL

**Ready for Week 3: Data Migration!**
