import { Router } from 'express';
import authRoutes from './auth.routes.js';
import oauthRoutes from './oauth.routes.js';
import usersRoutes from './users.routes.js';
// ===== TENANT-AWARE ROUTES (migrated) =====
import projectsRoutes from './projects.routes.TENANT.js';
import tasksRoutes from './tasks.routes.TENANT.js';
import sprintsRoutes from './sprints.routes.TENANT.js';
import tagsRoutes from './tags.routes.TENANT.js';
import columnsRoutes from './columns.routes.TENANT.js';
import commentsRoutes from './comments.routes.TENANT.js';
import activityRoutes from './activity.routes.TENANT.js';
import teamsRoutes from './teams.routes.TENANT.js';
import configRoutes from './config.routes.TENANT.js';
import notificationsRoutes from './notifications.routes.TENANT.js';
import documentCommentsRoutes from './document-comments.routes.TENANT.js';
import buildSpecRoutes from './build-spec.routes.TENANT.js';
// ===== NON-TENANT ROUTES (no migration needed) =====
import organizationsRoutes from './organizations.routes.js';
import invitesRoutes from './invites.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import githubOAuthRoutes from './github-oauth.routes.js';
import githubIntegrationRoutes from './github-integration.routes.js';
// ===== ADMIN ROUTES =====
import adminRoutes from './admin.routes.js';
// ===== PUBLIC AI PROVIDERS =====
import aiProvidersRoutes from './ai-providers.routes.js';
// ===== JOB MANAGEMENT =====
import jobRoutes from './job.routes.js';
// ===== RESEARCH & WEB SEARCH =====
import researchRoutes from './research.routes.js';
// ===== ENTERPRISE SSO =====
import entraSSORoutes from './entra-sso.routes.js';
// ===== PROMPT TEMPLATES =====
import promptTemplatesRoutes from './prompt-templates.routes.js';
import { microsoftOAuthService } from '../services/microsoft-oauth.service.js';
import { googleOAuthService } from '../services/google-oauth.service.js';
import { githubOAuthService } from '../services/github-oauth.service.js';
import { isEmailServiceConfigured } from '../services/email.service.js';

const router = Router();

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Basic health check (fast, for load balancers)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'mongodb',
    },
  });
});

// Detailed health check with diagnostics
router.get('/health/detailed', (req, res) => {
  const uptimeMs = Date.now() - serverStartTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  // Check integrations
  const integrations = {
    microsoftOAuth: microsoftOAuthService.isConfigured() ? 'configured' : 'not_configured',
    googleOAuth: googleOAuthService.isConfigured() ? 'configured' : 'not_configured',
    githubOAuth: githubOAuthService.isConfigured() ? 'configured' : 'not_configured',
    email: isEmailServiceConfigured() ? 'configured' : 'not_configured',
  };

  // Memory usage
  const memoryUsage = process.memoryUsage();
  const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptimeMs,
        formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
      },
      database: {
        type: 'mongodb',
        status: 'healthy',
      },
      integrations,
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        rss: formatBytes(memoryUsage.rss),
        external: formatBytes(memoryUsage.external),
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
  });
});

// Readiness probe (for Kubernetes-style deployments)
router.get('/health/ready', (req, res) => {
  res.json({ success: true, ready: true });
});

// Liveness probe
router.get('/health/live', (req, res) => {
  res.json({ success: true, live: true });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth', oauthRoutes);
router.use('/admin', adminRoutes);

// Public AI Providers (no auth required - for frontend provider selection)
router.use('/projects/ai-providers', aiProvidersRoutes);
router.use('/jobs', jobRoutes);
router.use('/research', researchRoutes);
router.use('/sso/entra', entraSSORoutes);
router.use('/prompt-templates', promptTemplatesRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/sprints', sprintsRoutes);
router.use('/tags', tagsRoutes);
router.use('/columns', columnsRoutes);
router.use('/comments', commentsRoutes);
router.use('/activity', activityRoutes);
router.use('/teams', teamsRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/invites', invitesRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/config', configRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/auth', githubOAuthRoutes);
router.use('/', githubIntegrationRoutes);
router.use('/', documentCommentsRoutes);
router.use('/projects', buildSpecRoutes);

export default router;
