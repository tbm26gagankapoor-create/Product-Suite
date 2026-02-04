/**
 * GitHub Sync Service
 * Handles syncing PRD documents to GitHub repositories
 */

import database, { generateUUID, now } from '../lib/database.js';
import { cryptoService } from './crypto.service.js';
import { IGitHubIntegration, IGitHubSyncLog } from '../models/index.js';

// Result of a sync operation
export interface SyncResult {
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}

// GitHub file content response
interface GitHubFileContent {
  sha: string;
  content: string;
  encoding: string;
}

// Input for creating an integration
export interface CreateIntegrationInput {
  projectId: string;
  githubAccessToken: string;
  githubRefreshToken?: string;
  githubUsername: string;
  githubUserId: string;
  repoOwner: string;
  repoName: string;
  branch?: string;
  filePath?: string;
  connectedBy: string;
}

// Input for updating an integration
export interface UpdateIntegrationInput {
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  filePath?: string;
  autoSyncEnabled?: boolean;
  syncSections?: string[];
}

/**
 * Convert HTML to Markdown
 * Simple implementation - for production, consider using turndown library
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove script and style tags
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n');

  // Convert paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // Convert bold
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**');

  // Convert italic
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*');

  // Convert code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Convert links
  md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Convert images
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');

  // Convert unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
  });

  // Convert ordered lists
  let listCounter = 0;
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    listCounter = 0;
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
      listCounter++;
      return `${listCounter}. $1\n`;
    }) + '\n';
  });

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
  });

  // Convert horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n\n');

  // Convert line breaks
  md = md.replace(/<br[^>]*\/?>/gi, '\n');

  // Convert tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
    let result = '';
    const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    rows.forEach((row: string, rowIndex: number) => {
      const cells = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) || [];
      const cellContents = cells.map((cell: string) =>
        cell.replace(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi, '$2').trim()
      );

      result += '| ' + cellContents.join(' | ') + ' |\n';

      // Add header separator after first row
      if (rowIndex === 0) {
        result += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
      }
    });

    return result + '\n';
  });

  // Convert divs and spans (just remove tags)
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');
  md = md.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up multiple newlines
  md = md.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  md = md.trim();

  return md;
}

export const githubSyncService = {
  /**
   * Get integration settings for a project
   */
  async getIntegrationForProject(projectId: string): Promise<IGitHubIntegration | null> {
    const integrations = await database.getAll<IGitHubIntegration>('github_integrations');
    return integrations.find(i => i.project_id === projectId) || null;
  },

  /**
   * Create a new GitHub integration for a project
   */
  async createIntegration(input: CreateIntegrationInput): Promise<IGitHubIntegration> {
    // Check if integration already exists
    const existing = await this.getIntegrationForProject(input.projectId);
    if (existing) {
      throw new Error('GitHub integration already exists for this project');
    }

    const integration: IGitHubIntegration = {
      id: generateUUID(),
      project_id: input.projectId,
      github_access_token: cryptoService.encrypt(input.githubAccessToken),
      github_refresh_token: input.githubRefreshToken ? cryptoService.encrypt(input.githubRefreshToken) : undefined,
      github_username: input.githubUsername,
      github_user_id: input.githubUserId,
      repo_owner: input.repoOwner,
      repo_name: input.repoName,
      branch: input.branch || 'main',
      file_path: input.filePath || 'docs/PRD.md',
      auto_sync_enabled: true,
      sync_sections: [],
      connected_by: input.connectedBy,
      created_at: new Date(),
      updated_at: new Date(),
    } as IGitHubIntegration;

    await database.insert('github_integrations', integration);
    return integration;
  },

  /**
   * Update integration settings
   */
  async updateIntegration(projectId: string, input: UpdateIntegrationInput): Promise<IGitHubIntegration | null> {
    const integration = await this.getIntegrationForProject(projectId);
    if (!integration) {
      return null;
    }

    const updates: Partial<IGitHubIntegration> = {
      updated_at: new Date(),
    };

    if (input.repoOwner !== undefined) updates.repo_owner = input.repoOwner;
    if (input.repoName !== undefined) updates.repo_name = input.repoName;
    if (input.branch !== undefined) updates.branch = input.branch;
    if (input.filePath !== undefined) updates.file_path = input.filePath;
    if (input.autoSyncEnabled !== undefined) updates.auto_sync_enabled = input.autoSyncEnabled;
    if (input.syncSections !== undefined) updates.sync_sections = input.syncSections;

    await database.update('github_integrations', integration.id, updates);

    return { ...integration, ...updates } as IGitHubIntegration;
  },

  /**
   * Delete integration for a project
   */
  async deleteIntegration(projectId: string): Promise<boolean> {
    const integration = await this.getIntegrationForProject(projectId);
    if (!integration) {
      return false;
    }

    await database.delete('github_integrations', integration.id);
    return true;
  },

  /**
   * Get decrypted access token for an integration
   */
  getDecryptedToken(integration: IGitHubIntegration): string {
    return cryptoService.decrypt(integration.github_access_token);
  },

  /**
   * Get file content from GitHub (needed to get SHA for updates)
   */
  async getFileFromGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    branch: string,
    path: string
  ): Promise<{ sha: string; content: string } | null> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (response.status === 404) {
      return null; // File doesn't exist
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(`Failed to get file: ${errorData.message || response.statusText}`);
    }

    const data = await response.json() as GitHubFileContent;
    return {
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
    };
  },

  /**
   * Push content to GitHub repository
   */
  async pushToGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    branch: string,
    filePath: string,
    content: string,
    commitMessage: string
  ): Promise<{ sha: string; url: string }> {
    // Check if file exists to get its SHA (required for updates)
    const existingFile = await this.getFileFromGitHub(accessToken, owner, repo, branch, filePath);

    const body: Record<string, string> = {
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      branch,
    };

    if (existingFile) {
      body.sha = existingFile.sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; documentation_url?: string };
      console.error('[GitHub Push] Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        repo: `${owner}/${repo}`,
        branch,
        filePath,
      });
      throw new Error(`Failed to push to GitHub: ${errorData.message || response.statusText}`);
    }

    const data = await response.json() as { commit: { sha: string; html_url: string } };
    return {
      sha: data.commit.sha,
      url: data.commit.html_url,
    };
  },

  /**
   * Sync a PRD section to GitHub
   */
  async syncPRDToGitHub(
    projectId: string,
    sectionId: string,
    htmlContent: string,
    userId: string
  ): Promise<SyncResult> {
    const integration = await this.getIntegrationForProject(projectId);

    if (!integration) {
      return { success: false, error: 'GitHub integration not configured' };
    }

    if (!integration.auto_sync_enabled) {
      return { success: false, error: 'Auto-sync is disabled' };
    }

    // Check if this section should be synced
    if (integration.sync_sections.length > 0 && !integration.sync_sections.includes(sectionId)) {
      return { success: false, error: 'Section not configured for sync' };
    }

    try {
      const accessToken = this.getDecryptedToken(integration);

      // Convert HTML to Markdown
      const markdown = htmlToMarkdown(htmlContent);

      // Determine file path (support for {{section}} template)
      let filePath = integration.file_path;
      if (filePath.includes('{{section}}')) {
        filePath = filePath.replace('{{section}}', sectionId);
      }

      // Push to GitHub
      const commitMessage = `docs: update ${sectionId} PRD section\n\nSynced from Infinia`;
      const result = await this.pushToGitHub(
        accessToken,
        integration.repo_owner,
        integration.repo_name,
        integration.branch,
        filePath,
        markdown,
        commitMessage
      );

      // Update integration with last sync info
      await database.update('github_integrations', integration.id, {
        last_sync_at: new Date(),
        last_sync_status: 'success',
        last_sync_error: null,
        last_commit_sha: result.sha,
        updated_at: new Date(),
      });

      // Log the sync
      await this.logSync({
        integrationId: integration.id,
        projectId,
        sectionId,
        action: 'sync',
        status: 'success',
        commitSha: result.sha,
        commitUrl: result.url,
        triggeredBy: userId,
      });

      return {
        success: true,
        commitSha: result.sha,
        commitUrl: result.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update integration with error info
      await database.update('github_integrations', integration.id, {
        last_sync_at: new Date(),
        last_sync_status: 'failed',
        last_sync_error: errorMessage,
        updated_at: new Date(),
      });

      // Log the failed sync
      await this.logSync({
        integrationId: integration.id,
        projectId,
        sectionId,
        action: 'sync',
        status: 'failed',
        errorMessage,
        triggeredBy: userId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Manual sync trigger
   */
  async manualSync(
    projectId: string,
    sectionId: string,
    htmlContent: string,
    userId: string
  ): Promise<SyncResult> {
    const integration = await this.getIntegrationForProject(projectId);

    if (!integration) {
      return { success: false, error: 'GitHub integration not configured' };
    }

    try {
      const accessToken = this.getDecryptedToken(integration);
      const markdown = htmlToMarkdown(htmlContent);

      let filePath = integration.file_path;
      if (filePath.includes('{{section}}')) {
        filePath = filePath.replace('{{section}}', sectionId);
      }

      const commitMessage = `docs: manually sync ${sectionId} PRD section\n\nManually synced from Infinia`;
      const result = await this.pushToGitHub(
        accessToken,
        integration.repo_owner,
        integration.repo_name,
        integration.branch,
        filePath,
        markdown,
        commitMessage
      );

      // Update integration
      await database.update('github_integrations', integration.id, {
        last_sync_at: new Date(),
        last_sync_status: 'success',
        last_sync_error: null,
        last_commit_sha: result.sha,
        updated_at: new Date(),
      });

      // Log the sync
      await this.logSync({
        integrationId: integration.id,
        projectId,
        sectionId,
        action: 'manual_push',
        status: 'success',
        commitSha: result.sha,
        commitUrl: result.url,
        triggeredBy: userId,
      });

      return {
        success: true,
        commitSha: result.sha,
        commitUrl: result.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logSync({
        integrationId: integration.id,
        projectId,
        sectionId,
        action: 'manual_push',
        status: 'failed',
        errorMessage,
        triggeredBy: userId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Test GitHub connection
   */
  async testConnection(projectId: string): Promise<{ success: boolean; error?: string }> {
    const integration = await this.getIntegrationForProject(projectId);

    if (!integration) {
      return { success: false, error: 'GitHub integration not configured' };
    }

    try {
      const accessToken = this.getDecryptedToken(integration);

      // Try to access the repository
      const response = await fetch(
        `https://api.github.com/repos/${integration.repo_owner}/${integration.repo_name}`,
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
        return {
          success: false,
          error: errorData.message || 'Failed to access repository',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  },

  /**
   * Log a sync operation
   */
  async logSync(input: {
    integrationId: string;
    projectId: string;
    sectionId: string;
    action: 'sync' | 'manual_push' | 'disconnect';
    status: 'success' | 'failed';
    commitSha?: string;
    commitUrl?: string;
    errorMessage?: string;
    triggeredBy: string;
  }): Promise<void> {
    const log: IGitHubSyncLog = {
      id: generateUUID(),
      integration_id: input.integrationId,
      project_id: input.projectId,
      section_id: input.sectionId,
      action: input.action,
      status: input.status,
      commit_sha: input.commitSha,
      commit_url: input.commitUrl,
      error_message: input.errorMessage,
      triggered_by: input.triggeredBy,
      created_at: new Date(),
    } as IGitHubSyncLog;

    await database.insert('github_sync_logs', log);
  },

  /**
   * Get sync logs for a project
   */
  async getSyncLogs(projectId: string, limit = 50): Promise<IGitHubSyncLog[]> {
    const allLogs = await database.getAll<IGitHubSyncLog>('github_sync_logs');
    return allLogs
      .filter(log => log.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },

  /**
   * Convert HTML to Markdown (exposed for testing)
   */
  convertHtmlToMarkdown: htmlToMarkdown,
};

export default githubSyncService;
