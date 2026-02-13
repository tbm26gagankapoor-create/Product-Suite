import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { projectsService } from '../services/projects.service.js';
import { docSyncService } from '../services/doc-sync.service.js';
import { documentsRepository } from '../db/mongo/repositories/documents.repository.js';

const router = Router();

/**
 * GET /api/v1/documents?project_id=X[&section_id=Y]
 * Returns documents from MongoDB
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, section_id } = req.query;
    const user = req.user!;

    if (!project_id || typeof project_id !== 'string') {
      return res.status(400).json({ success: false, error: 'project_id is required' });
    }

    if (!(await projectsService.userHasAccess(user.tenantId!, project_id, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (section_id && typeof section_id === 'string') {
      const doc = await documentsRepository.findByProjectAndSection(project_id, section_id);
      return res.json({ success: true, data: doc ? [doc] : [] });
    }

    const docs = await documentsRepository.findByProject(project_id);
    res.json({ success: true, data: docs });
  } catch (error: any) {
    console.error('[Documents] Error fetching documents:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch documents' });
  }
});

/**
 * POST /api/v1/documents
 * Upsert a document section in MongoDB, then fire-and-forget git sync
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { project_id, section_id, content } = req.body;

    if (!project_id || !section_id || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'project_id, section_id, and content are required',
      });
    }

    if (!(await projectsService.userHasAccess(user.tenantId!, project_id, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, project_id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Upsert into MongoDB
    const doc = await documentsRepository.upsert(project_id, section_id, content);

    // Respond immediately
    res.json({ success: true, data: doc });

    // Fire-and-forget: push to git if enabled
    const gitSettings = project.settings?.git;
    if (gitSettings?.enabled) {
      docSyncService.pushDocument(user.tenantId!, project_id, gitSettings.linked_by_user_id, section_id, content)
        .then(result => {
          if (result.success) {
            console.log(`[Documents] Git sync success for ${section_id} in project ${project_id}`);
          } else {
            console.warn(`[Documents] Git sync failed for ${section_id}: ${result.error}`);
          }
        })
        .catch(err => {
          console.error(`[Documents] Git sync error for ${section_id}:`, err.message);
        });
    }
  } catch (error: any) {
    console.error('[Documents] Error saving document:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save document' });
  }
});

/**
 * DELETE /api/v1/documents?project_id=X&section_id=Y
 * Remove a section from MongoDB
 */
router.delete('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, section_id } = req.query;
    const user = req.user!;

    if (!project_id || typeof project_id !== 'string' || !section_id || typeof section_id !== 'string') {
      return res.status(400).json({ success: false, error: 'project_id and section_id are required' });
    }

    if (!(await projectsService.userHasAccess(user.tenantId!, project_id, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const deleted = await documentsRepository.deleteSection(project_id, section_id);
    res.json({ success: true, data: { deleted: deleted ? section_id : null } });
  } catch (error: any) {
    console.error('[Documents] Error deleting document:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete document' });
  }
});

export default router;
