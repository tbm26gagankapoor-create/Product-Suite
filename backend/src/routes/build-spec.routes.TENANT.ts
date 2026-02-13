/**
 * Build Spec Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate build-spec routes to use tenant routing.
 *
 * Key changes from original build-spec.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Inlined project access check (no longer use projectsService.userHasAccess)
 * 4. Kept buildSpecService for file system operations (not database-related)
 *
 * Migration pattern:
 * BEFORE: const hasAccess = await projectsService.userHasAccess(projectId, userId, isAdmin);
 * AFTER:  const project = await req.tenantDb.projects().findOne({ id: projectId });
 *         // Check access based on project owner
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { buildSpecService } from '../services/build-spec.service.js';

const router = Router();

// Apply middleware chain to all routes
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * POST /:id/build-spec
 * Save CLAUDE.md and open Claude Code in Terminal
 *
 * CHANGES:
 * - Inline project access check using tenant database
 * - Verify project exists and user has access
 */
router.post('/:id/build-spec', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const projectId = req.params.id;

  // Get project from tenant database
  const project = await req.tenantDb!.projects().findOne({ id: projectId });

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Check if user has access to this project
  const hasAccess = user.isAdmin ||
                    project.owner_id === user.id ||
                    (project.owner_ids && project.owner_ids.includes(user.id));

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
    // Launch Claude Code (buildSpecService handles file system operations)
    const { projectDir, projectName } = await buildSpecService.launchClaudeCode(projectId);

    res.json({
      success: true,
      data: {
        projectDir,
        projectName,
        message: `Claude Code opened for "${projectName}" at ${projectDir}`,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
