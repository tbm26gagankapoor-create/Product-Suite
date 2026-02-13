-- Migration: Create jobs table for async job processing
-- Supports background tasks with SSE streaming

-- Job status enum type
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Job type enum
CREATE TYPE job_type AS ENUM (
  'product_generation',
  'document_generation',
  'ai_research',
  'bulk_import',
  'data_migration'
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  user_id UUID NOT NULL,
  organization_id VARCHAR(100) NOT NULL,

  -- Job configuration and data
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB,

  -- Progress tracking
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  progress_message TEXT,
  current_step VARCHAR(100),
  total_steps INTEGER,

  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for efficient queries
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_created_at_desc ON jobs(created_at DESC);

-- Comment
COMMENT ON TABLE jobs IS 'Async job queue for long-running background tasks with SSE streaming support';
