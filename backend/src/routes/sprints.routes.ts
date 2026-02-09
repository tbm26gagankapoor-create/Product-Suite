import { Router, Response } from 'express';
import { sprintsService } from '../services/sprints.service.js';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all sprints (optionally filtered by project, with access control)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  // If no user (not logged in), return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  const projectId = req.query.project_id as string | undefined;
  const sprints = await sprintsService.getAllForUser(user.id, user.isAdmin, projectId, user.organizationId);
  res.json({ success: true, data: sprints });
});

// Get sprint by ID (with access check)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sprintId = req.params.id;

  // Check access
  if (user && !(await sprintsService.userHasAccess(sprintId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await sprintsService.getById(sprintId);
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }
  res.json({ success: true, data: sprint });
});

// Get active sprint for a project (with access check)
router.get('/project/:projectId/active', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.projectId;

  // Check project access
  if (user && !(await projectsService.userHasAccess(projectId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await sprintsService.getActive(projectId);
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'No active sprint found' });
  }
  res.json({ success: true, data: sprint });
});

// Create sprint (requires project access)
router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { project_id, name, goal, start_date, end_date } = req.body;

  if (!project_id || !name || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: 'project_id, name, start_date, and end_date are required',
    });
  }

  // Check project access
  if (user && !(await projectsService.userHasAccess(project_id, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied to project' });
  }

  const sprint = await sprintsService.create({ project_id, name, goal, start_date, end_date });
  res.status(201).json({ success: true, data: sprint });
});

// Update sprint (with access check)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sprintId = req.params.id;

  // Check access
  if (user && !(await sprintsService.userHasAccess(sprintId, user.id, user.isAdmin))) {
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

  const sprint = await sprintsService.update(sprintId, updates);
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }
  res.json({ success: true, data: sprint });
});

// Start sprint (with access check)
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sprintId = req.params.id;

  // Check access
  if (user && !(await sprintsService.userHasAccess(sprintId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await sprintsService.startSprint(sprintId);
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }
  res.json({ success: true, data: sprint });
});

// Complete sprint (with access check)
router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sprintId = req.params.id;

  // Check access
  if (user && !(await sprintsService.userHasAccess(sprintId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const sprint = await sprintsService.completeSprint(sprintId);
  if (!sprint) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }
  res.json({ success: true, data: sprint });
});

// Delete sprint (with access check)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sprintId = req.params.id;

  // Check access
  if (user && !(await sprintsService.userHasAccess(sprintId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const deleted = await sprintsService.delete(sprintId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Sprint not found' });
  }
  res.json({ success: true, message: 'Sprint deleted' });
});

export default router;
