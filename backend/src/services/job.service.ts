/**
 * Job Service
 * Manages async background jobs with SSE streaming for real-time progress updates
 */

import { EventEmitter } from 'events';
import { query } from '../db/postgres/client.js';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'product_generation' | 'document_generation' | 'ai_research' | 'bulk_import' | 'data_migration';

export interface Job {
  id: string;
  job_type: JobType;
  status: JobStatus;
  user_id: string;
  organization_id: string;
  input_data: any;
  output_data?: any;
  progress_percent: number;
  progress_message?: string;
  current_step?: string;
  total_steps?: number;
  error_message?: string;
  error_stack?: string;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  metadata: any;
}

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress_percent: number;
  progress_message?: string;
  current_step?: string;
  total_steps?: number;
  error_message?: string;
  output_data?: any;
}

// Event emitter for SSE
class JobEventEmitter extends EventEmitter {}
const jobEvents = new JobEventEmitter();

// Set max listeners to avoid warnings for many concurrent SSE connections
jobEvents.setMaxListeners(100);

export const jobService = {
  /**
   * Create a new job
   */
  async createJob(params: {
    job_type: JobType;
    user_id: string;
    organization_id: string;
    input_data: any;
    metadata?: any;
    max_retries?: number;
  }): Promise<Job> {
    const result = await query(
      `INSERT INTO jobs (job_type, user_id, organization_id, input_data, metadata, max_retries)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.job_type,
        params.user_id,
        params.organization_id,
        JSON.stringify(params.input_data),
        JSON.stringify(params.metadata || {}),
        params.max_retries || 3
      ]
    );

    const job = result.rows[0];
    console.log(`[Job] Created job ${job.id} (${job.job_type}) for user ${params.user_id}`);

    return this.mapRowToJob(job);
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const result = await query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  },

  /**
   * Get jobs for a user
   */
  async getJobsByUser(userId: string, limit: number = 50): Promise<Job[]> {
    const result = await query(
      `SELECT * FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => this.mapRowToJob(row));
  },

  /**
   * Get jobs for an organization
   */
  async getJobsByOrganization(organizationId: string, limit: number = 100): Promise<Job[]> {
    const result = await query(
      `SELECT * FROM jobs
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, limit]
    );

    return result.rows.map(row => this.mapRowToJob(row));
  },

  /**
   * Start a job (mark as running)
   */
  async startJob(jobId: string): Promise<void> {
    await query(
      `UPDATE jobs
       SET status = 'running', started_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    console.log(`[Job] Started job ${jobId}`);

    // Emit event for SSE
    this.emitProgress(jobId, {
      jobId,
      status: 'running',
      progress_percent: 0,
      progress_message: 'Job started'
    });
  },

  /**
   * Update job progress
   */
  async updateProgress(params: {
    jobId: string;
    progress_percent: number;
    progress_message?: string;
    current_step?: string;
    total_steps?: number;
  }): Promise<void> {
    await query(
      `UPDATE jobs
       SET progress_percent = $1,
           progress_message = $2,
           current_step = $3,
           total_steps = $4
       WHERE id = $5`,
      [
        params.progress_percent,
        params.progress_message || null,
        params.current_step || null,
        params.total_steps || null,
        params.jobId
      ]
    );

    // Emit event for SSE
    this.emitProgress(params.jobId, {
      jobId: params.jobId,
      status: 'running',
      progress_percent: params.progress_percent,
      progress_message: params.progress_message,
      current_step: params.current_step,
      total_steps: params.total_steps
    });
  },

  /**
   * Complete a job successfully
   */
  async completeJob(jobId: string, output_data?: any): Promise<void> {
    await query(
      `UPDATE jobs
       SET status = 'completed',
           progress_percent = 100,
           completed_at = NOW(),
           output_data = $1
       WHERE id = $2`,
      [JSON.stringify(output_data || {}), jobId]
    );

    console.log(`[Job] Completed job ${jobId}`);

    // Emit event for SSE
    this.emitProgress(jobId, {
      jobId,
      status: 'completed',
      progress_percent: 100,
      progress_message: 'Job completed successfully',
      output_data
    });
  },

  /**
   * Fail a job with error
   */
  async failJob(jobId: string, error: Error | string): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? '' : error.stack || '';

    await query(
      `UPDATE jobs
       SET status = 'failed',
           completed_at = NOW(),
           error_message = $1,
           error_stack = $2,
           retry_count = retry_count + 1
       WHERE id = $3`,
      [errorMessage, errorStack, jobId]
    );

    console.error(`[Job] Failed job ${jobId}:`, errorMessage);

    // Emit event for SSE
    this.emitProgress(jobId, {
      jobId,
      status: 'failed',
      progress_percent: 0,
      error_message: errorMessage
    });
  },

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    await query(
      `UPDATE jobs
       SET status = 'cancelled',
           completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'running')`,
      [jobId]
    );

    console.log(`[Job] Cancelled job ${jobId}`);

    // Emit event for SSE
    this.emitProgress(jobId, {
      jobId,
      status: 'cancelled',
      progress_percent: 0,
      progress_message: 'Job cancelled by user'
    });
  },

  /**
   * Delete old completed/failed jobs (cleanup)
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const result = await query(
      `DELETE FROM jobs
       WHERE status IN ('completed', 'failed', 'cancelled')
       AND completed_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    const deletedCount = result.rowCount || 0;
    console.log(`[Job] Cleaned up ${deletedCount} old jobs (>${daysOld} days old)`);

    return deletedCount;
  },

  /**
   * Emit progress event for SSE
   */
  emitProgress(jobId: string, progress: JobProgress): void {
    jobEvents.emit(`job:${jobId}`, progress);
    jobEvents.emit('job:any', progress); // For admin monitoring
  },

  /**
   * Subscribe to job progress (for SSE)
   */
  subscribeToJob(jobId: string, callback: (progress: JobProgress) => void): () => void {
    const eventName = `job:${jobId}`;
    jobEvents.on(eventName, callback);

    // Return unsubscribe function
    return () => {
      jobEvents.off(eventName, callback);
    };
  },

  /**
   * Map database row to Job interface
   */
  mapRowToJob(row: any): Job {
    return {
      id: row.id,
      job_type: row.job_type,
      status: row.status,
      user_id: row.user_id,
      organization_id: row.organization_id,
      input_data: row.input_data,
      output_data: row.output_data,
      progress_percent: row.progress_percent,
      progress_message: row.progress_message,
      current_step: row.current_step,
      total_steps: row.total_steps,
      error_message: row.error_message,
      error_stack: row.error_stack,
      retry_count: row.retry_count,
      max_retries: row.max_retries,
      created_at: row.created_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      metadata: row.metadata
    };
  }
};
