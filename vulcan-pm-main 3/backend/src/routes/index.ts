import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import tenantsRoutes from './tenants.routes.js';
import projectsRoutes from './projects.routes.js';
import sprintsRoutes from './sprints.routes.js';
import tasksRoutes from './tasks.sqlite.routes.js';
import tagsRoutes from './tags.routes.js';
import columnsRoutes from './columns.routes.js';
import commentsRoutes from './comments.routes.js';
import activityRoutes from './activity.routes.js';
import adminRoutes from './admin.routes.js';
import ssoRoutes from './sso.routes.js';
import aiRoutes from './ai.routes.js';
import gitAuthRoutes from './git-auth.routes.js';
import docSyncRoutes from './doc-sync.routes.js';
import documentsRoutes from './documents.routes.js';
import productGeneratorRoutes from './product-generator.routes.js';
import draftSessionsRoutes from './draft-sessions.routes.js';
import researchRoutes from './research.routes.js';
import { checkDatabaseHealth } from '../db/index.js';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.postgres || dbHealth.mongo;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      databases: {
        postgres: dbHealth.postgres ? 'connected' : 'disconnected',
        mongo: dbHealth.mongo ? 'connected' : 'disconnected',
      },
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/sso', ssoRoutes);
router.use('/users', usersRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/projects', projectsRoutes);
router.use('/sprints', sprintsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/tags', tagsRoutes);
router.use('/columns', columnsRoutes);
router.use('/comments', commentsRoutes);
router.use('/activity', activityRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/git', gitAuthRoutes);
router.use('/documents', documentsRoutes);
router.use('/products', productGeneratorRoutes);
router.use('/drafts', draftSessionsRoutes);
router.use('/research', researchRoutes);
router.use('/projects', docSyncRoutes);  // Doc sync routes are under /projects/:id/docs/sync

export default router;
