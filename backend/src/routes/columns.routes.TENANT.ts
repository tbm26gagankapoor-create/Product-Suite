/**
 * Columns Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate columns routes to use tenant routing.
 *
 * Key changes from original columns.routes.ts:
 * 1. Added tenantMiddleware and requireTenant (IMPORTANT: original had no auth middleware!)
 * 2. Use req.tenantDb instead of columnsService and database helper
 * 3. Removed organization_id filters (already scoped to tenant)
 * 4. Direct MongoDB collection access via req.tenantDb
 * 5. Added TenantRequest type for all handlers
 *
 * SECURITY NOTE: The original columns.routes.ts had NO auth middleware, which is a security risk.
 * This version adds proper authentication and tenant isolation.
 *
 * Migration pattern:
 * BEFORE: const columns = await columnsService.getAll(projectId);
 * AFTER:  const columns = await req.tenantDb.columns().find({ project_id: projectId }).toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
// IMPORTANT: Original columns.routes.ts had NO auth middleware - adding it here for security
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * GET /columns
 * Get all columns (optionally filtered by project)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Removed organization_id filter (already scoped to tenant)
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const projectId = req.query.project_id as string | undefined;

  // Build filter
  const filter: any = {};
  if (projectId) {
    filter.project_id = projectId;
  }

  // Query columns
  const columns = await req.tenantDb!.columns()
    .find(filter)
    .sort({ order: 1 })  // Sort by order field
    .toArray();

  res.json({ success: true, data: columns });
});

/**
 * GET /columns/:id
 * Get column by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const column = await req.tenantDb!.columns().findOne({ id: req.params.id });

  if (!column) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }

  res.json({ success: true, data: column });
});

/**
 * POST /columns
 * Create column
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const { project_id, title, color, is_default } = req.body;

  // Validation
  if (!project_id || !title) {
    return res.status(400).json({
      success: false,
      error: 'project_id and title are required',
    });
  }

  // Get current max order for this project
  const existingColumns = await req.tenantDb!.columns()
    .find({ project_id })
    .sort({ order: -1 })
    .limit(1)
    .toArray();

  const maxOrder = existingColumns.length > 0 ? existingColumns[0].order || 0 : 0;

  // Create column
  const now = new Date().toISOString();
  const column = {
    id: generateUUID(),
    project_id,
    title,
    color: color || null,
    is_default: is_default || false,
    order: maxOrder + 1,
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.columns().insertOne(column);

  res.status(201).json({ success: true, data: column });
});

/**
 * PATCH /columns/:id
 * Update column
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  // Update column
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await req.tenantDb!.columns().updateOne(
    { id: req.params.id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }

  // Get updated column
  const column = await req.tenantDb!.columns().findOne({ id: req.params.id });

  res.json({ success: true, data: column });
});

/**
 * POST /columns/reorder
 * Reorder columns
 *
 * CHANGES:
 * - Direct bulk update to tenant database
 * - Batch update order field for all columns
 */
router.post('/reorder', async (req: TenantRequest, res: Response) => {
  const { project_id, column_ids } = req.body;

  // Validation
  if (!project_id || !column_ids || !Array.isArray(column_ids)) {
    return res.status(400).json({
      success: false,
      error: 'project_id and column_ids array are required',
    });
  }

  // Update each column's order field
  const updatePromises = column_ids.map((columnId, index) => {
    return req.tenantDb!.columns().updateOne(
      { id: columnId, project_id },
      { $set: { order: index + 1, updated_at: new Date().toISOString() } }
    );
  });

  await Promise.all(updatePromises);

  // Get updated columns
  const columns = await req.tenantDb!.columns()
    .find({ project_id })
    .sort({ order: 1 })
    .toArray();

  res.json({ success: true, data: columns });
});

/**
 * DELETE /columns/:id
 * Delete column
 *
 * CHANGES:
 * - Direct delete from tenant database
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const result = await req.tenantDb!.columns().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }

  res.json({ success: true, message: 'Column deleted' });
});

export default router;
