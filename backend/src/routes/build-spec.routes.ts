import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { projectsService } from '../services/projects.service.js';
import { buildSpecService } from '../services/build-spec.service.js';

const router = Router();

// POST /api/v1/projects/:id/build-spec — Save CLAUDE.md and open Claude Code in Terminal
router.post('/:id/build-spec', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const projectId = req.params.id;

  const hasAccess = await projectsService.userHasAccess(projectId, user.id, user.isAdmin);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
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
