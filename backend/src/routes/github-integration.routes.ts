/**
 * GitHub Integration Routes
 * Manages GitHub integration settings, repository selection, and sync operations
 */

import { Router, Response } from 'express';
import { githubOAuthService } from '../services/github-oauth.service.js';
import { githubSyncService } from '../services/github-sync.service.js';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /projects/:projectId/github
 * Get GitHub integration settings for a project
 */
router.get('/projects/:projectId/github', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const integration = await githubSyncService.getIntegrationForProject(projectId);

    if (!integration) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Return integration without sensitive token
    res.json({
      success: true,
      data: {
        id: integration.id,
        projectId: integration.project_id,
        githubUsername: integration.github_username,
        repoOwner: integration.repo_owner,
        repoName: integration.repo_name,
        branch: integration.branch,
        filePath: integration.file_path,
        autoSyncEnabled: integration.auto_sync_enabled,
        syncSections: integration.sync_sections,
        lastSyncAt: integration.last_sync_at,
        lastSyncStatus: integration.last_sync_status,
        lastSyncError: integration.last_sync_error,
        lastCommitSha: integration.last_commit_sha,
        connectedBy: integration.connected_by,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at,
      },
    });
  } catch (error) {
    console.error('Get GitHub integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration settings',
    });
  }
});

/**
 * DELETE /projects/:projectId/github
 * Disconnect GitHub integration
 */
router.delete('/projects/:projectId/github', requireAuth, async (req: AuthRequest, res: Response) => {
  console.log('[GitHub] Disconnect request for project:', req.params.projectId);
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    console.log('[GitHub] User:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const integration = await githubSyncService.getIntegrationForProject(projectId);
    console.log('[GitHub] Found integration:', integration?.id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    // Log the disconnect
    await githubSyncService.logSync({
      integrationId: integration.id,
      projectId,
      sectionId: 'all',
      action: 'disconnect',
      status: 'success',
      triggeredBy: userId,
    });

    // Delete the integration
    await githubSyncService.deleteIntegration(projectId);

    res.json({
      success: true,
      message: 'GitHub integration disconnected',
    });
  } catch (error) {
    console.error('Delete GitHub integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect integration',
    });
  }
});

/**
 * PATCH /projects/:projectId/github
 * Update GitHub integration settings
 */
router.patch('/projects/:projectId/github', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { repoOwner, repoName, branch, filePath, autoSyncEnabled, syncSections } = req.body;

    const updated = await githubSyncService.updateIntegration(projectId, {
      repoOwner,
      repoName,
      branch,
      filePath,
      autoSyncEnabled,
      syncSections,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        projectId: updated.project_id,
        githubUsername: updated.github_username,
        repoOwner: updated.repo_owner,
        repoName: updated.repo_name,
        branch: updated.branch,
        filePath: updated.file_path,
        autoSyncEnabled: updated.auto_sync_enabled,
        syncSections: updated.sync_sections,
        lastSyncAt: updated.last_sync_at,
        lastSyncStatus: updated.last_sync_status,
      },
    });
  } catch (error) {
    console.error('Update GitHub integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update integration settings',
    });
  }
});

/**
 * GET /projects/:projectId/github/repos
 * List available GitHub repositories
 */
router.get('/projects/:projectId/github/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const integration = await githubSyncService.getIntegrationForProject(projectId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found. Connect GitHub first.',
      });
    }

    const accessToken = githubSyncService.getDecryptedToken(integration);
    const repos = await githubOAuthService.listUserRepos(accessToken);

    res.json({
      success: true,
      data: repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
      })),
    });
  } catch (error) {
    console.error('List GitHub repos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list repositories',
    });
  }
});

/**
 * POST /projects/:projectId/github/repos
 * Create a new GitHub repository
 */
router.post('/projects/:projectId/github/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description, isPrivate = true } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Repository name is required',
      });
    }

    const integration = await githubSyncService.getIntegrationForProject(projectId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found. Connect GitHub first.',
      });
    }

    const accessToken = githubSyncService.getDecryptedToken(integration);

    // Create the repository
    const repo = await githubOAuthService.createRepository(
      accessToken,
      name,
      description || `PRD documentation - synced from Infinia`,
      isPrivate
    );

    res.json({
      success: true,
      data: {
        repo: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          defaultBranch: repo.default_branch,
        },
      },
    });
  } catch (error) {
    console.error('Create GitHub repo error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create repository';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /projects/:projectId/github/branches
 * List branches for the configured repository
 */
router.get('/projects/:projectId/github/branches', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { owner, repo } = req.query;

    const integration = await githubSyncService.getIntegrationForProject(projectId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found. Connect GitHub first.',
      });
    }

    const accessToken = githubSyncService.getDecryptedToken(integration);
    const repoOwner = (owner as string) || integration.repo_owner;
    const repoName = (repo as string) || integration.repo_name;

    const branches = await githubOAuthService.listBranches(accessToken, repoOwner, repoName);

    res.json({
      success: true,
      data: branches.map(branch => ({
        name: branch.name,
        protected: branch.protected,
      })),
    });
  } catch (error) {
    console.error('List GitHub branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list branches',
    });
  }
});

/**
 * POST /projects/:projectId/github/sync
 * Manually trigger a sync
 */
router.post('/projects/:projectId/github/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sectionId, content } = req.body;
    const userId = req.user?.id;

    console.log('[GitHub Sync] Request body:', {
      sectionId,
      contentLength: content?.length,
      hasContent: !!content,
      bodyKeys: Object.keys(req.body),
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!sectionId || !content) {
      console.log('[GitHub Sync] Missing data:', { sectionId, hasContent: !!content });
      return res.status(400).json({
        success: false,
        error: 'Missing sectionId or content',
      });
    }

    const result = await githubSyncService.manualSync(projectId, sectionId, content, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        commitSha: result.commitSha,
        commitUrl: result.commitUrl,
      },
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync to GitHub',
    });
  }
});

/**
 * POST /projects/:projectId/github/test
 * Test the GitHub connection
 */
router.post('/projects/:projectId/github/test', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const result = await githubSyncService.testConnection(projectId);

    res.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
    });
  }
});

/**
 * GET /projects/:projectId/github/logs
 * Get sync history/logs
 */
router.get('/projects/:projectId/github/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await githubSyncService.getSyncLogs(projectId, limit);

    res.json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        sectionId: log.section_id,
        action: log.action,
        status: log.status,
        commitSha: log.commit_sha,
        commitUrl: log.commit_url,
        errorMessage: log.error_message,
        triggeredBy: log.triggered_by,
        createdAt: log.created_at,
      })),
    });
  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync logs',
    });
  }
});

export default router;
