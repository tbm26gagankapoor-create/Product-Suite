import { randomUUID } from 'crypto';

export interface JobStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface Job {
  id: string;
  userId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  steps: JobStep[];
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

type JobListener = (job: Job) => void;

class JobStore {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<JobListener>>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();

  create(userId: string, type: string, stepDefs: Array<{ id: string; label: string }>): Job {
    const job: Job = {
      id: randomUUID(),
      userId,
      type,
      status: 'pending',
      progress: 0,
      steps: stepDefs.map(s => ({ id: s.id, label: s.label, status: 'pending' as const })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    // Auto-cleanup after 30 minutes
    this.cleanupTimers.set(job.id, setTimeout(() => {
      this.jobs.delete(job.id);
      this.listeners.delete(job.id);
      this.cleanupTimers.delete(job.id);
    }, 30 * 60 * 1000));

    return job;
  }

  get(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  startStep(jobId: string, stepId: string, detail?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    const step = job.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'in_progress';
      if (detail) step.detail = detail;
    }

    this.recalculateProgress(job);
    this.notify(jobId);
  }

  completeStep(jobId: string, stepId: string, detail?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const step = job.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'completed';
      if (detail) step.detail = detail;
    }

    this.recalculateProgress(job);
    this.notify(jobId);
  }

  failStep(jobId: string, stepId: string, detail?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const step = job.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'failed';
      if (detail) step.detail = detail;
    }

    this.recalculateProgress(job);
    this.notify(jobId);
  }

  updateStepDetail(jobId: string, stepId: string, detail: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const step = job.steps.find(s => s.id === stepId);
    if (step) {
      step.detail = detail;
    }

    job.updatedAt = new Date().toISOString();
    this.notify(jobId);
  }

  complete(jobId: string, result?: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.updatedAt = new Date().toISOString();

    // Mark any remaining pending steps as completed
    for (const step of job.steps) {
      if (step.status === 'pending' || step.status === 'in_progress') {
        step.status = 'completed';
      }
    }

    this.notify(jobId);
  }

  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.updatedAt = new Date().toISOString();

    this.notify(jobId);
  }

  subscribe(jobId: string, listener: JobListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(jobId);
        }
      }
    };
  }

  private recalculateProgress(job: Job): void {
    const total = job.steps.length;
    if (total === 0) return;

    const completed = job.steps.filter(s => s.status === 'completed').length;
    const inProgress = job.steps.filter(s => s.status === 'in_progress').length;
    // Count failed steps as "done" for progress purposes
    const failed = job.steps.filter(s => s.status === 'failed').length;

    job.progress = Math.round(((completed + failed + inProgress * 0.5) / total) * 100);
    job.updatedAt = new Date().toISOString();
  }

  private notify(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const set = this.listeners.get(jobId);
    if (set) {
      for (const listener of set) {
        try {
          listener(job);
        } catch (e) {
          console.error('[JobStore] Listener error:', e);
        }
      }
    }
  }
}

export const jobStore = new JobStore();
export default jobStore;
