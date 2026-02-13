/**
 * Activity Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate activity routes to use tenant routing.
 *
 * Key changes from original activity.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of activityService
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 *
 * Migration pattern:
 * BEFORE: const activities = await activityService.getRecent(limit);
 * AFTER:  const activities = await req.tenantDb.activityLog().find({}).sort({ created_at: -1 }).limit(limit).toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * GET /activity
 * Get recent activity (base route with query params)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Removed organization_id filter (already scoped to tenant)
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  const activities = await req.tenantDb!.activityLog()
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  res.json({ success: true, data: activities });
});

/**
 * GET /activity/task/:taskId
 * Get activity for a specific task
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/task/:taskId', async (req: TenantRequest, res: Response) => {
  const activities = await req.tenantDb!.activityLog()
    .find({
      entity_type: 'task',
      entity_id: req.params.taskId
    })
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: activities });
});

/**
 * GET /activity/project/:projectId
 * Get activity for a specific project
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/project/:projectId', async (req: TenantRequest, res: Response) => {
  const activities = await req.tenantDb!.activityLog()
    .find({
      entity_type: 'project',
      entity_id: req.params.projectId
    })
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: activities });
});

/**
 * GET /activity/me
 * Get activity for current user
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/me', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  const activities = await req.tenantDb!.activityLog()
    .find({ user_id: user.id })
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: activities });
});

/**
 * GET /activity/recent
 * Get recent activity (global)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Same as GET / but explicit route
 */
router.get('/recent', async (req: TenantRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  const activities = await req.tenantDb!.activityLog()
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  res.json({ success: true, data: activities });
});

/**
 * POST /activity
 * Log a new activity (mainly for internal use, but exposed for flexibility)
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { entity_type, entity_id, action, field_changed, old_value, new_value } = req.body;

  // Validation
  if (!entity_type || !entity_id || !action) {
    return res.status(400).json({
      success: false,
      error: 'entity_type, entity_id, and action are required',
    });
  }

  // Create activity log entry
  const now = new Date().toISOString();
  const activity = {
    id: generateUUID(),
    entity_type,
    entity_id,
    action,
    user_id: user.id,
    field_changed: field_changed || null,
    old_value: old_value || null,
    new_value: new_value || null,
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
  };

  await req.tenantDb!.activityLog().insertOne(activity);

  res.status(201).json({ success: true, data: activity });
});

export default router;
