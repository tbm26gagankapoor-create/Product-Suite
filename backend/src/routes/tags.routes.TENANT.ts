/**
 * Tags Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate tags routes to use tenant routing.
 *
 * Key changes from original tags.routes.ts:
 * 1. Added tenantMiddleware and requireTenant (IMPORTANT: original had no auth middleware!)
 * 2. Use req.tenantDb instead of tagsService and database helper
 * 3. Removed organization_id filters (already scoped to tenant)
 * 4. Direct MongoDB collection access via req.tenantDb
 * 5. Added TenantRequest type for all handlers
 * 6. Replaced UNIQUE constraint error handling with MongoDB duplicate key error
 *
 * SECURITY NOTE: The original tags.routes.ts had NO auth middleware, which is a security risk.
 * This version adds proper authentication and tenant isolation.
 *
 * Migration pattern:
 * BEFORE: const tags = await tagsService.getAll(projectId);
 * AFTER:  const tags = await req.tenantDb.tags().find({ project_id: projectId }).toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
// IMPORTANT: Original tags.routes.ts had NO auth middleware - adding it here for security
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * GET /tags
 * Get all tags (optionally filtered by project)
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

  // Query tags
  const tags = await req.tenantDb!.tags()
    .find(filter)
    .sort({ label: 1 })  // Sort alphabetically
    .toArray();

  res.json({ success: true, data: tags });
});

/**
 * GET /tags/:id
 * Get tag by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const tag = await req.tenantDb!.tags().findOne({ id: req.params.id });

  if (!tag) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }

  res.json({ success: true, data: tag });
});

/**
 * POST /tags
 * Create tag
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 * - MongoDB duplicate key error handling (instead of SQL UNIQUE constraint)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const { project_id, label, color } = req.body;

  // Validation
  if (!project_id || !label || !color) {
    return res.status(400).json({
      success: false,
      error: 'project_id, label, and color are required',
    });
  }

  try {
    // Check for existing tag with same label in this project
    const existing = await req.tenantDb!.tags().findOne({
      project_id,
      label: label.toLowerCase()  // Case-insensitive check
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Tag with this label already exists in this project'
      });
    }

    // Create tag
    const now = new Date().toISOString();
    const tag = {
      id: generateUUID(),
      project_id,
      label,
      color,
      // Note: organization_id is NOT stored - implicit from tenant database
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.tags().insertOne(tag);

    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Tag with this label already exists'
      });
    }
    throw error;
  }
});

/**
 * PATCH /tags/:id
 * Update tag
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  // Update tag
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await req.tenantDb!.tags().updateOne(
    { id: req.params.id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }

  // Get updated tag
  const tag = await req.tenantDb!.tags().findOne({ id: req.params.id });

  res.json({ success: true, data: tag });
});

/**
 * DELETE /tags/:id
 * Delete tag
 *
 * CHANGES:
 * - Direct delete from tenant database
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const result = await req.tenantDb!.tags().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }

  res.json({ success: true, message: 'Tag deleted' });
});

export default router;
