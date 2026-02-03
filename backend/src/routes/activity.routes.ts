import { Router } from 'express';
import { activityService } from '../services/activity.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Get recent activity (base route with query params)
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const activities = await activityService.getRecent(limit);
  res.json({ success: true, data: activities });
});

// Get activity for a specific task
router.get('/task/:taskId', (req, res) => {
  const activities = activityService.getByTask(req.params.taskId);
  res.json({ success: true, data: activities });
});

// Get activity for a specific project
router.get('/project/:projectId', (req, res) => {
  const activities = activityService.getByProject(req.params.projectId);
  res.json({ success: true, data: activities });
});

// Get activity for current user
router.get('/me', (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const activities = activityService.getByUser(req.user.id);
  res.json({ success: true, data: activities });
});

// Get recent activity (global)
router.get('/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const activities = activityService.getRecent(limit);
  res.json({ success: true, data: activities });
});

// Log a new activity (mainly for internal use, but exposed for flexibility)
router.post('/', (req: AuthRequest, res) => {
  const { entity_type, entity_id, action, field_changed, old_value, new_value } = req.body;

  if (!entity_type || !entity_id || !action) {
    return res.status(400).json({
      success: false,
      error: 'entity_type, entity_id, and action are required',
    });
  }

  const activity = activityService.log({
    entity_type,
    entity_id,
    action,
    user_id: req.user?.id,
    field_changed,
    old_value,
    new_value,
  });

  res.status(201).json({ success: true, data: activity });
});

export default router;
