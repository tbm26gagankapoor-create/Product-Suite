/**
 * Teams Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate teams routes to use tenant routing.
 *
 * Key changes from original teams.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of teamsService and database helper
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. Removed organization_members lookup (already scoped to tenant via middleware)
 *
 * Migration pattern:
 * BEFORE: const teams = await teamsService.getAll(); // then filter by organization
 * AFTER:  const teams = await req.tenantDb.teams().find({}).toArray(); // already scoped
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
 * GET /teams
 * Get all teams (filtered by user's organizations)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Removed organization_members lookup (already scoped to tenant)
 * - Removed organization_id filter (already scoped to tenant database)
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { member_id } = req.query;

  // Build filter
  const filter: any = {};

  // If member_id filter is provided, get teams where that user is a member
  if (member_id) {
    filter.members = member_id;
  }

  // Query teams (already scoped to tenant database)
  const teams = await req.tenantDb!.teams()
    .find(filter)
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: teams });
});

/**
 * GET /teams/:id
 * Get team by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const team = await req.tenantDb!.teams().findOne({ id: req.params.id });

  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.json({ success: true, data: team });
});

/**
 * POST /teams
 * Create team
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const { name, description, avatar_url, member_ids } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Team name is required',
    });
  }

  // Create team
  const now = new Date().toISOString();
  const team = {
    id: generateUUID(),
    name,
    description: description || null,
    avatar_url: avatar_url || null,
    members: member_ids || [],
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.teams().insertOne(team);

  res.status(201).json({ success: true, data: team });
});

/**
 * PATCH /teams/:id
 * Update team
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  // Update team
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await req.tenantDb!.teams().updateOne(
    { id: req.params.id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  // Get updated team
  const team = await req.tenantDb!.teams().findOne({ id: req.params.id });

  res.json({ success: true, data: team });
});

/**
 * DELETE /teams/:id
 * Delete team
 *
 * CHANGES:
 * - Direct delete from tenant database
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const result = await req.tenantDb!.teams().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.json({ success: true, message: 'Team deleted' });
});

/**
 * --- Member Management ---
 */

/**
 * GET /teams/:teamId/members
 * Get team members
 *
 * CHANGES:
 * - Query team and return members array
 * - Could optionally join with PostgreSQL users table for full user details
 */
router.get('/:teamId/members', async (req: TenantRequest, res: Response) => {
  const team = await req.tenantDb!.teams().findOne({ id: req.params.teamId });

  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  // Return members array (user IDs)
  // In a full implementation, you might join with PostgreSQL users table here
  const members = team.members || [];

  res.json({ success: true, data: members });
});

/**
 * POST /teams/:teamId/members
 * Add member to team
 *
 * CHANGES:
 * - Direct update to add member to members array
 */
router.post('/:teamId/members', async (req: TenantRequest, res: Response) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  // Add member to team (use $addToSet to avoid duplicates)
  const result = await req.tenantDb!.teams().updateOne(
    { id: req.params.teamId },
    {
      $addToSet: { members: user_id },
      $set: { updated_at: new Date().toISOString() }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  // Return the added member
  res.status(201).json({ success: true, data: { user_id } });
});

/**
 * DELETE /teams/:teamId/members/:userId
 * Remove member from team
 *
 * CHANGES:
 * - Direct update to remove member from members array
 */
router.delete('/:teamId/members/:userId', async (req: TenantRequest, res: Response) => {
  const { teamId, userId } = req.params;

  // Remove member from team
  const result = await req.tenantDb!.teams().updateOne(
    { id: teamId },
    {
      $pull: { members: userId },
      $set: { updated_at: new Date().toISOString() }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.json({ success: true, message: 'Member removed' });
});

/**
 * PUT /teams/:teamId/members
 * Set all team members (replace)
 *
 * CHANGES:
 * - Direct update to replace members array
 */
router.put('/:teamId/members', async (req: TenantRequest, res: Response) => {
  const { user_ids } = req.body;

  if (!Array.isArray(user_ids)) {
    return res.status(400).json({ success: false, error: 'user_ids must be an array' });
  }

  // Replace members array
  const result = await req.tenantDb!.teams().updateOne(
    { id: req.params.teamId },
    {
      $set: {
        members: user_ids,
        updated_at: new Date().toISOString()
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.json({ success: true, message: 'Members updated' });
});

/**
 * --- Project Management ---
 * NOTE: These routes manage team-project associations
 * You might want to store this as a field in teams or in a separate collection
 */

/**
 * POST /teams/:teamId/projects
 * Add project to team
 *
 * CHANGES:
 * - Add project_id to team's projects array
 * - Alternatively, could use separate team_members collection
 */
router.post('/:teamId/projects', async (req: TenantRequest, res: Response) => {
  const { project_id } = req.body;

  if (!project_id) {
    return res.status(400).json({ success: false, error: 'project_id is required' });
  }

  // Add project to team (use $addToSet to avoid duplicates)
  const result = await req.tenantDb!.teams().updateOne(
    { id: req.params.teamId },
    {
      $addToSet: { projects: project_id },
      $set: { updated_at: new Date().toISOString() }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.status(201).json({ success: true, data: { project_id } });
});

/**
 * DELETE /teams/:teamId/projects/:projectId
 * Remove project from team
 *
 * CHANGES:
 * - Remove project_id from team's projects array
 */
router.delete('/:teamId/projects/:projectId', async (req: TenantRequest, res: Response) => {
  const { teamId, projectId } = req.params;

  // Remove project from team
  const result = await req.tenantDb!.teams().updateOne(
    { id: teamId },
    {
      $pull: { projects: projectId },
      $set: { updated_at: new Date().toISOString() }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  res.json({ success: true, message: 'Project removed from team' });
});

export default router;
