import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import projectsRoutes from './projects.routes.js';
import sprintsRoutes from './sprints.routes.js';
import tasksRoutes from './tasks.sqlite.routes.js';
import tagsRoutes from './tags.routes.js';
import columnsRoutes from './columns.routes.js';
import commentsRoutes from './comments.routes.js';
import activityRoutes from './activity.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'json',
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/sprints', sprintsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/tags', tagsRoutes);
router.use('/columns', columnsRoutes);
router.use('/comments', commentsRoutes);
router.use('/activity', activityRoutes);

export default router;
