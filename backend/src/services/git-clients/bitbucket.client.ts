/**
 * Bitbucket Client
 * Git operations for Bitbucket repositories
 * Uses Bitbucket Cloud REST API
 */

import { query } from '../../db/postgres/client.js';

interface BitbucketProvider {
  id: string;
  provider_type: 'bitbucket';
  name: string;
  api_endpoint: string;
  is_enabled: boolean;
}

interface BitbucketFile {
  file_path: string;
  branch: string;
  content: string;
  commit_message: string;
}

// Cache for Bitbucket provider (60 second TTL)
let providerCache: { provider: BitbucketProvider; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export const bitbucketClient = {
  /**
   * Get Bitbucket provider from database
   */
  async getProvider(): Promise<BitbucketProvider | null> {
    // Check cache first
    if (providerCache && (Date.now() - providerCache.timestamp) < CACHE_TTL) {
      return providerCache.provider;
    }

    try {
      const result = await query(
        `SELECT * FROM git_providers WHERE provider_type = 'bitbucket' AND is_enabled = true LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.warn('[Bitbucket] Provider not configured');
        return null;
      }

      const row = result.rows[0];
      const provider: BitbucketProvider = {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        api_endpoint: row.api_endpoint || 'https://api.bitbucket.org/2.0',
        is_enabled: row.is_enabled
      };

      // Cache the provider
      providerCache = { provider, timestamp: Date.now() };

      return provider;
    } catch (error: any) {
      console.error('[Bitbucket] Error fetching provider:', error.message);
      return null;
    }
  },

  /**
   * Get user's access token
   */
  async getUserAccessToken(userId: string): Promise<string | null> {
    try {
      const result = await query(
        `SELECT bitbucket_token FROM user_git_tokens WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].bitbucket_token) {
        return result.rows[0].bitbucket_token;
      }

      // Fallback to environment variable for testing
      return process.env.BITBUCKET_ACCESS_TOKEN || null;
    } catch (error) {
      console.error('[Bitbucket] Error fetching user token:', error);
      return null;
    }
  },

  /**
   * Get file from Bitbucket repository
   */
  async getFile(params: {
    workspace: string;
    repoSlug: string;
    filePath: string;
    branch?: string;
    accessToken: string;
  }): Promise<{ content: string; sha: string } | null> {
    const { workspace, repoSlug, filePath, branch = 'main', accessToken } = params;

    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('Bitbucket provider not configured');
    }

    try {
      // Get file content
      const contentUrl = `${provider.api_endpoint}/repositories/${workspace}/${repoSlug}/src/${branch}/${filePath}`;

      const contentResponse = await fetch(contentUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!contentResponse.ok) {
        if (contentResponse.status === 404) {
          return null; // File not found
        }
        throw new Error(`Bitbucket API error: ${contentResponse.statusText}`);
      }

      const content = await contentResponse.text();

      // Get file metadata for commit hash
      const metaUrl = `${provider.api_endpoint}/repositories/${workspace}/${repoSlug}/src/${branch}/${filePath}?format=meta`;

      const metaResponse = await fetch(metaUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      let sha = '';
      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        sha = metaData.commit?.hash || '';
      }

      return { content, sha };

    } catch (error: any) {
      console.error('[Bitbucket] Error fetching file:', error.message);
      throw error;
    }
  },

  /**
   * Create or update file in Bitbucket repository
   */
  async upsertFile(params: BitbucketFile & {
    workspace: string;
    repoSlug: string;
    accessToken: string;
    author?: string;
  }): Promise<{ success: boolean; commit_sha?: string }> {
    const { workspace, repoSlug, file_path, branch, content, commit_message, accessToken, author = 'Claude Code' } = params;

    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('Bitbucket provider not configured');
    }

    try {
      const url = `${provider.api_endpoint}/repositories/${workspace}/${repoSlug}/src`;

      // Bitbucket uses form-data for file uploads
      const formData = new FormData();
      formData.append('message', commit_message);
      formData.append('author', author);
      formData.append('branch', branch);
      formData.append(file_path, new Blob([content], { type: 'text/plain' }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bitbucket API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        commit_sha: result.hash
      };

    } catch (error: any) {
      console.error('[Bitbucket] Error upserting file:', error.message);
      throw error;
    }
  },

  /**
   * List user's accessible repositories
   */
  async listRepositories(params: {
    accessToken: string;
    workspace?: string;
  }): Promise<Array<{
    workspace: string;
    slug: string;
    name: string;
    full_name: string;
    description: string;
    default_branch: string;
  }>> {
    const { accessToken, workspace } = params;

    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('Bitbucket provider not configured');
    }

    try {
      // If workspace specified, list repos for that workspace
      // Otherwise, list all repos user has access to
      const url = workspace
        ? `${provider.api_endpoint}/repositories/${workspace}?pagelen=100`
        : `${provider.api_endpoint}/repositories?role=member&pagelen=100`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Bitbucket API error: ${response.statusText}`);
      }

      const data = await response.json();
      const repos = data.values || [];

      return repos.map((repo: any) => ({
        workspace: repo.workspace?.slug || '',
        slug: repo.slug,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        default_branch: repo.mainbranch?.name || 'main'
      }));

    } catch (error: any) {
      console.error('[Bitbucket] Error listing repositories:', error.message);
      throw error;
    }
  },

  /**
   * Clear provider cache
   */
  clearCache(): void {
    providerCache = null;
    console.log('[Bitbucket] Provider cache cleared');
  }
};
