import {
  BaseGitClient,
  Repository,
  Branch,
  FileContent,
  Commit,
  PullRequest,
  CreateFileInput,
  CreatePullRequestInput,
  CreateRepositoryInput,
  GitUserInfo,
} from './types.js';

/**
 * GitLab API client
 * Implements Git operations using GitLab's REST API v4
 */
export class GitLabClient extends BaseGitClient {
  protected readonly baseUrl = 'https://gitlab.com/api/v4';
  protected readonly providerName = 'GitLab';

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async getUserInfo(accessToken: string): Promise<GitUserInfo> {
    const data = await this.request<any>(accessToken, 'GET', '/user');
    return {
      id: String(data.id),
      username: data.username,
      email: data.email,
      name: data.name,
      avatar_url: data.avatar_url,
    };
  }

  async listRepositories(
    accessToken: string,
    options?: { page?: number; perPage?: number }
  ): Promise<Repository[]> {
    const page = options?.page || 1;
    const perPage = options?.perPage || 100;

    const data = await this.request<any[]>(
      accessToken,
      'GET',
      `/projects?membership=true&order_by=updated_at&sort=desc&page=${page}&per_page=${perPage}`
    );

    return data.map(project => this.mapRepository(project));
  }

  async getRepository(accessToken: string, owner: string, repo: string): Promise<Repository> {
    // GitLab uses URL-encoded path
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const data = await this.request<any>(accessToken, 'GET', `/projects/${projectPath}`);
    return this.mapRepository(data);
  }

  async createRepository(accessToken: string, input: CreateRepositoryInput): Promise<Repository> {
    const data = await this.request<any>(accessToken, 'POST', '/projects', {
      name: input.name,
      description: input.description || '',
      visibility: input.private !== false ? 'private' : 'public',
      initialize_with_readme: input.auto_init ?? true,
    });
    return this.mapRepository(data);
  }

  async listBranches(accessToken: string, owner: string, repo: string): Promise<Branch[]> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const data = await this.request<any[]>(
      accessToken,
      'GET',
      `/projects/${projectPath}/repository/branches`
    );
    return data.map(branch => ({
      name: branch.name,
      sha: branch.commit.id,
      protected: branch.protected,
    }));
  }

  async getBranch(accessToken: string, owner: string, repo: string, branch: string): Promise<Branch> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/projects/${projectPath}/repository/branches/${encodeURIComponent(branch)}`
    );
    return {
      name: data.name,
      sha: data.commit.id,
      protected: data.protected,
    };
  }

  async createBranch(
    accessToken: string,
    owner: string,
    repo: string,
    name: string,
    fromSha: string
  ): Promise<Branch> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const data = await this.request<any>(
      accessToken,
      'POST',
      `/projects/${projectPath}/repository/branches?branch=${encodeURIComponent(name)}&ref=${fromSha}`
    );
    return {
      name: data.name,
      sha: data.commit.id,
      protected: data.protected,
    };
  }

  async getFile(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent | null> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const filePath = encodeURIComponent(path);
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';

      const data = await this.request<any>(
        accessToken,
        'GET',
        `/projects/${projectPath}/repository/files/${filePath}${refParam}`
      );

      return {
        name: data.file_name,
        path: data.file_path,
        sha: data.blob_id,
        size: data.size,
        content: data.content,
        encoding: data.encoding,
        html_url: `https://gitlab.com/${owner}/${repo}/-/blob/${ref || 'main'}/${path}`,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createOrUpdateFile(
    accessToken: string,
    owner: string,
    repo: string,
    input: CreateFileInput
  ): Promise<Commit> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(input.path);

    // Check if file exists to determine create vs update
    const existingFile = await this.getFile(accessToken, owner, repo, input.path, input.branch);
    const method = existingFile ? 'PUT' : 'POST';
    const action = existingFile ? 'update' : 'create';

    const body: any = {
      branch: input.branch,
      content: input.content, // GitLab accepts plain text
      commit_message: input.message,
    };

    // For updates, we don't need to pass the sha explicitly
    // GitLab handles it automatically

    const data = await this.request<any>(
      accessToken,
      method,
      `/projects/${projectPath}/repository/files/${filePath}`,
      body
    );

    // GitLab returns different response structure
    return {
      sha: data.commit_id || data.branch,
      message: input.message,
      html_url: `https://gitlab.com/${owner}/${repo}/-/commit/${data.commit_id}`,
      author: {
        name: 'API User',
        email: '',
        date: new Date().toISOString(),
      },
    };
  }

  async deleteFile(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string
  ): Promise<Commit> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);

    const data = await this.request<any>(
      accessToken,
      'DELETE',
      `/projects/${projectPath}/repository/files/${filePath}`,
      {
        branch,
        commit_message: message,
      }
    );

    return {
      sha: data.commit_id || sha,
      message,
      html_url: `https://gitlab.com/${owner}/${repo}/-/commit/${data.commit_id}`,
      author: {
        name: 'API User',
        email: '',
        date: new Date().toISOString(),
      },
    };
  }

  async listPullRequests(
    accessToken: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);

    // GitLab uses 'opened' instead of 'open', and 'merged'/'closed' are separate
    let gitlabState = state;
    if (state === 'open') gitlabState = 'opened' as any;

    const data = await this.request<any[]>(
      accessToken,
      'GET',
      `/projects/${projectPath}/merge_requests?state=${gitlabState}&order_by=updated_at&sort=desc`
    );

    return data.map(mr => this.mapMergeRequest(mr, owner, repo));
  }

  async createPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    input: CreatePullRequestInput
  ): Promise<PullRequest> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);

    const data = await this.request<any>(
      accessToken,
      'POST',
      `/projects/${projectPath}/merge_requests`,
      {
        title: input.title,
        description: input.body,
        source_branch: input.head,
        target_branch: input.base,
      }
    );

    return this.mapMergeRequest(data, owner, repo);
  }

  async getPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    number: number
  ): Promise<PullRequest> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);

    const data = await this.request<any>(
      accessToken,
      'GET',
      `/projects/${projectPath}/merge_requests/${number}`
    );

    return this.mapMergeRequest(data, owner, repo);
  }

  private mapRepository(data: any): Repository {
    const pathParts = data.path_with_namespace.split('/');
    const owner = pathParts.slice(0, -1).join('/');

    return {
      id: String(data.id),
      name: data.path,
      full_name: data.path_with_namespace,
      description: data.description,
      private: data.visibility === 'private',
      html_url: data.web_url,
      clone_url: data.http_url_to_repo,
      default_branch: data.default_branch || 'main',
      owner: {
        login: owner || data.namespace?.path || 'unknown',
        avatar_url: data.namespace?.avatar_url || null,
      },
      permissions: data.permissions
        ? {
            admin: data.permissions.project_access?.access_level >= 40,
            push: data.permissions.project_access?.access_level >= 30,
            pull: data.permissions.project_access?.access_level >= 10,
          }
        : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at || data.last_activity_at,
    };
  }

  private mapMergeRequest(data: any, owner: string, repo: string): PullRequest {
    let state: 'open' | 'closed' | 'merged' = 'open';
    if (data.state === 'merged') state = 'merged';
    else if (data.state === 'closed') state = 'closed';
    else if (data.state === 'opened') state = 'open';

    return {
      id: data.id,
      number: data.iid,
      title: data.title,
      body: data.description,
      state,
      html_url: data.web_url,
      head: {
        ref: data.source_branch,
        sha: data.sha || '',
      },
      base: {
        ref: data.target_branch,
        sha: data.diff_refs?.base_sha || '',
      },
      user: {
        login: data.author?.username || 'unknown',
        avatar_url: data.author?.avatar_url || null,
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at,
    };
  }
}

export const gitlabClient = new GitLabClient();
export default gitlabClient;
