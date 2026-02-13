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
 * Bitbucket API client
 * Implements Git operations using Bitbucket's REST API 2.0
 */
export class BitbucketClient extends BaseGitClient {
  protected readonly baseUrl = 'https://api.bitbucket.org/2.0';
  protected readonly providerName = 'Bitbucket';

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

    // Get email from separate endpoint
    let email: string | null = null;
    try {
      const emailData = await this.request<any>(accessToken, 'GET', '/user/emails');
      const primaryEmail = emailData.values?.find((e: any) => e.is_primary);
      email = primaryEmail?.email || emailData.values?.[0]?.email || null;
    } catch {
      // Email might not be available
    }

    return {
      id: data.uuid || data.account_id,
      username: data.username || data.nickname,
      email,
      name: data.display_name,
      avatar_url: data.links?.avatar?.href || null,
    };
  }

  async listRepositories(
    accessToken: string,
    options?: { page?: number; perPage?: number }
  ): Promise<Repository[]> {
    const page = options?.page || 1;
    const perPage = options?.perPage || 100;

    // Get current user first
    const user = await this.getUserInfo(accessToken);

    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${user.username}?page=${page}&pagelen=${perPage}&sort=-updated_on`
    );

    return (data.values || []).map((repo: any) => this.mapRepository(repo));
  }

  async getRepository(accessToken: string, owner: string, repo: string): Promise<Repository> {
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${owner}/${repo}`
    );
    return this.mapRepository(data);
  }

  async createRepository(accessToken: string, input: CreateRepositoryInput): Promise<Repository> {
    const user = await this.getUserInfo(accessToken);
    const data = await this.request<any>(
      accessToken,
      'POST',
      `/repositories/${user.username}/${input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
      {
        scm: 'git',
        name: input.name,
        description: input.description || '',
        is_private: input.private ?? true,
      }
    );
    return this.mapRepository(data);
  }

  async listBranches(accessToken: string, owner: string, repo: string): Promise<Branch[]> {
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${owner}/${repo}/refs/branches`
    );

    return (data.values || []).map((branch: any) => ({
      name: branch.name,
      sha: branch.target?.hash || '',
      protected: false, // Bitbucket doesn't expose this in the same way
    }));
  }

  async getBranch(accessToken: string, owner: string, repo: string, branch: string): Promise<Branch> {
    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${owner}/${repo}/refs/branches/${encodeURIComponent(branch)}`
    );
    return {
      name: data.name,
      sha: data.target?.hash || '',
      protected: false,
    };
  }

  async createBranch(
    accessToken: string,
    owner: string,
    repo: string,
    name: string,
    fromSha: string
  ): Promise<Branch> {
    const data = await this.request<any>(
      accessToken,
      'POST',
      `/repositories/${owner}/${repo}/refs/branches`,
      {
        name,
        target: { hash: fromSha },
      }
    );
    return {
      name: data.name,
      sha: data.target?.hash || fromSha,
      protected: false,
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
      const refParam = ref || 'HEAD';
      const endpoint = `/repositories/${owner}/${repo}/src/${encodeURIComponent(refParam)}/${encodeURIComponent(path)}`;

      // First get file metadata
      const metaResponse = await fetch(`${this.baseUrl}${endpoint}?format=meta`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!metaResponse.ok) {
        if (metaResponse.status === 404) return null;
        throw new Error(`Bitbucket API error: ${metaResponse.status}`);
      }

      const meta = await metaResponse.json() as { path: string; commit?: { hash: string }; size?: number; links?: { html?: { href: string } } };

      // Then get file content
      const contentResponse = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!contentResponse.ok) {
        throw new Error(`Bitbucket API error: ${contentResponse.status}`);
      }

      const content = await contentResponse.text();
      const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

      return {
        name: meta.path.split('/').pop() || meta.path,
        path: meta.path,
        sha: meta.commit?.hash || '',
        size: meta.size || 0,
        content: contentBase64,
        encoding: 'base64',
        html_url: meta.links?.html?.href || `https://bitbucket.org/${owner}/${repo}/src/${refParam}/${path}`,
      };
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
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
    // Bitbucket uses a different approach - POST to src endpoint with form data
    const formData = new FormData();
    formData.append(input.path, new Blob([input.content], { type: 'text/plain' }));
    formData.append('message', input.message);
    formData.append('branch', input.branch);

    const response = await fetch(
      `${this.baseUrl}/repositories/${owner}/${repo}/src`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket API error: ${response.status} - ${errorText}`);
    }

    // Get the latest commit to return proper info
    const commitsData = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${owner}/${repo}/commits/${input.branch}?pagelen=1`
    );

    const latestCommit = commitsData.values?.[0];

    return {
      sha: latestCommit?.hash || '',
      message: input.message,
      html_url: latestCommit?.links?.html?.href || `https://bitbucket.org/${owner}/${repo}/commits`,
      author: {
        name: latestCommit?.author?.user?.display_name || 'Unknown',
        email: latestCommit?.author?.raw?.match(/<(.+)>/)?.[1] || '',
        date: latestCommit?.date || new Date().toISOString(),
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
    // Bitbucket doesn't have a direct delete file API
    // We need to commit with the file removed
    const formData = new FormData();
    formData.append('files', path); // Files to delete
    formData.append('message', message);
    formData.append('branch', branch);

    const response = await fetch(
      `${this.baseUrl}/repositories/${owner}/${repo}/src`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket API error: ${response.status} - ${errorText}`);
    }

    return {
      sha: sha,
      message,
      html_url: `https://bitbucket.org/${owner}/${repo}/commits`,
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
    // Bitbucket uses 'OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'
    let bbState = '';
    if (state === 'open') bbState = 'OPEN';
    else if (state === 'closed') bbState = 'MERGED,DECLINED';

    const stateParam = bbState ? `&state=${bbState}` : '';

    const data = await this.request<any>(
      accessToken,
      'GET',
      `/repositories/${owner}/${repo}/pullrequests?sort=-updated_on${stateParam}`
    );

    return (data.values || []).map((pr: any) => this.mapPullRequest(pr));
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
      `/repositories/${owner}/${repo}/pullrequests`,
      {
        title: input.title,
        description: input.body,
        source: {
          branch: { name: input.head },
        },
        destination: {
          branch: { name: input.base },
        },
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
      `/repositories/${owner}/${repo}/pullrequests/${number}`
    );

    return this.mapPullRequest(data);
  }

  private mapRepository(data: any): Repository {
    return {
      id: data.uuid || data.full_name,
      name: data.slug || data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.is_private,
      html_url: data.links?.html?.href || `https://bitbucket.org/${data.full_name}`,
      clone_url: data.links?.clone?.find((c: any) => c.name === 'https')?.href || '',
      default_branch: data.mainbranch?.name || 'main',
      owner: {
        login: data.owner?.username || data.owner?.nickname || 'unknown',
        avatar_url: data.owner?.links?.avatar?.href || null,
      },
      permissions: undefined, // Bitbucket doesn't return permissions in repo response
      created_at: data.created_on,
      updated_at: data.updated_on,
    };
  }

  private mapPullRequest(data: any): PullRequest {
    let state: 'open' | 'closed' | 'merged' = 'open';
    if (data.state === 'MERGED') state = 'merged';
    else if (data.state === 'DECLINED' || data.state === 'SUPERSEDED') state = 'closed';
    else if (data.state === 'OPEN') state = 'open';

    return {
      id: data.id,
      number: data.id,
      title: data.title,
      body: data.description,
      state,
      html_url: data.links?.html?.href || '',
      head: {
        ref: data.source?.branch?.name || '',
        sha: data.source?.commit?.hash || '',
      },
      base: {
        ref: data.destination?.branch?.name || '',
        sha: data.destination?.commit?.hash || '',
      },
      user: {
        login: data.author?.username || data.author?.nickname || 'unknown',
        avatar_url: data.author?.links?.avatar?.href || null,
      },
      created_at: data.created_on,
      updated_at: data.updated_on,
      merged_at: data.state === 'MERGED' ? data.updated_on : null,
    };
  }
}

export const bitbucketClient = new BitbucketClient();
export default bitbucketClient;
