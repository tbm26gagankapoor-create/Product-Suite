// Git provider client types

export interface Repository {
  id: string;
  name: string;
  full_name: string;  // owner/repo
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

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;  // Base64 encoded
  encoding: string;
  html_url: string;
}

export interface Commit {
  sha: string;
  message: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface CreateFileInput {
  path: string;
  content: string;  // Plain text, will be base64 encoded
  message: string;
  branch: string;
  sha?: string;  // Required for updates, omit for create
}

export interface CreatePullRequestInput {
  title: string;
  body: string;
  head: string;  // Source branch
  base: string;  // Target branch
}

export interface GitUserInfo {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

/**
 * Git provider client interface
 * All provider clients must implement these methods
 */
export interface CreateRepositoryInput {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;  // Initialize with README
}

export interface GitClient {
  // Authentication
  validateToken(accessToken: string): Promise<boolean>;
  getUserInfo(accessToken: string): Promise<GitUserInfo>;

  // Repository operations
  listRepositories(accessToken: string, options?: { page?: number; perPage?: number }): Promise<Repository[]>;
  getRepository(accessToken: string, owner: string, repo: string): Promise<Repository>;
  createRepository(accessToken: string, input: CreateRepositoryInput): Promise<Repository>;

  // Branch operations
  listBranches(accessToken: string, owner: string, repo: string): Promise<Branch[]>;
  getBranch(accessToken: string, owner: string, repo: string, branch: string): Promise<Branch>;
  createBranch(accessToken: string, owner: string, repo: string, name: string, fromSha: string): Promise<Branch>;

  // File operations
  getFile(accessToken: string, owner: string, repo: string, path: string, ref?: string): Promise<FileContent | null>;
  createOrUpdateFile(accessToken: string, owner: string, repo: string, input: CreateFileInput): Promise<Commit>;
  deleteFile(accessToken: string, owner: string, repo: string, path: string, message: string, sha: string, branch: string): Promise<Commit>;

  // Pull Request operations
  listPullRequests(accessToken: string, owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<PullRequest[]>;
  createPullRequest(accessToken: string, owner: string, repo: string, input: CreatePullRequestInput): Promise<PullRequest>;
  getPullRequest(accessToken: string, owner: string, repo: string, number: number): Promise<PullRequest>;
}

/**
 * Base class for Git clients with common functionality
 */
export abstract class BaseGitClient implements GitClient {
  protected abstract readonly baseUrl: string;
  protected abstract readonly providerName: string;

  protected async request<T>(
    accessToken: string,
    method: string,
    endpoint: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      const error = new Error(`${this.providerName} API error: ${response.status} - ${errorMessage}`);
      (error as any).status = response.status;
      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  abstract validateToken(accessToken: string): Promise<boolean>;
  abstract getUserInfo(accessToken: string): Promise<GitUserInfo>;
  abstract listRepositories(accessToken: string, options?: { page?: number; perPage?: number }): Promise<Repository[]>;
  abstract getRepository(accessToken: string, owner: string, repo: string): Promise<Repository>;
  abstract createRepository(accessToken: string, input: CreateRepositoryInput): Promise<Repository>;
  abstract listBranches(accessToken: string, owner: string, repo: string): Promise<Branch[]>;
  abstract getBranch(accessToken: string, owner: string, repo: string, branch: string): Promise<Branch>;
  abstract createBranch(accessToken: string, owner: string, repo: string, name: string, fromSha: string): Promise<Branch>;
  abstract getFile(accessToken: string, owner: string, repo: string, path: string, ref?: string): Promise<FileContent | null>;
  abstract createOrUpdateFile(accessToken: string, owner: string, repo: string, input: CreateFileInput): Promise<Commit>;
  abstract deleteFile(accessToken: string, owner: string, repo: string, path: string, message: string, sha: string, branch: string): Promise<Commit>;
  abstract listPullRequests(accessToken: string, owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<PullRequest[]>;
  abstract createPullRequest(accessToken: string, owner: string, repo: string, input: CreatePullRequestInput): Promise<PullRequest>;
  abstract getPullRequest(accessToken: string, owner: string, repo: string, number: number): Promise<PullRequest>;
}
