/**
 * Git Integration Service
 * Handles Git provider connections, repository operations, and document sync
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

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    const error = new Error(data.error || 'Request failed');
    (error as any).code = data.code;
    throw error;
  }
  return data.data as T;
}

// Types
export interface GitProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: 'github' | 'gitlab' | 'bitbucket';
  is_oauth_configured: boolean;
  icon_url: string | null;
}

export interface GitConnection {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_display_name: string;
  provider_type: string;
  provider_icon_url: string | null;
  auth_type: 'oauth' | 'pat';
  provider_username: string | null;
  provider_email: string | null;
  provider_avatar_url: string | null;
  is_valid: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string | null;
  };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

export interface ProjectGitSettings {
  enabled: boolean;
  provider_id: string;
  repository: {
    owner: string;
    name: string;
    full_name: string;
    url: string;
    default_branch: string;
  };
  docs_path: string;
  branch_strategy: 'direct' | 'pr';
  repo_mode?: 'shared' | 'dedicated' | 'code';
  linked_by_user_id: string;
  linked_at: string;
  last_sync_at?: string;
}

export interface SyncResult {
  success: boolean;
  section_id: string;
  section_name: string;
  file_path: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  commit?: {
    sha: string;
    message: string;
    html_url: string;
  };
  error?: string;
}

export interface SyncPreview {
  section_id: string;
  section_name: string;
  file_path: string;
  action: 'create' | 'update' | 'no_change';
  current_sha?: string;
}

export interface SyncOptions {
  branch?: string;
  create_branch?: boolean;
  branch_name?: string;
  commit_message?: string;
  create_pr?: boolean;
  pr_title?: string;
  pr_description?: string;
}

export interface SyncResponse {
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: SyncResult[];
  pull_request?: {
    number: number;
    url: string;
    title: string;
  };
}

export const gitService = {
  // =====================================================
  // PROVIDER OPERATIONS
  // =====================================================

  /**
   * Get list of available Git providers
   */
  async getProviders(): Promise<GitProvider[]> {
    const response = await fetch(`${API_BASE}/git/providers`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<GitProvider[]>(response);
  },

  // =====================================================
  // CONNECTION OPERATIONS
  // =====================================================

  /**
   * Get user's connected Git providers
   */
  async getMyConnections(): Promise<GitConnection[]> {
    const response = await fetch(`${API_BASE}/git/connections`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<GitConnection[]>(response);
  },

  /**
   * Initiate OAuth flow for a provider
   * Returns auth URL to redirect the user to
   */
  async initiateOAuth(providerId: string): Promise<{ authUrl: string }> {
    const response = await fetch(`${API_BASE}/git/auth/${providerId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ authUrl: string }>(response);
  },

  /**
   * Connect using Personal Access Token
   */
  async connectWithPAT(
    providerId: string,
    token: string
  ): Promise<{
    provider_username: string;
    provider_email: string | null;
    provider_avatar_url: string | null;
  }> {
    const response = await fetch(`${API_BASE}/git/auth/${providerId}/pat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  /**
   * Disconnect a provider
   */
  async disconnect(providerId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/git/connections/${providerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  /**
   * Validate a connection is still working
   */
  async validateConnection(providerId: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${API_BASE}/git/connections/${providerId}/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ valid: boolean }>(response);
  },

  /**
   * Check capabilities of a git connection (e.g., can it create repos?)
   */
  async getCapabilities(providerId: string): Promise<{
    capabilities: { list_repos: boolean; create_repo: boolean; push_files: boolean };
    token_type: string;
    hint?: string;
  }> {
    const response = await fetch(`${API_BASE}/git/connections/${providerId}/capabilities`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // =====================================================
  // REPOSITORY OPERATIONS
  // =====================================================

  /**
   * Create a new repository for the current user.
   */
  async createRepository(
    providerId: string,
    name: string,
    description?: string,
    isPrivate?: boolean
  ): Promise<Repository> {
    const response = await fetch(`${API_BASE}/git/repos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        provider_id: providerId,
        name,
        description,
        is_private: isPrivate,
      }),
    });
    return handleResponse<Repository>(response);
  },

  /**
   * List repositories for the current user (no project context needed).
   * Used during product creation wizard before a project exists.
   */
  async listMyRepositories(providerId: string): Promise<Repository[]> {
    const response = await fetch(
      `${API_BASE}/git/repos?provider_id=${providerId}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Repository[]>(response);
  },

  /**
   * List repositories available for linking to a project
   */
  async listRepositories(projectId: string, providerId: string): Promise<Repository[]> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/git/repos?provider_id=${providerId}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Repository[]>(response);
  },

  /**
   * Get project's Git settings
   */
  async getProjectGitSettings(projectId: string): Promise<ProjectGitSettings | null> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/git`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ProjectGitSettings | null>(response);
  },

  /**
   * Link a repository to a project
   */
  async linkRepository(
    projectId: string,
    providerId: string,
    owner: string,
    repo: string,
    docsPath: string = 'docs/',
    branchStrategy: 'direct' | 'pr' = 'direct',
    repoMode: 'shared' | 'dedicated' | 'code' = 'dedicated'
  ): Promise<ProjectGitSettings> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/git/link`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        provider_id: providerId,
        owner,
        repo,
        docs_path: docsPath,
        branch_strategy: branchStrategy,
        repo_mode: repoMode,
      }),
    });
    return handleResponse<ProjectGitSettings>(response);
  },

  /**
   * Unlink repository from project
   */
  async unlinkRepository(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/git/link`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  /**
   * List branches in linked repository
   */
  async listBranches(projectId: string): Promise<Branch[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/git/branches`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Branch[]>(response);
  },

  // =====================================================
  // DOCUMENT SYNC OPERATIONS
  // =====================================================

  /**
   * Preview what documents would be synced
   */
  async previewSync(
    projectId: string,
    documents: Array<{ section_id: string; content: string }>
  ): Promise<{
    summary: { total: number; creates: number; updates: number; no_changes: number };
    previews: SyncPreview[];
  }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/docs/sync/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documents }),
    });
    return handleResponse(response);
  },

  /**
   * Sync documents to Git repository
   */
  async syncDocuments(
    projectId: string,
    documents: Array<{ section_id: string; content: string }>,
    options: SyncOptions = {}
  ): Promise<SyncResponse> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/docs/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        documents,
        ...options,
      }),
    });
    return handleResponse<SyncResponse>(response);
  },

  /**
   * Get sync status for a project
   */
  async getSyncStatus(projectId: string): Promise<{
    has_repo: boolean;
    repository: {
      full_name: string;
      url: string;
      default_branch: string;
    } | null;
    docs_path: string | null;
    branch_strategy: string | null;
    last_sync_at: string | null;
    linked_at: string | null;
  }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/docs/sync/status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

export default gitService;
