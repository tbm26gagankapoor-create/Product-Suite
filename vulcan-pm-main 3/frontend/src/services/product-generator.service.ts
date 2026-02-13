/**
 * Product Generator Service
 * Handles product creation via backend job with SSE progress streaming
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface JobStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  steps: JobStep[];
  result?: {
    projectId: string;
    name: string;
    epicsCreated: number;
    tasksCreated: number;
    docsCreated: number;
    membersAdded: number;
  };
  error?: string;
}

export interface ProductCreationInput {
  name: string;
  code?: string;
  description?: string;
  ownerId: string;
  team: string[];
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  vision?: string;
  draftSessionId?: string | null;
  docs: Record<string, string>;
  epics: Array<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description?: string;
      type?: string;
      points?: number;
      assigneeId?: string;
    }>;
  }>;
  // Git settings
  repoMode?: string | null;
  gitProviderId?: string | null;
  gitRepoOwner?: string | null;
  gitRepoName?: string | null;
  gitDocsPath?: string;
  gitBranchStrategy?: string;
}

export const productGeneratorService = {
  /**
   * Start a product creation job
   */
  async startCreation(input: ProductCreationInput): Promise<{ jobId: string }> {
    const response = await fetch(`${API_BASE}/products/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to start product creation');
    }

    return { jobId: data.data.jobId };
  },

  /**
   * Get current job status (polling fallback)
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE}/products/create/${jobId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get job status');
    }

    return data.data;
  },

  /**
   * Subscribe to SSE stream for real-time updates.
   * Uses fetch-based SSE reader since EventSource doesn't support auth headers.
   * Returns an unsubscribe function.
   */
  subscribeToStream(
    jobId: string,
    onUpdate: (status: JobStatus) => void,
    onError: (error: Error) => void
  ): () => void {
    let aborted = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = localStorage.getItem('infinia_token');
        const response = await fetch(`${API_BASE}/products/create/${jobId}/stream`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onUpdate(data);
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err: any) {
        if (!aborted && err.name !== 'AbortError') {
          onError(err);
        }
      }
    };

    run();

    return () => {
      aborted = true;
      controller.abort();
    };
  },
};

export default productGeneratorService;
