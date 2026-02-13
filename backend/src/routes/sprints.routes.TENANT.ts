/**
 * Sprints Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate sprints routes to use tenant routing.
 *
 * Key changes from original sprints.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of sprintsService and database helper
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. Inlined access checks (no longer use sprintsService.userHasAccess)
 *
 * Migration pattern:
 * BEFORE: const sprints = await sprintsService.getAllForUser(userId, isAdmin, projectId, organizationId);
 * AFTER:  const sprints = await req.tenantDb.sprints().find({ project_id: projectId }).toArray();
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
 * Helper: Check if user has access to a project
 * Replaces projectsService.userHasAccess()
 */
async function userHasProjectAccess(tenantDb: any, projectId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;

  const project = await tenantDb.projects().findOne({ id: projectId });
  if (!project) return false;

  // Check if user is owner or team member
  return project.owner_id === userId || (project.owner_ids && project.owner_ids.includes(userId));
}

/**
 * Helper: Check if user has access to a sprint
 * Inlined from sprintsService.userHasAccess()
 */
async function userHasSprintAccess(tenantDb: any, sprintId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;

  const sprint = await tenantDb.sprints().findOne({ id: sprintId });
  if (!sprint) return false;

  // Check if user has access to the sprint's project
  return await userHasProjectAccess(tenantDb, sprint.project_id, userId, isAdmin);
}

/**
 * GET /sprints
 * Get all sprints (optionally filtered by project, with access control)
 *
 * CHANGES:
 * - Removed organization_id filter (already scoped to tenant database)
 * - Direct query to tenant database instead of sprintsService
 * - Inlined access control logic
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const projectId = req.query.project_id as string | undefined;

  // Build filter
  const filter: any = {};

  if (projectId) {
    // If specific project requested, verify access
    const hasAccess = await userHasProjectAccess(req.tenantDb!, projectId, user.id, user.isAdmin);
    if (!hasAccess) {
      return res.json({ success: true, data: [] });
    }
    filter.project_id = projectId;
  } else {
    // Get all accessible projects for user
    let accessibleProjects;
    if (user.isAdmin) {
      accessibleProjects = await req.tenantDb!.projects().find({}).toArray();
    } else {
      accessibleProjects = await req.tenantDb!.projects().find({
        $or: [
          { owner_id: user.id },
          { owner_ids: user.id }
        ]
      }).toArray();
    }
    const accessibleProjectIds = accessibleProjects.map((p: any) => p.id);
    filter.project_id = { $in: accessibleProjectIds };
  }

  // Query sprints
  const sprints = await req.tenantDb!.sprints().find(filter).sort({ created_at: -1 }).toArray();

  res.json({ success: true, data: sprints });
});

/**
 * GET /sprints/:id
 * Get sprint by ID (with access check)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Inlined access check
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const sprintId = req.params.id;

  // Check access
  const hasAccess = await userHasSprintAccess(req.tenantDb!, sprintId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await req.tenantDb!.sprints().findOne({ id: sprintId });
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }

  res.json({ success: true, data: sprint });
});

/**
 * GET /sprints/project/:projectId/active
 * Get active sprint for a project (with access check)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Query by status: 'active' and project_id
 */
router.get('/project/:projectId/active', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const projectId = req.params.projectId;

  // Check project access
  const hasAccess = await userHasProjectAccess(req.tenantDb!, projectId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await req.tenantDb!.sprints().findOne({
    project_id: projectId,
    status: 'active'
  });

  if (!sprint) {
    return res.status(404).json({ success: false, error: 'No active sprint found' });
  }

  res.json({ success: true, data: sprint });
});

/**
 * POST /sprints
 * Create sprint (requires project access)
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { project_id, name, goal, start_date, end_date } = req.body;

  // Validation
  if (!project_id || !name || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: 'project_id, name, start_date, and end_date are required',
    });
  }

  // Check project access
  const hasAccess = await userHasProjectAccess(req.tenantDb!, project_id, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied to project' });
  }

  // Create sprint
  const now = new Date().toISOString();
  const sprint = {
    id: generateUUID(),
    project_id,
    name,
    goal: goal || null,
    status: 'planned',
    start_date,
    end_date,
    velocity: 0,
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.sprints().insertOne(sprint);

  res.status(201).json({ success: true, data: sprint });
});

/**
 * PATCH /sprints/:id
 * Update sprint (with access check)
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const sprintId = req.params.id;

  // Check access
  const hasAccess = await userHasSprintAccess(req.tenantDb!, sprintId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Only allow updating specific fields
  const allowedFields = ['name', 'goal', 'status', 'start_date', 'end_date', 'velocity'];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' });
  }

  updates.updated_at = new Date().toISOString();

  const result = await req.tenantDb!.sprints().updateOne(
    { id: sprintId },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }

  // Get updated sprint
  const sprint = await req.tenantDb!.sprints().findOne({ id: sprintId });

  res.json({ success: true, data: sprint });
});

/**
 * POST /sprints/:id/start
 * Start sprint (with access check)
 */
router.post('/:id/start', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const sprintId = req.params.id;

  // Check access
  const hasAccess = await userHasSprintAccess(req.tenantDb!, sprintId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Update sprint status to 'active'
  const result = await req.tenantDb!.sprints().updateOne(
    { id: sprintId },
    { $set: { status: 'active', updated_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }

  // Get updated sprint
  const sprint = await req.tenantDb!.sprints().findOne({ id: sprintId });

  res.json({ success: true, data: sprint });
});

/**
 * POST /sprints/:id/complete
 * Complete sprint (with access check)
 */
router.post('/:id/complete', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const sprintId = req.params.id;

  // Check access
  const hasAccess = await userHasSprintAccess(req.tenantDb!, sprintId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Update sprint status to 'completed'
  const result = await req.tenantDb!.sprints().updateOne(
    { id: sprintId },
    { $set: { status: 'completed', updated_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }

  // Get updated sprint
  const sprint = await req.tenantDb!.sprints().findOne({ id: sprintId });

  res.json({ success: true, data: sprint });
});

/**
 * DELETE /sprints/:id
 * Delete sprint (with access check)
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const sprintId = req.params.id;

  // Check access
  const hasAccess = await userHasSprintAccess(req.tenantDb!, sprintId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const result = await req.tenantDb!.sprints().deleteOne({ id: sprintId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }

  res.json({ success: true, message: 'Sprint deleted' });
});

export default router;
