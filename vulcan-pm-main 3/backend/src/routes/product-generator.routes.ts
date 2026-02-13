import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { startProductCreation, ProductCreationInput } from '../services/product-generator.service.js';
import { jobStore } from '../services/job-store.js';
import { epicCategoriesRepository } from '../db/postgres/repositories/epic-categories.repository.js';

const router = Router();

/**
 * POST /api/v1/products/create
 * Start a product creation job. Returns 202 with jobId.
 */
router.post('/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body;

    // Validate required fields
    if (!body.name?.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    // Generate project code from name if not provided
    const code = body.code || body.name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');

    const input: ProductCreationInput = {
      name: body.name.trim(),
      code,
      description: body.description || '',
      ownerId: body.ownerId || user.id,
      tenantId: user.tenantId!,
      team: body.team || [],
      startDate: body.startDate,
      dueDate: body.dueDate,
      tags: body.tags || [],
      vision: body.vision,
      draftSessionId: body.draftSessionId || undefined,
      docs: body.docs || {},
      epics: (body.epics || []).map((e: any) => ({
        title: e.title,
        description: e.description || '',
        tasks: (e.tasks || []).map((t: any) => ({
          title: t.title,
          description: t.description,
          type: t.type || 'task',
          points: t.points,
          assigneeId: t.assigneeId,
        })),
      })),
    };

    // Git config (optional)
    if (body.gitProviderId && body.gitRepoOwner && body.gitRepoName) {
      input.git = {
        providerId: body.gitProviderId,
        repoOwner: body.gitRepoOwner,
        repoName: body.gitRepoName,
        docsPath: body.gitDocsPath || 'docs/',
        branchStrategy: body.gitBranchStrategy || 'direct',
        repoMode: body.repoMode || 'dedicated',
      };
    }

    const job = await startProductCreation(user.id, input);

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        steps: job.steps,
      },
    });
  } catch (error: any) {
    console.error('[ProductGenerator] Error starting creation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start product creation' });
  }
});

/**
 * GET /api/v1/products/create/:jobId
 * Poll job status (fallback for when SSE isn't available)
 */
router.get('/create/:jobId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = jobStore.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Only allow the job owner to view it
    if (job.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        steps: job.steps,
        result: job.result,
        error: job.error,
      },
    });
  } catch (error: any) {
    console.error('[ProductGenerator] Error getting status:', error);
    res.status(500).json({ success: false, error: 'Failed to get job status' });
  }
});

/**
 * GET /api/v1/products/create/:jobId/stream
 * SSE stream for real-time job progress updates
 */
router.get('/create/:jobId/stream', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = jobStore.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send current state immediately
    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      steps: job.steps,
      result: job.result,
      error: job.error,
    });

    // If already completed/failed, close immediately
    if (job.status === 'completed' || job.status === 'failed') {
      res.end();
      return;
    }

    // Subscribe to updates
    const unsubscribe = jobStore.subscribe(jobId, (updatedJob) => {
      sendEvent({
        jobId: updatedJob.id,
        status: updatedJob.status,
        progress: updatedJob.progress,
        steps: updatedJob.steps,
        result: updatedJob.result,
        error: updatedJob.error,
      });

      // Close stream when job is done
      if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
        res.end();
      }
    });

    // Clean up on client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  } catch (error: any) {
    console.error('[ProductGenerator] SSE error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to establish SSE stream' });
    }
  }
});

/**
 * GET /api/v1/products/epic-categories
 * Get enabled epic categories for plan generation
 * Tenant-facing endpoint (uses requireAuth)
 */
router.get('/epic-categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await epicCategoriesRepository.findAllEnabled();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[ProductGenerator] Error fetching epic categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch epic categories' });
  }
});

export default router;
