/**
 * GitLab Client
 * Git operations for GitLab repositories
 * Uses GitLab REST API for file operations
 */

import { query } from '../../db/postgres/client.js';

interface GitLabProvider {
  id: string;
  provider_type: 'gitlab';
  name: string;
  api_endpoint: string;
  is_enabled: boolean;
}

interface GitLabFile {
  file_path: string;
  branch: string;
  content: string;
  commit_message: string;
}

// Cache for GitLab provider (60 second TTL)
let providerCache: { provider: GitLabProvider; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export const gitLabClient = {
  /**
   * Get GitLab provider from database
   */
  async getProvider(): Promise<GitLabProvider | null> {
    // Check cache first
    if (providerCache && (Date.now() - providerCache.timestamp) < CACHE_TTL) {
      return providerCache.provider;
    }

    try {
      const result = await query(
        `SELECT * FROM git_providers WHERE provider_type = 'gitlab' AND is_enabled = true LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.warn('[GitLab] Provider not configured');
        return null;
      }

      const row = result.rows[0];
      const provider: GitLabProvider = {
        id: row.id,
        provider_type: row.provider_type,
        name: row.name,
        api_endpoint: row.api_endpoint || 'https://gitlab.com/api/v4',
        is_enabled: row.is_enabled
      };

      // Cache the provider
      providerCache = { provider, timestamp: Date.now() };

      return provider;
    } catch (error: any) {
      console.error('[GitLab] Error fetching provider:', error.message);
      return null;
    }
  },

  /**
   * Get user's access token (from user profile or env)
   */
  async getUserAccessToken(userId: string): Promise<string | null> {
    try {
      const result = await query(
        `SELECT gitlab_token FROM user_git_tokens WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].gitlab_token) {
        return result.rows[0].gitlab_token;
      }

      // Fallback to environment variable for testing
      return process.env.GITLAB_ACCESS_TOKEN || null;
    } catch (error) {
      console.error('[GitLab] Error fetching user token:', error);
      return null;
    }
  },

  /**
   * Get file from GitLab repository
   */
  async getFile(params: {
    projectId: string;
    filePath: string;
    branch?: string;
    accessToken: string;
  }): Promise<{ content: string; sha: string } | null> {
    const { projectId, filePath, branch = 'main', accessToken } = params;

    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('GitLab provider not configured');
    }

    try {
      const url = `${provider.api_endpoint}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?ref=${branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // File not found
        }
        throw new Error(`GitLab API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        content,
        sha: data.blob_id
      };

    } catch (error: any) {
      console.error('[GitLab] Error fetching file:', error.message);
      throw error;
    }
  },

  /**
   * Create or update file in GitLab repository
   */
  async upsertFile(params: GitLabFile & {
    projectId: string;
    accessToken: string;
  }): Promise<{ success: boolean; commit_sha?: string }> {
    const { projectId, file_path, branch, content, commit_message, accessToken } = params;

    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('GitLab provider not configured');
    }

    try {
      // Check if file exists
      const existingFile = await this.getFile({
        projectId,
        filePath: file_path,
        branch,
        accessToken
      });

      const url = `${provider.api_endpoint}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(file_path)}`;

      // Encode content to base64
      const encodedContent = Buffer.from(content).toString('base64');

      const payload = {
        branch,
        content: encodedContent,
        commit_message,
        encoding: 'base64'
      };

      let response;

      if (existingFile) {
        // Update existing file
        response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new file
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitLab API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        commit_sha: result.commit_id
      };

    } catch (error: any) {
      console.error('[GitLab] Error upserting file:', error.message);
      throw error;
    }
  },

  /**
   * List user's accessible projects
   */
  async listProjects(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    full_name: string;
    description: string;
    default_branch: string;
  }>> {
    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('GitLab provider not configured');
    }

    try {
      const response = await fetch(`${provider.api_endpoint}/projects?membership=true&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`GitLab API error: ${response.statusText}`);
      }

      const projects = await response.json();

      return projects.map((proj: any) => ({
        id: String(proj.id),
        name: proj.name,
        full_name: proj.path_with_namespace,
        description: proj.description || '',
        default_branch: proj.default_branch || 'main'
      }));

    } catch (error: any) {
      console.error('[GitLab] Error listing projects:', error.message);
      throw error;
    }
  },

  /**
   * Clear provider cache
   */
  clearCache(): void {
    providerCache = null;
    console.log('[GitLab] Provider cache cleared');
  }
};
