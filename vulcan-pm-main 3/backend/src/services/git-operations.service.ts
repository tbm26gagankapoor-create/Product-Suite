import { gitProvidersRepository } from '../db/postgres/repositories/git-providers.repository.js';
import { userGitTokensRepository } from '../db/postgres/repositories/user-git-tokens.repository.js';
import { gitOAuthService } from './git-oauth.service.js';
import {
  getGitClient,
  isSupportedProvider,
  Repository,
  Branch,
  FileContent,
  Commit,
  PullRequest,
  CreateFileInput,
  CreatePullRequestInput,
  CreateRepositoryInput,
} from './git-clients/index.js';

export interface GitOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class GitOperationsService {
  /**
   * Get a valid access token for user and provider
   * Handles token refresh if needed
   */
  private async getAccessToken(userId: string, providerId: string): Promise<string> {
    const token = await gitOAuthService.getValidAccessToken(userId, providerId);
    if (!token) {
      throw new Error('No valid Git connection found. Please reconnect your account.');
    }
    return token;
  }

  /**
   * Get the Git client for a provider
   */
  private async getClient(providerId: string) {
    const provider = await gitProvidersRepository.findById(providerId);
    if (!provider) {
      throw new Error('Git provider not found');
    }

    if (!isSupportedProvider(provider.provider_type)) {
      throw new Error(`Unsupported provider type: ${provider.provider_type}`);
    }

    return {
      client: getGitClient(provider.provider_type),
      provider,
    };
  }

  /**
   * List repositories the user has access to
   */
  async listRepositories(
    userId: string,
    providerId: string,
    options?: { page?: number; perPage?: number }
  ): Promise<Repository[]> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.listRepositories(token, options);
  }

  /**
   * Create a new repository
   */
  async createRepository(
    userId: string,
    providerId: string,
    input: CreateRepositoryInput
  ): Promise<Repository> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);
    return client.createRepository(token, input);
  }

  /**
   * Get a specific repository
   */
  async getRepository(
    userId: string,
    providerId: string,
    owner: string,
    repo: string
  ): Promise<Repository> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.getRepository(token, owner, repo);
  }

  /**
   * List branches in a repository
   */
  async listBranches(
    userId: string,
    providerId: string,
    owner: string,
    repo: string
  ): Promise<Branch[]> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.listBranches(token, owner, repo);
  }

  /**
   * Get a specific branch
   */
  async getBranch(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<Branch> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.getBranch(token, owner, repo, branch);
  }

  /**
   * Create a new branch
   */
  async createBranch(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    branchName: string,
    fromBranch: string
  ): Promise<Branch> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    // Get the SHA of the source branch
    const sourceBranch = await client.getBranch(token, owner, repo, fromBranch);

    return client.createBranch(token, owner, repo, branchName, sourceBranch.sha);
  }

  /**
   * Get file content from repository
   */
  async getFile(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent | null> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.getFile(token, owner, repo, path, ref);
  }

  /**
   * Create or update a file in the repository
   */
  async pushFile(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ): Promise<Commit> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    // Check if file exists to get SHA for update
    const existingFile = await client.getFile(token, owner, repo, path, branch);

    const input: CreateFileInput = {
      path,
      content,
      message,
      branch,
      sha: existingFile?.sha,
    };

    return client.createOrUpdateFile(token, owner, repo, input);
  }

  /**
   * Push multiple files in a single operation
   * Note: This creates separate commits per file for most providers
   * For atomic multi-file commits, use createCommitWithFiles (if supported)
   */
  async pushFiles(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    message: string,
    branch: string
  ): Promise<Commit[]> {
    const commits: Commit[] = [];

    for (const file of files) {
      const commit = await this.pushFile(
        userId,
        providerId,
        owner,
        repo,
        file.path,
        file.content,
        `${message} - ${file.path}`,
        branch
      );
      commits.push(commit);
    }

    return commits;
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    path: string,
    message: string,
    branch: string
  ): Promise<Commit> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    // Get file SHA
    const existingFile = await client.getFile(token, owner, repo, path, branch);
    if (!existingFile) {
      throw new Error(`File not found: ${path}`);
    }

    return client.deleteFile(token, owner, repo, path, message, existingFile.sha, branch);
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    state?: 'open' | 'closed' | 'all'
  ): Promise<PullRequest[]> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.listPullRequests(token, owner, repo, state);
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    const input: CreatePullRequestInput = {
      title,
      body,
      head,
      base,
    };

    return client.createPullRequest(token, owner, repo, input);
  }

  /**
   * Get a specific pull request
   */
  async getPullRequest(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    number: number
  ): Promise<PullRequest> {
    const token = await this.getAccessToken(userId, providerId);
    const { client } = await this.getClient(providerId);

    return client.getPullRequest(token, owner, repo, number);
  }

  /**
   * Check if user has write access to a repository
   */
  async hasWriteAccess(
    userId: string,
    providerId: string,
    owner: string,
    repo: string
  ): Promise<boolean> {
    try {
      const repository = await this.getRepository(userId, providerId, owner, repo);
      return repository.permissions?.push || repository.permissions?.admin || false;
    } catch {
      return false;
    }
  }

  /**
   * Validate user has connection and access to repository
   */
  async validateAccess(
    userId: string,
    providerId: string,
    owner: string,
    repo: string
  ): Promise<{ valid: boolean; hasWriteAccess: boolean; error?: string }> {
    try {
      // Check connection exists
      const connection = await userGitTokensRepository.findByUserAndProvider(userId, providerId);
      if (!connection) {
        return { valid: false, hasWriteAccess: false, error: 'No Git connection found' };
      }

      if (!connection.is_valid) {
        return { valid: false, hasWriteAccess: false, error: 'Git connection is invalid. Please reconnect.' };
      }

      // Check repository access
      const token = await this.getAccessToken(userId, providerId);
      const { client } = await this.getClient(providerId);

      try {
        const repository = await client.getRepository(token, owner, repo);
        const hasWrite = repository.permissions?.push || repository.permissions?.admin || false;

        return { valid: true, hasWriteAccess: hasWrite };
      } catch (error: any) {
        if (error.status === 404) {
          return { valid: false, hasWriteAccess: false, error: 'Repository not found or no access' };
        }
        throw error;
      }
    } catch (error: any) {
      return { valid: false, hasWriteAccess: false, error: error.message };
    }
  }
}

export const gitOperationsService = new GitOperationsService();
export default gitOperationsService;
