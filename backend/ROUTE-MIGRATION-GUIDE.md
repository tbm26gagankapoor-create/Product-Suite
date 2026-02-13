# Route Migration Guide: Tenant Routing

This guide explains how to migrate existing routes to use per-tenant database routing.

---

## Quick Reference

### Before (Old Approach)
```typescript
import { Router } from 'express';
import database from '../lib/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const projects = await database.find('projects', {
    organization_id: req.user.organizationId  // Manual filtering required!
  });
  res.json({ success: true, data: projects });
});
```

### After (Tenant Routing)
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';

const router = Router();
router.use(authMiddleware);      // 1. Auth
router.use(tenantMiddleware);    // 2. Tenant context
router.use(requireTenant);       // 3. Enforce tenant

router.get('/', async (req: TenantRequest, res) => {
  // Already scoped to tenant database - no organization_id filter needed!
  const projects = await req.tenantDb!.projects().find({}).toArray();
  res.json({ success: true, data: projects });
});
```

---

## Step-by-Step Migration

### Step 1: Update Imports

**Add:**
```typescript
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
```

**Remove (if using):**
```typescript
import database from '../lib/database.js';  // Replace with direct collection access
```

### Step 2: Apply Middleware Chain

**Replace:**
```typescript
router.use(authMiddleware);
```

**With:**
```typescript
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context (optional but recommended)
```

**Note:** `requireTenant` is optional. Only use it for routes that REQUIRE tenant context. Auth-only routes (like `/auth/login`) should not use it.

### Step 3: Change Request Type

**Replace:**
```typescript
async (req: AuthRequest, res: Response) => {
```

**With:**
```typescript
async (req: TenantRequest, res: Response) => {
```

**TenantRequest includes:**
- `req.user` - User from PostgreSQL (from authMiddleware)
- `req.tenant` - Tenant context (id, name, slug, settings, etc.)
- `req.tenantDb` - MongoDB database instance for this tenant

### Step 4: Update Database Queries

#### Pattern 1: Find All
**Before:**
```typescript
const projects = await database.find('projects', {
  organization_id: req.user.organizationId
});
```

**After:**
```typescript
const projects = await req.tenantDb!.projects().find({}).toArray();
// organization_id filter removed - already scoped to tenant database!
```

#### Pattern 2: Find One
**Before:**
```typescript
const project = await database.findOne('projects', {
  id: projectId,
  organization_id: req.user.organizationId
});
```

**After:**
```typescript
const project = await req.tenantDb!.projects().findOne({ id: projectId });
// organization_id filter removed!
```

#### Pattern 3: Insert
**Before:**
```typescript
const project = {
  id: generateUUID(),
  name: req.body.name,
  organization_id: req.user.organizationId,  // Explicitly set
  created_at: new Date().toISOString()
};
await database.create('projects', project);
```

**After:**
```typescript
const project = {
  id: generateUUID(),
  name: req.body.name,
  // organization_id NO LONGER NEEDED - implicit from tenant database
  created_at: new Date().toISOString()
};
await req.tenantDb!.projects().insertOne(project);
```

#### Pattern 4: Update
**Before:**
```typescript
await database.update('projects',
  { id: projectId, organization_id: req.user.organizationId },
  { $set: { name: 'New Name' } }
);
```

**After:**
```typescript
await req.tenantDb!.projects().updateOne(
  { id: projectId },  // organization_id filter removed!
  { $set: { name: 'New Name' } }
);
```

#### Pattern 5: Delete
**Before:**
```typescript
await database.delete('projects', {
  id: projectId,
  organization_id: req.user.organizationId
});
```

**After:**
```typescript
await req.tenantDb!.projects().deleteOne({ id: projectId });
// organization_id filter removed!
```

#### Pattern 6: Aggregation
**Before:**
```typescript
await database.aggregate('tasks', [
  { $match: { organization_id: req.user.organizationId } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
```

**After:**
```typescript
await req.tenantDb!.tasks().aggregate([
  // $match for organization_id removed - already scoped!
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray();
```

---

## Collection Access Methods

All collections are accessible via `req.tenantDb`:

| Old | New |
|-----|-----|
| `database.find('projects', ...)` | `req.tenantDb!.projects().find(...)` |
| `database.find('tasks', ...)` | `req.tenantDb!.tasks().find(...)` |
| `database.find('sprints', ...)` | `req.tenantDb!.sprints().find(...)` |
| `database.find('columns', ...)` | `req.tenantDb!.columns().find(...)` |
| `database.find('tags', ...)` | `req.tenantDb!.tags().find(...)` |
| `database.find('comments', ...)` | `req.tenantDb!.comments().find(...)` |
| `database.find('documents', ...)` | `req.tenantDb!.documents().find(...)` |
| `database.find('document_comments', ...)` | `req.tenantDb!.documentComments().find(...)` |
| `database.find('activities', ...)` | `req.tenantDb!.activityLog().find(...)` |
| `database.find('notifications', ...)` | `req.tenantDb!.notifications().find(...)` |
| `database.find('draft_projects', ...)` | `req.tenantDb!.draftProjects().find(...)` |
| `database.find('teams', ...)` | `req.tenantDb!.teams().find(...)` |
| `database.find('team_members', ...)` | `req.tenantDb!.teamMembers().find(...)` |

**Generic collection:**
```typescript
req.tenantDb!.collection('custom_collection_name')
```

---

## Migration Checklist

Use this checklist for each route file:

### File: `<route_name>.routes.ts`

- [ ] **Step 1:** Add tenant middleware imports
  ```typescript
  import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
  ```

- [ ] **Step 2:** Apply middleware chain
  ```typescript
  router.use(authMiddleware);
  router.use(tenantMiddleware);
  router.use(requireTenant);
  ```

- [ ] **Step 3:** Change `AuthRequest` to `TenantRequest` in all route handlers

- [ ] **Step 4:** Replace `database.find()` calls with `req.tenantDb!.collection().find()`

- [ ] **Step 5:** Remove `organization_id` from all queries

- [ ] **Step 6:** Remove `organization_id` from inserts

- [ ] **Step 7:** Test routes with actual API calls

- [ ] **Step 8:** Verify cross-tenant isolation (user from tenant A can't access tenant B data)

---

## Example Migrations

### Example 1: Projects Routes

See: [backend/src/routes/projects.routes.TENANT.ts](src/routes/projects.routes.TENANT.ts)

**Key changes:**
- Added tenant middleware
- Changed `AuthRequest` → `TenantRequest`
- Removed `organization_id` filters
- Direct MongoDB collection access

### Example 2: Tasks Routes

**Before:**
```typescript
router.get('/', async (req: AuthRequest, res) => {
  const tasks = await database.find('tasks', {
    project_id: req.query.project_id,
    organization_id: req.user.organizationId
  });
  res.json({ success: true, data: tasks });
});
```

**After:**
```typescript
router.get('/', async (req: TenantRequest, res) => {
  const tasks = await req.tenantDb!.tasks()
    .find({ project_id: req.query.project_id })  // organization_id removed!
    .toArray();
  res.json({ success: true, data: tasks });
});
```

### Example 3: Sprints Routes

**Before:**
```typescript
router.post('/', async (req: AuthRequest, res) => {
  const sprint = {
    id: generateUUID(),
    project_id: req.body.project_id,
    organization_id: req.user.organizationId,  // Explicit
    name: req.body.name,
    created_at: new Date().toISOString()
  };
  await database.create('sprints', sprint);
  res.json({ success: true, data: sprint });
});
```

**After:**
```typescript
router.post('/', async (req: TenantRequest, res) => {
  const sprint = {
    id: generateUUID(),
    project_id: req.body.project_id,
    // organization_id NO LONGER NEEDED
    name: req.body.name,
    created_at: new Date().toISOString()
  };
  await req.tenantDb!.sprints().insertOne(sprint);
  res.json({ success: true, data: sprint });
});
```

---

## Routes to Migrate (Priority Order)

### High Priority (Core Functionality) - ✅ ALL COMPLETE
1. ✅ **projects.routes.ts** - Reference implementation created
2. ✅ **tasks.routes.ts** - Reference implementation created (626 lines, includes permissions, subtasks, dependencies)
3. ✅ **sprints.routes.ts** - Reference implementation created (280 lines, includes access control, status management)
4. ✅ **comments.routes.ts** - Reference implementation created (245 lines, includes @mentions, activity logging, PostgreSQL user lookup)
5. ✅ **columns.routes.ts** - Reference implementation created (195 lines, includes reordering, added auth middleware)
6. ✅ **tags.routes.ts** - Reference implementation created (175 lines, includes duplicate detection, added auth middleware)

### Medium Priority (Supporting Features) - ✅ ALL COMPLETE
7. ✅ **activity.routes.ts** - Reference implementation created (150 lines, activity logging with tenant scoping)
8. ✅ **teams.routes.ts** - Reference implementation created (340 lines, team/member/project management)
9. ✅ **notifications.routes.ts** - Reference implementation created (365 lines, preferences, pagination, unread counts)
10. ✅ **document-comments.routes.ts** - Reference implementation created (410 lines, inline comments, resolve/unresolve, PostgreSQL user lookup)

### Low Priority (Admin/Config) - ✅ ALL COMPLETE
11. ✅ **config.routes.ts** - Reference implementation created (485 lines, all config types, added auth middleware)
12. ✅ **build-spec.routes.ts** - Reference implementation created (65 lines, Claude Code integration)

### No Migration Needed
- **auth.routes.ts** - Authentication (no tenant context)
- **oauth.routes.ts** - OAuth flows (no tenant context)
- **invites.routes.ts** - Email invites (cross-tenant)
- **onboarding.routes.ts** - User onboarding (pre-tenant)
- **organizations.routes.ts** - Use PostgreSQL tenants table instead

---

## Testing Migrated Routes

### Test 1: Basic Functionality
```bash
# Login as user from Tenant A
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@tenantA.com", "password": "password"}'

# Get token, then fetch projects
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return only Tenant A's projects
```

### Test 2: Cross-Tenant Isolation
```bash
# Get project ID from Tenant A
PROJECT_ID_TENANT_A="..."

# Login as user from Tenant B
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@tenantB.com", "password": "password"}'

# Try to access Tenant A's project
curl http://localhost:3001/api/v1/projects/$PROJECT_ID_TENANT_A \
  -H "Authorization: Bearer TENANT_B_TOKEN"

# Should return 404 (not found in Tenant B's database)
```

### Test 3: Create & Query
```bash
# Create project
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "code": "TEST"}'

# Verify it appears in list
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should include the newly created project
```

---

## Common Issues & Solutions

### Issue 1: "Tenant context required"
**Cause:** User has no tenant association (tenant_id is null)
**Fix:** Ensure users are migrated to PostgreSQL with tenant_id set

### Issue 2: "tenantDb is undefined"
**Cause:** Middleware not applied or applied in wrong order
**Fix:** Ensure middleware chain is: auth → tenant → requireTenant

### Issue 3: "organization_id field missing"
**Cause:** Frontend still sending organization_id in requests
**Fix:** Update frontend to remove organization_id from request bodies

### Issue 4: "Cannot read properties of undefined (reading 'projects')"
**Cause:** requireTenant middleware not applied
**Fix:** Add `router.use(requireTenant)` to enforce tenant context

---

## Performance Considerations

### Before Migration
- Single large database with millions of documents
- Queries must filter by organization_id on every request
- Indexes include organization_id as first field
- Slower queries due to large dataset

### After Migration
- Small per-tenant databases (thousands of documents each)
- No organization_id filtering needed
- Simpler indexes (no organization_id prefix)
- **Faster queries** due to smaller datasets

### Connection Pooling
- Tenant connections are cached (10 connections per tenant)
- Connections close after 60s of inactivity
- No performance degradation from multiple databases

---

## Rollback Plan

If you need to rollback to the old system:

1. **Keep old routes** - Rename to `*.routes.OLD.ts` instead of deleting
2. **Database still works** - Old MongoDB database is unchanged
3. **Swap route files** - Change imports in `routes/index.ts`
4. **Restart server** - Changes take effect immediately

---

## Next Steps

1. **Start with projects.routes.ts** - Use reference implementation
2. **Test thoroughly** - Verify cross-tenant isolation
3. **Migrate next priority route** - tasks.routes.ts or sprints.routes.ts
4. **Update frontend** - Remove organization_id from API calls
5. **Monitor performance** - Should see improvements
6. **Document issues** - Track any edge cases

---

## Support

- Review [TENANT-ROUTING-GUIDE.md](TENANT-ROUTING-GUIDE.md) for architecture details
- Check [projects.routes.TENANT.ts](src/routes/projects.routes.TENANT.ts) for reference implementation
- Run test suite: `npm run test:tenant-routing`

**Progress:** 12/12 routes migrated 🎉 **100% COMPLETE** - ALL ROUTES MIGRATED TO TENANT ROUTING!
