# Infinia Products - Administrator Guide

**Version**: 1.0
**Last Updated**: 2026-02-12
**Audience**: System Administrators, DevOps, SaaS Operators

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Admin Portal](#accessing-the-admin-portal)
3. [System Dashboard](#system-dashboard)
4. [AI Provider Management](#ai-provider-management)
5. [Tenant Management](#tenant-management)
6. [Git Provider Configuration](#git-provider-configuration)
7. [Search Provider Configuration](#search-provider-configuration)
8. [User Management](#user-management)
9. [System Settings](#system-settings)
10. [Monitoring & Health](#monitoring--health)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The Infinia Products Admin Portal is a comprehensive system management interface that provides:

- **AI Provider Management** - Configure and manage multiple AI providers
- **Tenant Management** - View and manage organizations
- **System Dashboard** - Monitor system health and statistics
- **Git Provider Configuration** - Set up OAuth for GitHub, GitLab, Bitbucket
- **Search Provider Configuration** - Configure web search providers
- **User Management** - Manage user accounts and permissions
- **Audit Logging** - Track all admin actions

### Key Features

✅ **Multi-Provider AI Infrastructure** - Support for 8+ AI providers
✅ **cURL Import** - Easy provider configuration from documentation
✅ **Real-Time Health Monitoring** - PostgreSQL, MongoDB, API server status
✅ **Tenant Isolation** - True multi-tenancy with per-organization databases
✅ **Comprehensive Audit Logs** - Track all admin actions
✅ **API Key Encryption** - AES-256-GCM encryption for sensitive credentials

---

## Accessing the Admin Portal

### Prerequisites

1. **Admin Account** - You need a super_admin or admin role
2. **Network Access** - Access to the admin portal URL/port
3. **Browser** - Modern browser (Chrome, Firefox, Safari, Edge)

### Login Steps

1. Navigate to the admin portal URL (typically `https://your-domain.com/admin`)
2. Enter your admin email and password
3. Click **Sign In**

**Note**: Admin accounts are separate from regular user accounts and stored in PostgreSQL.

### First-Time Setup

If this is a fresh installation:

1. **Create Admin User** - Run the seed script:
   ```bash
   cd backend
   npx tsx src/scripts/seed-postgres.ts
   ```

2. **Default Credentials**:
   - Email: `admin@infinia.app`
   - Password: Check your environment variables or seed script

3. **Change Default Password** - Immediately change the default password after first login

---

## System Dashboard

The dashboard provides an at-a-glance view of system health and statistics.

### Metrics Displayed

#### System Health
- **PostgreSQL Status** - Connection status, database health
- **MongoDB Status** - Connection status, cluster health
- **API Server Status** - Uptime, response time
- **Overall Health** - Aggregate health indicator

#### Statistics
- **Total Tenants** - Number of organizations
- **Active Users** - Total user count
- **AI Providers** - Enabled/disabled provider count
- **Recent Activity** - Latest system events

### Health Indicators

| Status | Meaning |
|--------|---------|
| 🟢 Healthy | All systems operational |
| 🟡 Degraded | Some issues, but functional |
| 🔴 Critical | System failure, needs attention |

### Refresh Rate

- Dashboard auto-refreshes every 30 seconds
- Manual refresh available via refresh button
- Real-time updates for critical alerts

---

## AI Provider Management

Manage AI providers that power the Product Generator and other AI features.

### Supported Providers

| Provider | Type | Features |
|----------|------|----------|
| **SAIF AI** | Custom | Default, Qwen models |
| **OpenAI** | Commercial | GPT-4, GPT-3.5 |
| **Anthropic** | Commercial | Claude 3.5, Claude 3 |
| **Google AI** | Commercial | Gemini Pro, Gemini Flash |
| **Groq** | Commercial | Fast inference |
| **Together AI** | Commercial | Open source models |
| **Azure OpenAI** | Enterprise | GPT-4 on Azure |
| **OpenRouter** | Aggregator | Multiple models |
| **Ollama** | Self-Hosted | Local models |
| **Custom** | Any | Any OpenAI-compatible API |

### Adding a Provider

#### Method 1: cURL Import (Recommended)

The fastest way to add a provider is using cURL import from the provider's documentation.

**Example: Adding OpenAI**

1. Go to AI Providers page
2. Click **+ Add Provider**
3. Click **Import from cURL**
4. Paste this cURL command:
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "model": "gpt-4",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```
5. Click **Parse & Import**
6. The form auto-fills with:
   - **API Endpoint**: `https://api.openai.com/v1/chat/completions`
   - **API Key**: `YOUR_API_KEY`
   - **Headers**: Authorization header auto-configured
7. Fill in remaining details:
   - **Display Name**: OpenAI
   - **Provider Type**: openai
   - **Is Default**: No (unless you want this as default)
8. Click **Test Connection** to verify
9. Click **Save**

**Example: Adding Anthropic**

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 1024
  }'
```

#### Method 2: Manual Configuration

1. Go to AI Providers page
2. Click **+ Add Provider**
3. Fill in the form:
   - **Name**: Unique identifier (e.g., `openai`, `anthropic`)
   - **Display Name**: User-facing name (e.g., `OpenAI`, `Anthropic`)
   - **Provider Type**: Select from dropdown
   - **API Endpoint**: Full URL to the API
   - **API Key**: Your provider's API key
   - **Config**: Additional JSON configuration (optional)
   - **Is Default**: Check if this should be the default provider
   - **Is Enabled**: Check to enable immediately
4. Click **Test Connection**
5. If successful, click **Save**

### Provider Configuration Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| Name | ✅ | Unique identifier | `openai` |
| Display Name | ✅ | User-facing name | `OpenAI` |
| Provider Type | ✅ | Provider category | `openai`, `anthropic`, `google` |
| API Endpoint | ✅ | Full API URL | `https://api.openai.com/v1/chat/completions` |
| API Key | ✅ | Authentication key | `sk-...` (encrypted at rest) |
| Config | ❌ | JSON configuration | `{"temperature": 0.7}` |
| Is Default | ❌ | Default for new users | `true` or `false` |
| Is Enabled | ❌ | Available for use | `true` or `false` |

### Testing Provider Connections

Always test provider connections before saving:

1. Fill in provider details
2. Click **Test Connection**
3. Wait for response (typically 2-5 seconds)
4. Review result:
   - ✅ **Success**: Provider is reachable and API key is valid
   - ❌ **Failure**: Check error message for details

**Common Test Failures**:
- **Invalid API Key**: Check the key hasn't expired
- **Network Error**: Verify API endpoint URL is correct
- **Rate Limit**: Wait and try again
- **Invalid Endpoint**: Confirm the URL matches provider's docs

### Editing Providers

1. Go to AI Providers page
2. Find the provider in the list
3. Click **Edit** (pencil icon)
4. Modify fields as needed
5. Click **Test Connection** to verify changes
6. Click **Save**

**Note**: Editing a provider affects all users immediately. Test thoroughly before saving.

### Disabling Providers

To temporarily disable a provider without deleting:

1. Find the provider in the list
2. Click **Edit**
3. Uncheck **Is Enabled**
4. Click **Save**

Users will not see disabled providers in the product generator.

### Deleting Providers

⚠️ **Warning**: Deleting a provider is permanent and cannot be undone.

1. Find the provider in the list
2. Click **Delete** (trash icon)
3. Confirm deletion
4. Provider is removed from the system

**Impact**: Users who selected this provider will fall back to the default provider.

### Setting Default Provider

Only one provider can be the default at a time.

1. Find the desired provider
2. Click **Set as Default**
3. Confirm change
4. The previous default is automatically unset

**Impact**: New users and users without a selected provider will use this provider.

### Provider Fallback Logic

When a user's selected provider fails, the system automatically tries:

1. **Primary Provider** - User's selected provider (3 retry attempts)
2. **Default Provider** - System default (if different from primary)
3. **High-Availability Providers** - Sorted by rate limits (most reliable first)
4. **All Enabled Providers** - Up to 3 total fallback providers

Users are notified via toast when fallback occurs.

### API Key Security

All API keys are encrypted using **AES-256-GCM** encryption with a key stored in environment variables.

**Best Practices**:
- ✅ Store encryption key in secure environment variables
- ✅ Rotate API keys regularly (every 90 days)
- ✅ Use provider-specific keys (don't share across environments)
- ✅ Monitor provider usage for anomalies
- ❌ Don't commit API keys to version control
- ❌ Don't share API keys across teams

---

## Tenant Management

View and manage organizations (tenants) in the system.

### Viewing Tenants

The Tenants page shows all organizations with:
- **Organization Name**
- **Member Count** - Number of users
- **Project Count** - Number of projects
- **Created Date** - When the organization was created
- **Status** - Active or inactive
- **Subscription** - Subscription plan (if applicable)

### Tenant Details

Click on a tenant to view detailed information:
- **Members** - List of all users in the organization
- **Projects** - All projects owned by the organization
- **Activity** - Recent activity log
- **Settings** - Organization-specific settings
- **Database** - MongoDB database name (`tenant_<org_id>`)

### Activating/Deactivating Tenants

To temporarily disable a tenant:

1. Find the tenant in the list
2. Click **Deactivate**
3. Confirm action

**Effect**: All users in the organization lose access. Their data is preserved but inaccessible until reactivated.

To reactivate:
1. Find the tenant
2. Click **Activate**
3. Users immediately regain access

### Tenant Isolation

Each tenant has:
- **Separate MongoDB database** - `tenant_<organization_id>`
- **Organization-scoped data** - All projects, tasks, documents
- **Isolated activity** - No cross-tenant data leakage

**Security**: Users can only access data within their organization.

### Tenant Statistics

View aggregate statistics across all tenants:
- Total tenant count
- Active vs inactive tenants
- Average members per tenant
- Average projects per tenant
- Storage usage (if enabled)

---

## Git Provider Configuration

Configure OAuth applications for Git integration (GitHub, GitLab, Bitbucket).

### Supported Git Providers

| Provider | OAuth Version | Features |
|----------|---------------|----------|
| GitHub | OAuth 2.0 | Public & private repos, organizations |
| GitLab | OAuth 2.0 | Self-hosted & GitLab.com |
| Bitbucket | OAuth 2.0 | Cloud & server |

### Setting Up GitHub OAuth

**1. Create OAuth App on GitHub**

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Infinia Products
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/v1/oauth/github/callback`
4. Click **Register application**
5. Note the **Client ID** and **Client Secret**

**2. Configure in Admin Portal**

1. Go to Git Providers page
2. Find GitHub in the list
3. Click **Configure**
4. Enter:
   - **Client ID**: From GitHub OAuth app
   - **Client Secret**: From GitHub OAuth app
   - **Callback URL**: Must match GitHub exactly
5. Check **Is Enabled**
6. Click **Save**

**3. Test OAuth Flow**

1. As a regular user, go to Settings → Integrations
2. Click **Connect GitHub**
3. Authorize the app on GitHub
4. Verify successful connection

### Setting Up GitLab OAuth

Similar to GitHub:

1. Create OAuth application on GitLab (User Settings → Applications)
2. Set callback URL: `https://your-domain.com/api/v1/oauth/gitlab/callback`
3. Request scopes: `api`, `read_user`, `read_repository`
4. Configure in admin portal with Client ID and Secret

### Setting Up Bitbucket OAuth

Similar to GitHub:

1. Create OAuth consumer in Bitbucket (Settings → OAuth consumers)
2. Set callback URL: `https://your-domain.com/api/v1/oauth/bitbucket/callback`
3. Request permissions: Repositories (Read), Account (Read)
4. Configure in admin portal

### Callback URL Format

**Important**: Callback URLs must match exactly between the provider and admin portal.

Format: `https://<your-domain>/api/v1/oauth/<provider>/callback`

Examples:
- GitHub: `https://app.infinia.com/api/v1/oauth/github/callback`
- GitLab: `https://app.infinia.com/api/v1/oauth/gitlab/callback`
- Bitbucket: `https://app.infinia.com/api/v1/oauth/bitbucket/callback`

### Disabling Git Providers

To disable a Git provider:

1. Go to Git Providers page
2. Find the provider
3. Click **Edit**
4. Uncheck **Is Enabled**
5. Click **Save**

**Effect**: Users can no longer connect new repositories from this provider. Existing connections remain but may not sync.

---

## Search Provider Configuration

Configure web search providers for competitive research and market intelligence features.

### Supported Search Providers

| Provider | Type | Features |
|----------|------|----------|
| **Tavily** | AI Search | Optimized for AI consumption |
| **Serper** | Google Search API | Real-time Google results |
| **Brave Search** | Privacy-focused | Independent search index |

### Adding a Search Provider

1. Go to Search Providers page
2. Click **+ Add Provider**
3. Fill in:
   - **Name**: `tavily`, `serper`, or `brave`
   - **Display Name**: User-facing name
   - **API Key**: Your provider's API key
   - **API Endpoint**: Provider's API URL
   - **Is Enabled**: Check to enable
4. Click **Test Connection**
5. Click **Save**

### Search Provider Configuration

**Tavily Example**:
```json
{
  "api_key": "tvly-xxxxxxxxxxxxx",
  "api_endpoint": "https://api.tavily.com/search",
  "max_results": 10,
  "search_depth": "advanced"
}
```

**Serper Example**:
```json
{
  "api_key": "xxxxxxxxxxxxxxxxxx",
  "api_endpoint": "https://google.serper.dev/search",
  "gl": "us",
  "hl": "en"
}
```

### Use Cases

Search providers are used for:
- **Competitive Research** - Find competitor products
- **Market Intelligence** - Discover market trends
- **Feature Ideas** - Research similar products
- **PRD Enhancement** - Add market context to PRDs

---

## User Management

Manage user accounts and permissions.

### Viewing Users

The Users page shows all users across all tenants with:
- **Name** - User's full name
- **Email** - Email address
- **Organization** - Organization they belong to
- **Role** - User role within the organization
- **Status** - Active or inactive
- **Last Login** - Most recent login time

### User Roles

| Role | Permissions |
|------|------------|
| **Super Admin** | Full system access, can manage all tenants |
| **Admin** | Manage own organization, cannot access other tenants |
| **Member** | Standard user, create projects and tasks |
| **Viewer** | Read-only access within organization |

### Creating Users

**Method 1: Self-Registration** (Recommended)

Allow users to register via the main app:
1. User visits `https://your-domain.com/register`
2. Enters email, password, name
3. Automatically joins an organization (based on email domain if configured)

**Method 2: Manual Creation**

Admins can manually create users:
1. Go to Users page
2. Click **+ Add User**
3. Fill in:
   - Email
   - Name
   - Organization
   - Role
   - Password (temporary)
4. Check **Send welcome email**
5. Click **Create**

User receives email with temporary password and must reset on first login.

### Deactivating Users

To disable a user account without deleting:

1. Find the user
2. Click **Deactivate**
3. Confirm action

**Effect**: User cannot log in. Their data is preserved.

### Deleting Users

⚠️ **Warning**: Deleting users may break project ownership and task assignments.

**Recommended**: Deactivate instead of deleting.

If deletion is necessary:
1. Reassign the user's projects and tasks
2. Click **Delete** on the user
3. Confirm deletion

---

## System Settings

Configure system-wide settings.

### General Settings

- **System Name** - Display name for the application
- **Support Email** - Contact email for support
- **Default Language** - Default UI language
- **Timezone** - Default timezone

### Email Settings

Configure email service (Resend, SMTP, etc.):

- **Email Provider** - Resend, SMTP, SendGrid, etc.
- **From Address** - Sender email address
- **From Name** - Sender display name
- **API Key** - Email service API key

### Security Settings

- **Session Timeout** - Auto-logout after inactivity (minutes)
- **Password Requirements** - Minimum length, complexity
- **2FA Enforcement** - Require two-factor authentication
- **IP Whitelist** - Allowed IP addresses (optional)

### Domain Whitelist

Control which email domains can auto-join organizations:

1. Go to Domain Whitelist
2. Click **+ Add Domain**
3. Enter domain (e.g., `company.com`)
4. Select organization to auto-join
5. Click **Save**

**Example**: Users with `@acme.com` emails automatically join the "Acme Inc" organization.

---

## Monitoring & Health

### Health Checks

#### API Health Endpoint

```bash
GET /api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

#### Detailed Health Endpoint

```bash
GET /api/v1/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "postgres": { "status": "healthy", "responseTime": 12 },
    "mongodb": { "status": "healthy", "responseTime": 8 },
    "api": { "status": "healthy", "responseTime": 2 }
  },
  "timestamp": "2026-02-12T10:30:00Z"
}
```

### Audit Logs

All admin actions are logged to the `admin_audit_log` table in PostgreSQL.

**Logged Actions**:
- Provider create/update/delete
- Tenant activate/deactivate
- User create/update/delete
- Settings changes
- Login attempts

**View Audit Logs**:
1. Go to Audit Logs page
2. Filter by:
   - Date range
   - Action type
   - Admin user
   - Entity type
3. Export logs as CSV if needed

### Performance Monitoring

**Recommended Tools**:
- **New Relic** - Application performance monitoring
- **DataDog** - Infrastructure and application monitoring
- **Sentry** - Error tracking
- **LogRocket** - Session replay and error tracking

**Key Metrics to Monitor**:
- API response times (p50, p95, p99)
- Database query times
- AI provider response times
- Error rates
- User session lengths

---

## Troubleshooting

### Common Issues

#### Issue: AI Provider Connection Failed

**Symptoms**: "Connection failed" error when testing provider

**Causes**:
1. Invalid API key
2. Incorrect API endpoint
3. Network firewall blocking requests
4. Provider rate limit exceeded

**Solutions**:
1. Verify API key is correct and not expired
2. Check API endpoint URL matches provider docs
3. Test API endpoint with cURL from server
4. Wait and retry if rate limited

#### Issue: Users Can't See AI Provider

**Symptoms**: Provider not showing in product generator dropdown

**Causes**:
1. Provider is disabled
2. Provider not set as default and user hasn't selected one
3. Cache not refreshed

**Solutions**:
1. Check provider is enabled in admin portal
2. Set as default or instruct user to select provider
3. Clear provider cache (auto-refreshes every 60 seconds)

#### Issue: Tenant Database Not Created

**Symptoms**: User can't create projects, "organization_id" errors

**Causes**:
1. MongoDB connection issue
2. Tenant database initialization failed
3. Missing organization_id in user session

**Solutions**:
1. Check MongoDB connection in health dashboard
2. Manually initialize tenant database:
   ```bash
   npx tsx src/scripts/initialize-tenant-db.ts <org_id>
   ```
3. Verify user has organization_id in database

#### Issue: OAuth Callback Fails

**Symptoms**: "Callback URL mismatch" error when connecting Git provider

**Causes**:
1. Callback URL mismatch between provider and admin portal
2. OAuth app not approved/published
3. Incorrect client ID/secret

**Solutions**:
1. Verify callback URLs match exactly (including protocol)
2. Ensure OAuth app is active on provider side
3. Double-check client ID and secret

---

## Best Practices

### AI Provider Management

✅ **DO**:
- Enable at least 2 providers for redundancy
- Test connections before saving changes
- Rotate API keys every 90 days
- Monitor provider usage and costs
- Set rate limits to avoid unexpected bills

❌ **DON'T**:
- Disable all providers (users need at least one)
- Share API keys across environments
- Skip connection testing
- Delete providers without warning users

### Tenant Management

✅ **DO**:
- Regular backups of tenant databases
- Monitor storage usage per tenant
- Document deactivation reasons
- Communicate with tenant admins before changes

❌ **DON'T**:
- Delete tenants without data export
- Modify tenant data directly in database
- Share access credentials across tenants

### Security

✅ **DO**:
- Use strong passwords for admin accounts
- Enable 2FA for all admin users
- Regularly review audit logs
- Update dependencies monthly
- Use HTTPS in production

❌ **DON'T**:
- Use default admin passwords
- Share admin accounts
- Ignore security updates
- Expose admin portal publicly without firewall

### Performance

✅ **DO**:
- Monitor API response times
- Set up database indexing
- Use CDN for static assets
- Enable caching where appropriate
- Load test before major releases

❌ **DON'T**:
- Run migrations during peak hours
- Deploy untested changes to production
- Ignore slow query warnings

---

## Support & Resources

### Documentation
- [User Guide](USER-GUIDE.md) - End-user documentation
- [API Reference](API-REFERENCE.md) - Complete API documentation
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Deployment instructions

### Video Tutorials
1. [Adding AI Providers via cURL Import](link-to-video)
2. [Managing Tenants & System Health](link-to-video)
3. [Configuring Git OAuth Providers](link-to-video)

### Getting Help
- **Email**: support@infinia.app
- **Documentation**: https://docs.infinia.app
- **GitHub Issues**: https://github.com/your-repo/issues

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Next Review**: 2026-03-12
