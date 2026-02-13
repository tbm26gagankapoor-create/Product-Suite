import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { projectsService } from '../services/projects.service.js';
import { docSyncService, ProjectGitSettings } from '../services/doc-sync.service.js';

const router = Router();

/**
 * POST /api/v1/projects/:projectId/docs/sync
 * Push documents to the linked Git repository
 */
router.post('/:projectId/docs/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const {
      documents,
      branch,
      create_branch,
      branch_name,
      commit_message,
      create_pr,
      pr_title,
      pr_description,
    } = req.body;

    // Validate input
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'documents array is required',
      });
    }

    // Validate each document has section_id and content
    for (const doc of documents) {
      if (!doc.section_id || doc.content === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each document must have section_id and content',
        });
      }
    }

    // Check project access
    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      return res.status(400).json({
        success: false,
        error: 'No repository linked to this project',
        code: 'NO_REPO_LINKED',
      });
    }

    // Push documents
    const { results, pullRequest } = await docSyncService.pushDocuments(
      user.tenantId!,
      projectId,
      user.id,
      documents,
      {
        branch,
        createBranch: create_branch,
        branchName: branch_name,
        commitMessage: commit_message,
        createPR: create_pr,
        prTitle: pr_title,
        prDescription: pr_description,
      }
    );

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        summary: {
          total: documents.length,
          successful,
          failed,
        },
        results,
        pull_request: pullRequest
          ? {
              number: pullRequest.number,
              url: pullRequest.html_url,
              title: pullRequest.title,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('[DocSync] Error syncing documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync documents',
    });
  }
});

/**
 * GET /api/v1/projects/:projectId/docs/sync/preview
 * Preview what changes would be made by a sync
 */
router.post('/:projectId/docs/sync/preview', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        error: 'documents array is required',
      });
    }

    // Check project access
    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      return res.status(400).json({
        success: false,
        error: 'No repository linked to this project',
        code: 'NO_REPO_LINKED',
      });
    }

    const previews = await docSyncService.previewSync(user.tenantId!, projectId, user.id, documents);

    // Summarize changes
    const creates = previews.filter(p => p.action === 'create').length;
    const updates = previews.filter(p => p.action === 'update').length;
    const noChanges = previews.filter(p => p.action === 'no_change').length;

    res.json({
      success: true,
      data: {
        summary: {
          total: previews.length,
          creates,
          updates,
          no_changes: noChanges,
        },
        previews,
      },
    });
  } catch (error: any) {
    console.error('[DocSync] Error previewing sync:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to preview sync',
    });
  }
});

/**
 * GET /api/v1/projects/:projectId/docs/sync/status
 * Get sync status for a project
 */
router.get('/:projectId/docs/sync/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = req.user!;

    // Check project access
    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;

    res.json({
      success: true,
      data: {
        has_repo: !!gitSettings?.enabled,
        repository: gitSettings?.repository
          ? {
              full_name: gitSettings.repository.full_name,
              url: gitSettings.repository.url,
              default_branch: gitSettings.repository.default_branch,
            }
          : null,
        docs_path: gitSettings?.docs_path,
        branch_strategy: gitSettings?.branch_strategy,
        last_sync_at: gitSettings?.last_sync_at,
        linked_at: gitSettings?.linked_at,
      },
    });
  } catch (error: any) {
    console.error('[DocSync] Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sync status',
    });
  }
});

export default router;
