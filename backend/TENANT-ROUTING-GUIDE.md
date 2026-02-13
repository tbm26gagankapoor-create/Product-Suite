# Tenant Routing Guide - Week 4 Implementation

## Overview

Week 4 has successfully implemented **per-tenant MongoDB database routing**. This guide explains how the tenant routing system works and how to use it in your routes.

---

## Architecture

### Before (Single MongoDB Database)
```
MongoDB (infinia_dev)
├── users (all tenants mixed)
├── organizations
├── projects (all tenants mixed)
├── tasks (all tenants mixed)
└── ... (all data in one database)
```

### After (Per-Tenant Databases) ✅
```
PostgreSQL (infinia_system)
├── users (cross-tenant user accounts)
├── tenants (organizations)
└── ... (system configuration)

MongoDB Cluster
├── t_baa62534ff3c4702b455d90d6238ce74/  ← Tenant 1
│   ├── projects (isolated)
│   ├── tasks (isolated)
│   ├── sprints (isolated)
│   └── ... (all tenant data)
├── t_070121d888c6448782f542c5d452e67a/  ← Tenant 2
└── t_5db892095d1840279f4d82da1e567584/  ← Tenant 3
```

---

## Components

### 1. Tenant Router (`backend/src/lib/tenant-router.ts`)

Manages per-tenant MongoDB connections:

```typescript
import { getTenantConnection, createTenantDb, Collections } from '../lib/tenant-router.js';

// Get a Mongoose connection for a specific tenant
const connection = getTenantConnection(tenantId);

// Or use the TenantDb convenience class
const tenantDb = createTenantDb(tenantId);
const projects = await tenantDb.projects().find({}).toArray();
```

**Key Features:**
- Automatic connection pooling (cached connections)
- Database naming: `t_{uuid_without_hyphens}` (34 chars, MongoDB-compliant)
- Auto-initialization on first access (creates indexes)
- Convenience methods for all collections

### 2. Tenant Middleware (`backend/src/middleware/tenant.middleware.ts`)

Extracts tenant context from authenticated users:

```typescript
import { tenantMiddleware, requireTenant } from '../middleware/tenant.middleware.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';

// Apply middleware to routes
router.get('/projects', authMiddleware, tenantMiddleware, async (req: TenantRequest, res) => {
  // req.tenant - Tenant context (id, name, slug, settings)
  // req.tenantDb - TenantDb instance for MongoDB access

  const projects = await req.tenantDb.projects().find({}).toArray();
  res.json({ success: true, data: projects });
});
```

**Middleware Chain:**
1. `authMiddleware` - Verifies JWT, fetches user from PostgreSQL
2. `tenantMiddleware` - Gets tenant from user.organizationId, creates tenantDb
3. `requireTenant` (optional) - Enforces tenant context (returns 403 if missing)

### 3. Updated Auth Middleware (`backend/src/middleware/auth.middleware.ts`)

Now fetches users from **PostgreSQL** instead of MongoDB:

```typescript
// Before: database.findById('users', userId)
// After: query('SELECT * FROM users WHERE id = $1', [userId])
```

**User Lookup Flow:**
1. Verify JWT token
2. Check in-memory cache (5min TTL)
3. If not cached, query PostgreSQL users table
4. Attach user to `req.user` with organizationId (tenant_id)

---

## Usage in Routes

### Example: Projects Route (Migrated)

**Before (Old Approach):**
```typescript
// OLD: Accessing shared MongoDB database
import { Project } from '../models/index.js';

router.get('/projects', authMiddleware, async (req, res) => {
  const projects = await Project.find({ organization_id: req.user.organizationId });
  res.json({ success: true, data: projects });
});
```

**After (New Tenant Routing):**
```typescript
// NEW: Using per-tenant database
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';

router.get('/projects', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  // All projects in this tenant's database are automatically scoped
  const projects = await req.tenantDb.projects().find({}).toArray();
  res.json({ success: true, data: projects });
});
```

**Benefits:**
- ✅ True data isolation (impossible to access other tenant's data)
- ✅ No need to filter by `organization_id` (already scoped to tenant DB)
- ✅ Better performance (smaller databases, dedicated indexes)
- ✅ Easier to backup/restore individual tenants

---

## Migration Checklist for Existing Routes

### Step 1: Update Imports
```typescript
// Add tenant middleware imports
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
```

### Step 2: Add Middleware Chain
```typescript
// Apply middleware (order matters!)
router.get('/endpoint',
  authMiddleware,       // 1. Verify JWT, get user from PostgreSQL
  tenantMiddleware,     // 2. Get tenant context, create tenantDb
  requireTenant,        // 3. (Optional) Enforce tenant context
  async (req: TenantRequest, res) => {
    // Your route logic here
  }
);
```

### Step 3: Replace MongoDB Queries
```typescript
// OLD: Using Mongoose models
const projects = await Project.find({ organization_id: req.user.organizationId });

// NEW: Using tenantDb
const projects = await req.tenantDb.projects().find({}).toArray();
```

### Step 4: Remove Organization Filters
```typescript
// OLD: Manual filtering
await Task.find({ project_id: projectId, organization_id: req.user.organizationId });

// NEW: Automatically scoped (no organization_id needed!)
await req.tenantDb.tasks().find({ project_id: projectId }).toArray();
```

---

## Available Collections

All tenant databases have these collections:

| Collection | Access Method |
|------------|---------------|
| projects | `req.tenantDb.projects()` |
| tasks | `req.tenantDb.tasks()` |
| sprints | `req.tenantDb.sprints()` |
| columns | `req.tenantDb.columns()` |
| tags | `req.tenantDb.tags()` |
| comments | `req.tenantDb.comments()` |
| documents | `req.tenantDb.documents()` |
| document_comments | `req.tenantDb.documentComments()` |
| activities | `req.tenantDb.activityLog()` |
| notifications | `req.tenantDb.notifications()` |
| draft_projects | `req.tenantDb.draftProjects()` |
| teams | `req.tenantDb.teams()` |
| team_members | `req.tenantDb.teamMembers()` |

---

## Common Patterns

### Pattern 1: List All Resources
```typescript
router.get('/projects', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  const projects = await req.tenantDb.projects().find({}).toArray();
  res.json({ success: true, data: projects });
});
```

### Pattern 2: Get Single Resource
```typescript
router.get('/projects/:id', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  const project = await req.tenantDb.projects().findOne({ id: req.params.id });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  res.json({ success: true, data: project });
});
```

### Pattern 3: Create Resource
```typescript
router.post('/projects', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  const projectData = {
    id: generateId(),
    ...req.body,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: req.user.id,
  };

  await req.tenantDb.projects().insertOne(projectData);
  res.status(201).json({ success: true, data: projectData });
});
```

### Pattern 4: Update Resource
```typescript
router.patch('/projects/:id', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  const result = await req.tenantDb.projects().updateOne(
    { id: req.params.id },
    { $set: { ...req.body, updated_at: new Date() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  res.json({ success: true });
});
```

### Pattern 5: Delete Resource
```typescript
router.delete('/projects/:id', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  const result = await req.tenantDb.projects().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  res.json({ success: true });
});
```

### Pattern 6: Nested Resources (Tasks in a Project)
```typescript
router.get('/projects/:projectId/tasks', authMiddleware, tenantMiddleware, requireTenant, async (req: TenantRequest, res) => {
  // Verify project exists in this tenant's database
  const project = await req.tenantDb.projects().findOne({ id: req.params.projectId });
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Get tasks for this project (already scoped to tenant)
  const tasks = await req.tenantDb.tasks().find({ project_id: req.params.projectId }).toArray();
  res.json({ success: true, data: tasks });
});
```

---

## Alternative: Subdomain/Header-Based Routing

For webhooks or public APIs without user auth:

```typescript
import { tenantFromSubdomain } from '../middleware/tenant.middleware.js';

// Extract tenant from subdomain (acme.infinia.com → tenant slug: acme)
// Or from X-Tenant-ID header
router.post('/webhooks/github', tenantFromSubdomain, async (req: TenantRequest, res) => {
  if (!req.tenant) {
    return res.status(400).json({ success: false, error: 'Tenant not found' });
  }

  // Process webhook for this tenant
  await req.tenantDb.activities().insertOne({ ... });
  res.json({ success: true });
});
```

---

## Security Considerations

### 1. Cross-Tenant Access Prevention
✅ **Automatic Isolation**: Each tenant's data is in a separate database, making cross-tenant access impossible at the database level.

### 2. Tenant Verification
✅ **Always use `requireTenant`** for protected routes:
```typescript
router.get('/endpoint',
  authMiddleware,
  tenantMiddleware,
  requireTenant,  // ← Enforces tenant context
  async (req, res) => { ... }
);
```

### 3. Resource Ownership
✅ **Verify ownership within tenant scope**:
```typescript
// Even within a tenant, verify user has access to the resource
const project = await req.tenantDb.projects().findOne({ id: projectId });
if (project.owner_id !== req.user.id && !req.user.isAdmin) {
  return res.status(403).json({ success: false, error: 'Access denied' });
}
```

---

## Testing Tenant Isolation

### Test 1: Verify Tenant Context
```bash
# Login as user from Tenant A
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@tenantA.com", "password": "password"}'

# Get token, then fetch projects
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should ONLY see projects from Tenant A
```

### Test 2: Cross-Tenant Access Blocked
```bash
# Try to access project from another tenant by ID
curl http://localhost:3001/api/v1/projects/OTHER_TENANT_PROJECT_ID \
  -H "Authorization: Bearer TENANT_A_TOKEN"

# Should return 404 (not found in this tenant's database)
```

### Test 3: Database Isolation
```javascript
// Connect to MongoDB and verify databases exist
const tenants = await query('SELECT id, slug FROM tenants');
// Check that database t_<tenant_id> exists for each tenant
```

---

## Troubleshooting

### Issue: "Tenant context required"
**Cause**: User has no `organizationId` (tenant_id) in PostgreSQL
**Fix**: Ensure user is associated with a tenant in the users table

### Issue: "Tenant database not available"
**Cause**: Database connection failed or wasn't initialized
**Fix**: Check MongoDB connection string and tenant initialization

### Issue: "User not found" after migration
**Cause**: Auth middleware still looking in old MongoDB users collection
**Fix**: Ensure auth middleware imports from `../db/postgres/client.js`

### Issue: Routes still accessing shared database
**Cause**: Routes not updated to use tenantDb
**Fix**: Follow migration checklist above

---

## Performance Considerations

### Connection Pooling
✅ Tenant connections are cached and reused (max 10 connections per tenant DB)

### Indexes
✅ All tenant databases auto-initialize with optimized indexes on first access

### Query Performance
✅ Smaller databases = faster queries (no need to filter millions of rows)

### Memory Usage
✅ Connections close after 60s of inactivity (maxIdleTimeMS: 60000)

---

## Next Steps

### For Developers:
1. **Gradually migrate routes** to use tenant routing (start with projects, tasks, sprints)
2. **Test thoroughly** to ensure no cross-tenant data leaks
3. **Remove organization_id filters** once routes are migrated (already scoped!)

### For Week 5 (Admin Portal):
- Admin routes will use **system-wide** queries (PostgreSQL tenants table)
- Regular routes use **tenant-scoped** queries (MongoDB per-tenant databases)
- Admin can view/manage all tenants (via PostgreSQL)

---

## Summary

✅ **Week 4 Complete**:
- Per-tenant MongoDB databases created (4 tenant databases)
- Tenant router implemented with connection pooling
- Tenant middleware extracts context from authenticated users
- Auth middleware migrated to PostgreSQL
- Comprehensive guide and patterns documented

**Architecture**:
- PostgreSQL: System data (users, tenants, admin, AI providers)
- MongoDB: Per-tenant application data (projects, tasks, sprints, etc.)

**Security**:
- True multi-tenant isolation (separate databases)
- Cross-tenant access impossible at database level
- Tenant context automatically injected via middleware

**Developer Experience**:
- Simple API: `req.tenantDb.projects().find({})`
- No manual tenant filtering needed
- Type-safe with TypeScript
- Comprehensive error handling

---

## Questions?

- Review migration patterns above
- Check troubleshooting section
- Test with sample data before migrating production routes
- Verify tenant isolation with cross-tenant access tests

**Week 5 Preview**: Admin portal backend with AI provider management, tenant management, system dashboard, and Git provider configuration.
