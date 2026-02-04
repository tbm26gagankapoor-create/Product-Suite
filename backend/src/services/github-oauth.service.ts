/**
 * GitHub OAuth Service
 * Handles GitHub OAuth 2.0 for repository integration (not login)
 * Requests 'repo' scope to allow pushing documents to repositories
 */

import crypto from 'crypto';
import database, { generateUUID, now } from '../lib/database.js';
import { config } from '../config/index.js';

// OAuth State interface for CSRF protection
interface OAuthState {
  id: string;
  state: string;
  provider: string;
  project_id?: string;
  user_id?: string;
  expires_at: Date;
  created_at: Date;
}

// GitHub user profile
interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

// GitHub repository
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

// GitHub branch
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

// Token response from GitHub
interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Generate a random state token for CSRF protection
 */
function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired OAuth states (older than 10 minutes)
 */
async function cleanupExpiredStates(): Promise<void> {
  const nowTime = new Date();
  const allStates = await database.getAll<OAuthState>('oauth_states');
  for (const state of allStates) {
    if (state.provider === 'github' && new Date(state.expires_at) < nowTime) {
      await database.delete('oauth_states', state.id);
    }
  }
}

export const githubOAuthService = {
  /**
   * Generate GitHub OAuth authorization URL
   * Creates and stores a state token containing projectId for the callback
   */
  async generateAuthUrl(projectId: string, userId: string): Promise<{ authUrl: string; state: string }> {
    // Clean up expired states periodically
    await cleanupExpiredStates();

    // Generate state token
    const state = generateStateToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in database with project context
    const oauthState = {
      id: generateUUID(),
      state,
      provider: 'github',
      project_id: projectId,
      user_id: userId,
      expires_at: expiresAt,
      created_at: new Date(),
    };
    console.log('[GitHub OAuth] Storing state:', {
      id: oauthState.id,
      state: oauthState.state.substring(0, 16) + '...',
      project_id: oauthState.project_id,
      user_id: oauthState.user_id,
      expires_at: oauthState.expires_at,
    });
    await database.insert('oauth_states', oauthState);
    console.log('[GitHub OAuth] State stored successfully');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri,
      scope: config.github.scopes.join(' '),
      state,
      allow_signup: 'false',
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return { authUrl, state };
  },

  /**
   * Validate state token and extract project/user context
   * Returns project_id and user_id if valid
   */
  async validateState(state: string): Promise<{ valid: boolean; projectId?: string; userId?: string }> {
    console.log('[GitHub OAuth] Validating state:', state.substring(0, 16) + '...');

    const allStates = await database.getAll<OAuthState>('oauth_states');
    console.log('[GitHub OAuth] Found', allStates.length, 'total states in DB');
    console.log('[GitHub OAuth] GitHub states:', allStates.filter(s => s.provider === 'github').map(s => ({
      id: s.id,
      state: s.state.substring(0, 16) + '...',
      project_id: s.project_id,
      user_id: s.user_id,
      expires_at: s.expires_at,
    })));

    const oauthState = allStates.find((s: OAuthState) => s.state === state && s.provider === 'github');

    if (!oauthState) {
      console.log('[GitHub OAuth] State not found in database');
      return { valid: false };
    }

    console.log('[GitHub OAuth] Found state:', oauthState.id, 'project:', oauthState.project_id);

    // Check expiration
    if (new Date(oauthState.expires_at) < new Date()) {
      console.log('[GitHub OAuth] State expired');
      // Clean up expired state
      await database.delete('oauth_states', oauthState.id);
      return { valid: false };
    }

    // Delete used state (one-time use)
    await database.delete('oauth_states', oauthState.id);

    console.log('[GitHub OAuth] State validated successfully');
    return {
      valid: true,
      projectId: oauthState.project_id,
      userId: oauthState.user_id,
    };
  },

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
        redirect_uri: config.github.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error_description?: string };
      console.error('GitHub token exchange error:', errorData);
      throw new Error(`Failed to exchange code for token: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json() as TokenResponse & { error?: string; error_description?: string };

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data;
  },

  /**
   * Fetch user profile from GitHub API
   */
  async getUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      console.error('GitHub user API error:', errorData);
      throw new Error(`Failed to fetch user profile: ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<GitHubUserProfile>;
  },

  /**
   * List repositories the user has write access to
   */
  async listUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        console.error('GitHub repos API error:', errorData);
        throw new Error(`Failed to list repositories: ${errorData.message || response.statusText}`);
      }

      const pageRepos = await response.json() as GitHubRepo[];

      // Filter to repos with push access
      const pushRepos = pageRepos.filter(repo => repo.permissions?.push);
      repos.push(...pushRepos);

      // Check if there are more pages
      if (pageRepos.length < perPage) {
        break;
      }
      page++;

      // Safety limit - don't fetch more than 500 repos
      if (repos.length >= 500) {
        break;
      }
    }

    return repos;
  },

  /**
   * List branches for a repository
   */
  async listBranches(accessToken: string, owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      console.error('GitHub branches API error:', errorData);
      throw new Error(`Failed to list branches: ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<GitHubBranch[]>;
  },

  /**
   * Create a new GitHub repository for a project
   * Repository name is derived from project name (slugified)
   */
  async createRepository(
    accessToken: string,
    repoName: string,
    description: string,
    isPrivate: boolean = true
  ): Promise<GitHubRepo> {
    console.log('[GitHub] Creating repository:', repoName);

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description,
        private: isPrivate,
        auto_init: true, // Initialize with README so we can push immediately
        has_issues: false,
        has_projects: false,
        has_wiki: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; errors?: Array<{ message: string }> };
      console.error('[GitHub] Create repo error:', errorData);

      // Check if repo already exists
      if (response.status === 422 && errorData.errors?.some(e => e.message?.includes('already exists'))) {
        throw new Error(`Repository "${repoName}" already exists. Please use a different project name.`);
      }

      throw new Error(`Failed to create repository: ${errorData.message || response.statusText}`);
    }

    const repo = await response.json() as GitHubRepo;
    console.log('[GitHub] Repository created:', repo.full_name);
    return repo;
  },

  /**
   * Check if a repository exists
   */
  async repoExists(accessToken: string, owner: string, repo: string): Promise<boolean> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    return response.ok;
  },

  /**
   * Generate a unique repo name from project name
   * Converts to lowercase, replaces spaces with hyphens, removes special chars
   */
  generateRepoName(projectName: string, suffix?: string): string {
    let name = projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 80); // GitHub limit is 100, leave room for suffix

    // Add prefix for PRD repos
    name = `prd-${name}`;

    // Add suffix if provided (e.g., for uniqueness)
    if (suffix) {
      name = `${name}-${suffix}`;
    }

    return name || 'prd-project';
  },

  /**
   * Check if GitHub OAuth is configured
   */
  isConfigured(): boolean {
    return !!(config.github.clientId && config.github.clientSecret);
  },
};

export default githubOAuthService;
