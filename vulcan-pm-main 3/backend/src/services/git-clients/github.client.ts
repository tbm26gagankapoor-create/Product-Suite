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
 * GitHub API client
 * Implements Git operations using GitHub's REST API
 */
export class GitHubClient extends BaseGitClient {
  protected readonly baseUrl = 'https://api.github.com';
  protected readonly providerName = 'GitHub';

  protected async request<T>(
    accessToken: string,
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    return super.request<T>(accessToken, method, endpoint, body, {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  }

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
      username: data.login,
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
      `/user/repos?sort=updated&direction=desc&page=${page}&per_page=${perPage}&affiliation=owner,collaborator,organization_member`
    );

    return data.map(repo => this.mapRepository(repo));
  }

  async getRepository(accessToken: string, owner: string, repo: string): Promise<Repository> {
    const data = await this.request<any>(accessToken, 'GET', `/repos/${owner}/${repo}`);
    return this.mapRepository(data);
  }

  async createRepository(accessToken: string, input: CreateRepositoryInput): Promise<Repository> {
    const data = await this.request<any>(accessToken, 'POST', '/user/repos', {
      name: input.name,
      description: input.description || '',
      private: input.private ?? true,
      auto_init: input.auto_init ?? true,
    });
    return this.mapRepository(data);
  }

  async listBranches(accessToken: string, owner: string, repo: string): Promise<Branch[]> {
    const data = await this.request<any[]>(accessToken, 'GET', `/repos/${owner}/${repo}/branches`);
    return data.map(branch => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }));
  }

  async getBranch(accessToken: string, owner: string, repo: string, branch: string): Promise<Branch> {
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`
    );
    return {
      name: data.name,
      sha: data.commit.sha,
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
    await this.request<any>(accessToken, 'POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: fromSha,
    });

    return this.getBranch(accessToken, owner, repo, name);
  }

  async getFile(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent | null> {
    try {
      const endpoint = ref
        ? `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`
        : `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

      const data = await this.request<any>(accessToken, 'GET', endpoint);

      // GitHub returns array for directories
      if (Array.isArray(data)) {
        return null;
      }

      return {
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        content: data.content,
        encoding: data.encoding,
        html_url: data.html_url,
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
    // Base64 encode the content
    const contentBase64 = Buffer.from(input.content, 'utf-8').toString('base64');

    const body: any = {
      message: input.message,
      content: contentBase64,
      branch: input.branch,
    };

    // If sha provided, this is an update
    if (input.sha) {
      body.sha = input.sha;
    }

    const data = await this.request<any>(
      accessToken,
      'PUT',
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(input.path)}`,
      body
    );

    return {
      sha: data.commit.sha,
      message: data.commit.message,
      html_url: data.commit.html_url,
      author: {
        name: data.commit.author?.name || 'Unknown',
        email: data.commit.author?.email || '',
        date: data.commit.author?.date || new Date().toISOString(),
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
    const data = await this.request<any>(
      accessToken,
      'DELETE',
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      { message, sha, branch }
    );

    return {
      sha: data.commit.sha,
      message: data.commit.message,
      html_url: data.commit.html_url,
      author: {
        name: data.commit.author?.name || 'Unknown',
        email: data.commit.author?.email || '',
        date: data.commit.author?.date || new Date().toISOString(),
      },
    };
  }

  async listPullRequests(
    accessToken: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const data = await this.request<any[]>(
      accessToken,
      'GET',
      `/repos/${owner}/${repo}/pulls?state=${state}&sort=updated&direction=desc`
    );

    return data.map(pr => this.mapPullRequest(pr));
  }

  async createPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    input: CreatePullRequestInput
  ): Promise<PullRequest> {
    const data = await this.request<any>(
      accessToken,
      'POST',
      `/repos/${owner}/${repo}/pulls`,
      {
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
      }
    );

    return this.mapPullRequest(data);
  }

  async getPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    number: number
  ): Promise<PullRequest> {
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repos/${owner}/${repo}/pulls/${number}`
    );

    return this.mapPullRequest(data);
  }

  private mapRepository(data: any): Repository {
    return {
      id: String(data.id),
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      html_url: data.html_url,
      clone_url: data.clone_url,
      default_branch: data.default_branch,
      owner: {
        login: data.owner.login,
        avatar_url: data.owner.avatar_url,
      },
      permissions: data.permissions
        ? {
            admin: data.permissions.admin,
            push: data.permissions.push,
            pull: data.permissions.pull,
          }
        : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  private mapPullRequest(data: any): PullRequest {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.merged_at ? 'merged' : data.state,
      html_url: data.html_url,
      head: {
        ref: data.head.ref,
        sha: data.head.sha,
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha,
      },
      user: {
        login: data.user.login,
        avatar_url: data.user.avatar_url,
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at,
    };
  }
}

export const githubClient = new GitHubClient();
export default githubClient;
