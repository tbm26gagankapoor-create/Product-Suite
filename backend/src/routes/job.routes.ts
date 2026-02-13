/**
 * Job Routes
 * API endpoints for async job management and SSE streaming
 */

import { Router, Request, Response } from 'express';
import { jobService, JobType } from '../services/job.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/v1/jobs/:id
 * Get job details by ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await jobService.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { message: 'Job not found' }
      });
    }

    // Check authorization - user must own the job or be in same org
    const userId = (req as any).user?.userId;
    const userOrgId = (req as any).user?.organizationId;

    if (job.user_id !== userId && job.organization_id !== userOrgId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error: any) {
    console.error('[Jobs API] Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch job' }
    });
  }
});

/**
 * GET /api/v1/jobs/user/:userId
 * Get jobs for a specific user
 */
router.get('/user/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Check authorization
    const currentUserId = (req as any).user?.userId;
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    const jobs = await jobService.getJobsByUser(userId, limit);

    res.json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    console.error('[Jobs API] Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch jobs' }
    });
  }
});

/**
 * GET /api/v1/jobs/organization/:organizationId
 * Get jobs for an organization
 */
router.get('/organization/:organizationId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Check authorization
    const userOrgId = (req as any).user?.organizationId;
    if (organizationId !== userOrgId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    const jobs = await jobService.getJobsByOrganization(organizationId, limit);

    res.json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    console.error('[Jobs API] Error fetching organization jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch jobs' }
    });
  }
});

/**
 * POST /api/v1/jobs/:id/cancel
 * Cancel a running job
 */
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await jobService.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { message: 'Job not found' }
      });
    }

    // Check authorization
    const userId = (req as any).user?.userId;
    if (job.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    await jobService.cancelJob(id);

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error: any) {
    console.error('[Jobs API] Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to cancel job' }
    });
  }
});

/**
 * GET /api/v1/jobs/:id/stream
 * Server-Sent Events (SSE) endpoint for real-time job progress
 */
router.get('/:id/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await jobService.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { message: 'Job not found' }
      });
    }

    // Check authorization
    const userId = (req as any).user?.userId;
    const userOrgId = (req as any).user?.organizationId;

    if (job.user_id !== userId && job.organization_id !== userOrgId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Send initial job state
    res.write(`data: ${JSON.stringify({
      jobId: job.id,
      status: job.status,
      progress_percent: job.progress_percent,
      progress_message: job.progress_message,
      current_step: job.current_step,
      total_steps: job.total_steps
    })}\n\n`);

    // If job is already completed/failed, close connection
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      res.end();
      return;
    }

    // Subscribe to job progress events
    const unsubscribe = jobService.subscribeToJob(id, (progress) => {
      const eventData = JSON.stringify(progress);
      res.write(`data: ${eventData}\n\n`);

      // Close connection when job is done
      if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
        setTimeout(() => {
          unsubscribe();
          res.end();
        }, 1000); // Wait 1 second before closing to ensure client receives final event
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
      console.log(`[Jobs SSE] Client disconnected from job ${id}`);
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    // Clean up heartbeat on close
    req.on('close', () => {
      clearInterval(heartbeatInterval);
    });

  } catch (error: any) {
    console.error('[Jobs SSE] Error streaming job:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to stream job progress' }
    });
  }
});

export default router;
