/**
 * Projects Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate routes to use tenant routing.
 *
 * Key changes from original projects.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of database helper
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 *
 * Migration pattern:
 * BEFORE: const projects = await database.find('projects', { organization_id: user.organizationId });
 * AFTER:  const projects = await req.tenantDb.projects().find({}).toArray();
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
 * GET /projects
 * Get all projects in the tenant's database
 *
 * CHANGES:
 * - Removed organization_id filter (already scoped to tenant database)
 * - Use req.tenantDb.projects() instead of database.find()
 * - Simplified access control (all data in tenant DB belongs to tenant)
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!; // requireTenant ensures user exists
  const { member_id, include_drafts } = req.query;

  // Build filter
  const filter: any = {};

  // Optionally filter by member
  if (member_id) {
    filter.$or = [
      { owner_id: member_id },
      { owner_ids: member_id }
    ];
  }

  // Filter drafts unless explicitly requested
  if (include_drafts !== 'true') {
    filter.status = { $ne: 'draft' };
  }

  // Query tenant database (already scoped, no organization_id needed!)
  const projects = await req.tenantDb!.projects().find(filter).sort({ created_at: -1 }).toArray();

  res.json({ success: true, data: projects });
});

/**
 * GET /projects/drafts/list
 * Get all draft projects for current user
 */
router.get('/drafts/list', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Query drafts for this user in tenant database
  const drafts = await req.tenantDb!.projects()
    .find({
      status: 'draft',
      $or: [
        { owner_id: user.id },
        { owner_ids: user.id }
      ]
    })
    .sort({ updated_at: -1 })
    .toArray();

  res.json({ success: true, data: drafts });
});

/**
 * GET /projects/:id
 * Get project by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 * - No organization_id check needed (can't access other tenant's data)
 * - Simplified access control
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  // Query tenant database
  const project = await req.tenantDb!.projects().findOne({ id });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Access control: check if user has access to this project
  const hasAccess = user.isAdmin ||
                    project.owner_id === user.id ||
                    (project.owner_ids && project.owner_ids.includes(user.id));

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  res.json({ success: true, data: project });
});

/**
 * POST /projects
 * Create a new project or draft
 *
 * CHANGES:
 * - Use req.tenant.id instead of req.body.organization_id
 * - Direct insert to tenant database
 * - organization_id no longer needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const tenant = req.tenant!;

  const {
    name,
    description,
    code,
    owner_id,
    owner_ids,
    image_url,
    icon,
    icon_color,
    vision,
    prd,
    docs,
    status,
    draft_step,
    draft_data
  } = req.body;

  // Validation
  if (!name || !code) {
    return res.status(400).json({
      success: false,
      error: 'Name and code are required'
    });
  }

  // Check if code already exists in this tenant
  const existing = await req.tenantDb!.projects().findOne({ code });
  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'Project code already exists'
    });
  }

  // Create project
  const now = new Date().toISOString();
  const project = {
    id: generateUUID(),
    name,
    description: description || null,
    code,
    status: status || 'active',
    progress_percentage: 0,
    is_favorite: false,
    owner_id: owner_id || user.id,
    owner_ids: owner_ids || [user.id],
    // Note: organization_id is NOT stored - implicit from tenant database
    image_url: image_url || null,
    icon: icon || null,
    icon_color: icon_color || null,
    vision: vision || null,
    prd: prd || null,
    docs: docs || null,
    draft_step: draft_step || null,
    draft_data: draft_data || null,
    created_at: now,
    updated_at: now,
  };

  // Insert into tenant database
  await req.tenantDb!.projects().insertOne(project);

  res.status(201).json({ success: true, data: project });
});

/**
 * PATCH /projects/:id
 * Update project
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  // Get existing project
  const project = await req.tenantDb!.projects().findOne({ id });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Access control
  const hasAccess = user.isAdmin ||
                    project.owner_id === user.id ||
                    (project.owner_ids && project.owner_ids.includes(user.id));

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Update
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await req.tenantDb!.projects().updateOne(
    { id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Get updated project
  const updated = await req.tenantDb!.projects().findOne({ id });

  res.json({ success: true, data: updated });
});

/**
 * POST /projects/:id/finalize
 * Finalize a draft project (convert to active)
 */
router.post('/:id/finalize', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  // Get project
  const project = await req.tenantDb!.projects().findOne({ id });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Access control
  const hasAccess = user.isAdmin ||
                    project.owner_id === user.id ||
                    (project.owner_ids && project.owner_ids.includes(user.id));

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Update to active
  await req.tenantDb!.projects().updateOne(
    { id },
    {
      $set: {
        status: 'active',
        updated_at: new Date().toISOString()
      },
      $unset: {
        draft_step: '',
        draft_data: ''
      }
    }
  );

  // Get updated project
  const updated = await req.tenantDb!.projects().findOne({ id });

  res.json({ success: true, data: updated });
});

/**
 * DELETE /projects/:id
 * Delete project
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  // Get project
  const project = await req.tenantDb!.projects().findOne({ id });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Access control (only owner or admin can delete)
  const canDelete = user.isAdmin || project.owner_id === user.id;

  if (!canDelete) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can delete' });
  }

  // Delete project
  await req.tenantDb!.projects().deleteOne({ id });

  // Also delete related data (tasks, sprints, etc.)
  await Promise.all([
    req.tenantDb!.tasks().deleteMany({ project_id: id }),
    req.tenantDb!.sprints().deleteMany({ project_id: id }),
    req.tenantDb!.columns().deleteMany({ project_id: id }),
    req.tenantDb!.tags().deleteMany({ project_id: id }),
  ]);

  res.json({ success: true });
});

export default router;
