import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { draftSessionsRepository } from '../db/mongo/repositories/draft-sessions.repository.js';
import { docSyncService } from '../services/doc-sync.service.js';

const router = Router();

/**
 * POST /api/v1/drafts
 * Create a new draft session for incremental doc persistence.
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productName, git } = req.body;

    if (!productName?.trim()) {
      return res.status(400).json({ success: false, error: 'productName is required' });
    }

    const session = await draftSessionsRepository.create(userId, productName.trim(), git);

    res.status(201).json({
      success: true,
      data: { sessionId: session.id },
    });
  } catch (error: any) {
    console.error('[DraftSessions] Error creating session:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create draft session' });
  }
});

/**
 * POST /api/v1/drafts/:sessionId/sections/:sectionId
 * Save a section to the draft. Returns 200 immediately.
 * Fire-and-forget: pushes to git + updates TOC if git is configured.
 */
router.post('/:sessionId/sections/:sectionId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId, sectionId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const session = await draftSessionsRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Draft session not found' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Save to MongoDB immediately
    await draftSessionsRepository.upsertSection(sessionId, sectionId, content);

    // Return right away — git sync is fire-and-forget
    res.json({ success: true, data: { saved: true } });

    // Fire-and-forget: push to git if configured
    if (session.git) {
      const git = session.git;
      (async () => {
        try {
          const result = await docSyncService.pushDraftDocument(
            userId,
            git,
            session.product_name,
            sectionId,
            content
          );
          if (result.success) {
            await draftSessionsRepository.markSectionSynced(sessionId, sectionId);
          }

          // Also update TOC — fetch latest session state for all sections
          const latestSession = await draftSessionsRepository.getById(sessionId);
          if (latestSession) {
            await docSyncService.pushTocForDraft(
              userId,
              git,
              session.product_name,
              latestSession.sections
            );
          }
        } catch (err: any) {
          console.error(`[DraftSessions] Fire-and-forget git sync failed for ${sectionId}:`, err.message);
        }
      })();
    }
  } catch (error: any) {
    console.error('[DraftSessions] Error saving section:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message || 'Failed to save section' });
    }
  }
});

/**
 * PATCH /api/v1/drafts/:sessionId/git
 * Update git settings on an existing draft session.
 */
router.patch('/:sessionId/git', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { git } = req.body;

    if (!git) {
      return res.status(400).json({ success: false, error: 'git settings are required' });
    }

    const session = await draftSessionsRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Draft session not found' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await draftSessionsRepository.updateGitSettings(sessionId, git);

    res.json({ success: true, data: { updated: true } });
  } catch (error: any) {
    console.error('[DraftSessions] Error updating git settings:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update git settings' });
  }
});

/**
 * GET /api/v1/drafts
 * List active (non-expired) drafts for the current user.
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const drafts = await draftSessionsRepository.listByUser(userId);
    res.json({ success: true, data: drafts });
  } catch (error: any) {
    console.error('[DraftSessions] Error listing drafts:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list drafts' });
  }
});

/**
 * GET /api/v1/drafts/:sessionId
 * Get a single draft session with all sections and wizard state.
 */
router.get('/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await draftSessionsRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Draft session not found' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('[DraftSessions] Error fetching draft:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch draft' });
  }
});

/**
 * PATCH /api/v1/drafts/:sessionId/meta
 * Update wizard state metadata (step, vision, epics, etc.)
 */
router.patch('/:sessionId/meta', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await draftSessionsRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Draft session not found' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { step, vision, description, epics, suggestions, research_report, input_mode, tags, repo_mode } = req.body;
    const meta: Record<string, any> = {};
    if (step !== undefined) meta.step = step;
    if (vision !== undefined) meta.vision = vision;
    if (description !== undefined) meta.description = description;
    if (epics !== undefined) meta.epics = epics;
    if (suggestions !== undefined) meta.suggestions = suggestions;
    if (research_report !== undefined) meta.research_report = research_report;
    if (input_mode !== undefined) meta.input_mode = input_mode;
    if (tags !== undefined) meta.tags = tags;
    if (repo_mode !== undefined) meta.repo_mode = repo_mode;

    await draftSessionsRepository.updateMeta(sessionId, meta);

    res.json({ success: true, data: { updated: true } });
  } catch (error: any) {
    console.error('[DraftSessions] Error updating draft meta:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update draft meta' });
  }
});

/**
 * DELETE /api/v1/drafts/:sessionId
 * Delete a draft session.
 */
router.delete('/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await draftSessionsRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Draft session not found' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await draftSessionsRepository.delete(sessionId);

    res.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    console.error('[DraftSessions] Error deleting draft:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete draft' });
  }
});

export default router;
