/**
 * Draft Session Service
 * Handles incremental doc persistence and git sync during wizard flow.
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

export interface DraftGitSettings {
  provider_id: string;
  repo_owner: string;
  repo_name: string;
  docs_path: string;
  default_branch: string;
}

export interface DraftSection {
  content: string;
  synced_to_git: boolean;
  updated_at: string;
}

export interface DraftSession {
  id: string;
  user_id: string;
  product_name: string;
  git?: DraftGitSettings;
  sections: Record<string, DraftSection>;
  created_at: string;
  expires_at: string;
  step?: string;
  vision?: string;
  description?: string;
  epics?: any[];
  suggestions?: any[];
  research_report?: any;
  input_mode?: string;
  tags?: string;
  repo_mode?: string | null;
}

export const draftService = {
  async createSession(params: {
    productName: string;
    git?: DraftGitSettings;
  }): Promise<{ sessionId: string }> {
    const response = await fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create draft session');
    }

    return { sessionId: data.data.sessionId };
  },

  async syncSection(sessionId: string, sectionId: string, content: string): Promise<void> {
    const response = await fetch(`${API_BASE}/drafts/${sessionId}/sections/${sectionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to sync section');
    }
  },

  async updateGitSettings(sessionId: string, git: DraftGitSettings): Promise<void> {
    const response = await fetch(`${API_BASE}/drafts/${sessionId}/git`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ git }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update git settings');
    }
  },

  async listMyDrafts(): Promise<DraftSession[]> {
    const response = await fetch(`${API_BASE}/drafts`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to list drafts');
    }

    return data.data;
  },

  async getDraft(sessionId: string): Promise<DraftSession> {
    const response = await fetch(`${API_BASE}/drafts/${sessionId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch draft');
    }

    return data.data;
  },

  async updateMeta(sessionId: string, meta: Record<string, any>): Promise<void> {
    const response = await fetch(`${API_BASE}/drafts/${sessionId}/meta`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(meta),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update draft meta');
    }
  },

  async deleteDraft(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/drafts/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete draft');
    }
  },
};

export default draftService;
