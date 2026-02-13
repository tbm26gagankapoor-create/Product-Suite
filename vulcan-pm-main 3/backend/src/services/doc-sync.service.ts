import { projectsService } from './projects.service.js';
import { gitOperationsService } from './git-operations.service.js';
import { Commit, PullRequest } from './git-clients/index.js';
import { DraftGitSettings } from '../db/mongo/repositories/draft-sessions.repository.js';
import { htmlToMarkdown } from './html-to-markdown.js';
import { applyTemplate } from './doc-templates.js';

// Document section definitions — exported for use by TOC generator and routes
export const DOCUMENT_SECTIONS: Record<string, { name: string; filename: string }> = {
  'prd': { name: 'Product Requirements Document', filename: 'PRD.md' },
  'roadmap': { name: 'Product Roadmap', filename: 'ROADMAP.md' },
  'business': { name: 'Business Requirements', filename: 'BUSINESS.md' },
  'data': { name: 'Data Dictionary', filename: 'DATA.md' },
  'app': { name: 'Application Architecture', filename: 'APP_ARCHITECTURE.md' },
  'tech': { name: 'Technical Specifications', filename: 'TECH_SPECS.md' },
  'design': { name: 'Design System', filename: 'DESIGN.md' },
  'adrs': { name: 'Architecture Decision Records', filename: 'ADRs.md' },
  'specs': { name: 'API Specifications', filename: 'API_SPECS.md' },
  'biz-flow': { name: 'Business Flows', filename: 'BUSINESS_FLOWS.md' },
  'sys-flow': { name: 'System Flows', filename: 'SYSTEM_FLOWS.md' },
  'integrations': { name: 'Integrations', filename: 'INTEGRATIONS.md' },
};

export interface SyncOptions {
  branch?: string;
  createBranch?: boolean;
  branchName?: string;
  commitMessage?: string;
  createPR?: boolean;
  prTitle?: string;
  prDescription?: string;
}

export interface SyncResult {
  success: boolean;
  section_id: string;
  section_name: string;
  file_path: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  commit?: Commit;
  error?: string;
}

export interface SyncPreview {
  section_id: string;
  section_name: string;
  file_path: string;
  action: 'create' | 'update' | 'no_change';
  current_sha?: string;
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

class DocSyncService {
  /**
   * Check if file content in the repo differs from the new content.
   * Returns true if file doesn't exist or content has changed, false if identical.
   * Comparison ignores the "Last updated" timestamp line so only real changes trigger a push.
   */
  private async hasContentChanged(
    userId: string,
    providerId: string,
    owner: string,
    repo: string,
    filePath: string,
    newContent: string,
    branch: string
  ): Promise<boolean> {
    try {
      const existing = await gitOperationsService.getFile(userId, providerId, owner, repo, filePath, branch);
      if (!existing) return true; // File doesn't exist yet

      const existingContent = Buffer.from(existing.content, 'base64').toString('utf-8');

      // Strip timestamp lines for comparison so regenerating the same content with a new timestamp doesn't count as a change
      const stripTimestamp = (s: string) => s.replace(/^> \*\*?Last updated:\*?\*?\s*.+$/gm, '').replace(/^> Last updated:\s*.+$/gm, '');
      return stripTimestamp(existingContent).trim() !== stripTimestamp(newContent).trim();
    } catch {
      // If we can't check, assume changed (will attempt push)
      return true;
    }
  }

  /**
   * Get document section info
   */
  getSectionInfo(sectionId: string): { name: string; filename: string } | null {
    return DOCUMENT_SECTIONS[sectionId] || null;
  }

  /**
   * Get file path for a document section
   */
  getDocPath(sectionId: string, docsPath: string): string {
    const section = DOCUMENT_SECTIONS[sectionId];
    if (!section) {
      return `${docsPath}${sectionId}.md`;
    }
    // Ensure docs_path ends with /
    const path = docsPath.endsWith('/') ? docsPath : `${docsPath}/`;
    return `${path}${section.filename}`;
  }

  /**
   * Generate clean GitHub-compatible markdown from HTML content.
   * Converts HTML to markdown, applies section template with Mermaid diagrams.
   */
  generateMarkdown(content: string, sectionId: string, projectName: string): string {
    const section = DOCUMENT_SECTIONS[sectionId];
    const sectionName = section?.name || sectionId;

    // Detect if content is HTML (legacy) or already markdown
    const isHtml = /<[a-z][\s\S]*>/i.test(content.trim().substring(0, 200));
    const markdownContent = isHtml ? htmlToMarkdown(content) : content;

    // Apply section-specific template (header, footer, mermaid diagrams)
    return applyTemplate(sectionId, sectionName, projectName, markdownContent);
  }

  /**
   * Preview sync changes without making any commits
   */
  async previewSync(
    tenantId: string,
    projectId: string,
    userId: string,
    documents: Array<{ section_id: string; content: string }>
  ): Promise<SyncPreview[]> {
    const project = await projectsService.getById(tenantId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      throw new Error('No repository linked to this project');
    }

    const { provider_id, repository, docs_path } = gitSettings;
    const previews: SyncPreview[] = [];

    for (const doc of documents) {
      const sectionInfo = this.getSectionInfo(doc.section_id);
      const filePath = this.getDocPath(doc.section_id, docs_path);

      try {
        // Check if file exists in repo
        const existingFile = await gitOperationsService.getFile(
          userId,
          provider_id,
          repository.owner,
          repository.name,
          filePath,
          repository.default_branch
        );

        if (existingFile) {
          // File exists - check if content is different
          const existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
          const newContent = this.generateMarkdown(doc.content, doc.section_id, project.name);

          // Simple content comparison (excluding timestamps)
          const contentChanged = existingContent !== newContent;

          previews.push({
            section_id: doc.section_id,
            section_name: sectionInfo?.name || doc.section_id,
            file_path: filePath,
            action: contentChanged ? 'update' : 'no_change',
            current_sha: existingFile.sha,
          });
        } else {
          // File doesn't exist
          previews.push({
            section_id: doc.section_id,
            section_name: sectionInfo?.name || doc.section_id,
            file_path: filePath,
            action: 'create',
          });
        }
      } catch (error: any) {
        // Assume create if we can't check
        previews.push({
          section_id: doc.section_id,
          section_name: sectionInfo?.name || doc.section_id,
          file_path: filePath,
          action: 'create',
        });
      }
    }

    return previews;
  }

  /**
   * Push a single document to the repository
   */
  async pushDocument(
    tenantId: string,
    projectId: string,
    userId: string,
    sectionId: string,
    content: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const project = await projectsService.getById(tenantId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      throw new Error('No repository linked to this project');
    }

    const { provider_id, repository, docs_path } = gitSettings;
    const sectionInfo = this.getSectionInfo(sectionId);
    const filePath = this.getDocPath(sectionId, docs_path);
    const branch = options.branch || repository.default_branch;

    try {
      // Generate markdown content
      const markdown = this.generateMarkdown(content, sectionId, project.name);

      // Check if content actually changed before pushing
      const changed = await this.hasContentChanged(userId, provider_id, repository.owner, repository.name, filePath, markdown, branch);
      if (!changed) {
        return {
          success: true,
          section_id: sectionId,
          section_name: sectionInfo?.name || sectionId,
          file_path: filePath,
          action: 'skipped',
        };
      }

      // Determine commit message
      const commitMessage = options.commitMessage ||
        `docs: update ${sectionInfo?.name || sectionId}`;

      // Push file
      const commit = await gitOperationsService.pushFile(
        userId,
        provider_id,
        repository.owner,
        repository.name,
        filePath,
        markdown,
        commitMessage,
        branch
      );

      return {
        success: true,
        section_id: sectionId,
        section_name: sectionInfo?.name || sectionId,
        file_path: filePath,
        action: 'updated',
        commit,
      };
    } catch (error: any) {
      return {
        success: false,
        section_id: sectionId,
        section_name: sectionInfo?.name || sectionId,
        file_path: filePath,
        action: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Push multiple documents to the repository
   */
  async pushDocuments(
    tenantId: string,
    projectId: string,
    userId: string,
    documents: Array<{ section_id: string; content: string }>,
    options: SyncOptions = {}
  ): Promise<{ results: SyncResult[]; pullRequest?: PullRequest }> {
    const project = await projectsService.getById(tenantId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      throw new Error('No repository linked to this project');
    }

    const { provider_id, repository } = gitSettings;
    let targetBranch = options.branch || repository.default_branch;
    const results: SyncResult[] = [];

    // Create new branch if requested
    if (options.createBranch && options.branchName) {
      try {
        await gitOperationsService.createBranch(
          userId,
          provider_id,
          repository.owner,
          repository.name,
          options.branchName,
          repository.default_branch
        );
        targetBranch = options.branchName;
      } catch (error: any) {
        // Branch might already exist, try to use it anyway
        if (!error.message?.includes('already exists')) {
          throw error;
        }
        targetBranch = options.branchName;
      }
    }

    // Push each document
    for (const doc of documents) {
      const result = await this.pushDocument(
        tenantId,
        projectId,
        userId,
        doc.section_id,
        doc.content,
        {
          ...options,
          branch: targetBranch,
          commitMessage: options.commitMessage ||
            `docs: update ${this.getSectionInfo(doc.section_id)?.name || doc.section_id}`,
        }
      );
      results.push(result);
    }

    // Update last sync timestamp
    const currentSettings = (project.settings as any) || {};
    await projectsService.update(tenantId, projectId, {
      settings: {
        ...currentSettings,
        git: {
          ...gitSettings,
          last_sync_at: new Date().toISOString(),
        },
      },
    });

    // Create PR if requested
    let pullRequest: PullRequest | undefined;
    if (options.createPR && options.branchName && targetBranch !== repository.default_branch) {
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        try {
          pullRequest = await gitOperationsService.createPullRequest(
            userId,
            provider_id,
            repository.owner,
            repository.name,
            options.prTitle || `Documentation update for ${project.name}`,
            options.prDescription || this.generatePRDescription(results, project.name),
            targetBranch,
            repository.default_branch
          );
        } catch (error: any) {
          console.error('[DocSync] Failed to create PR:', error);
          // Don't fail the whole operation if PR creation fails
        }
      }
    }

    return { results, pullRequest };
  }

  /**
   * Push a single document to the repository using draft git settings (no project lookup).
   */
  async pushDraftDocument(
    userId: string,
    git: DraftGitSettings,
    productName: string,
    sectionId: string,
    content: string
  ): Promise<SyncResult> {
    const sectionInfo = this.getSectionInfo(sectionId);
    const filePath = this.getDocPath(sectionId, git.docs_path);

    try {
      const markdown = this.generateMarkdown(content, sectionId, productName);

      // Check if content actually changed before pushing
      const changed = await this.hasContentChanged(userId, git.provider_id, git.repo_owner, git.repo_name, filePath, markdown, git.default_branch);
      if (!changed) {
        return {
          success: true,
          section_id: sectionId,
          section_name: sectionInfo?.name || sectionId,
          file_path: filePath,
          action: 'skipped',
        };
      }

      const commitMessage = `docs: update ${sectionInfo?.name || sectionId}`;

      const commit = await gitOperationsService.pushFile(
        userId,
        git.provider_id,
        git.repo_owner,
        git.repo_name,
        filePath,
        markdown,
        commitMessage,
        git.default_branch
      );

      return {
        success: true,
        section_id: sectionId,
        section_name: sectionInfo?.name || sectionId,
        file_path: filePath,
        action: 'updated',
        commit,
      };
    } catch (error: any) {
      return {
        success: false,
        section_id: sectionId,
        section_name: sectionInfo?.name || sectionId,
        file_path: filePath,
        action: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Generate a Table of Contents README.md content for the docs folder.
   */
  generateToc(
    productName: string,
    sections: Record<string, { content: string }>,
    docsPath: string
  ): string {
    const timestamp = new Date().toISOString();
    let md = `# ${productName} - Documentation\n\n`;
    md += `> Generated by Infinia Product Suite\n`;
    md += `> Last updated: ${timestamp}\n\n`;
    md += `## Table of Contents\n\n`;
    md += `| # | Document | File | Status |\n`;
    md += `|---|----------|------|--------|\n`;

    const entries = Object.entries(DOCUMENT_SECTIONS);
    entries.forEach(([sectionId, info], idx) => {
      const hasContent = sections[sectionId]?.content;
      const status = hasContent ? 'Ready' : 'Pending';
      const docLink = hasContent
        ? `[${info.name}](./${info.filename})`
        : info.name;
      md += `| ${idx + 1} | ${docLink} | \`${info.filename}\` | ${status} |\n`;
    });

    // Mermaid pie chart showing documentation progress
    const readyCount = entries.filter(([id]) => sections[id]?.content).length;
    const pendingCount = entries.length - readyCount;
    if (readyCount > 0 || pendingCount > 0) {
      md += `\n## Documentation Progress\n\n`;
      md += `\`\`\`mermaid\npie title Documentation Status\n`;
      if (readyCount > 0) md += `    "Ready" : ${readyCount}\n`;
      if (pendingCount > 0) md += `    "Pending" : ${pendingCount}\n`;
      md += `\`\`\`\n\n`;
    }

    md += `## Document Summaries\n\n`;

    for (const [sectionId, info] of entries) {
      const section = sections[sectionId];
      if (section?.content) {
        // Strip HTML tags and take first 200 chars for summary
        const plainText = section.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
        md += `### ${info.name}\n${summary}\n\n`;
      }
    }

    md += `---\n*Documentation managed by Infinia Product Suite*\n`;
    return md;
  }

  /**
   * Push TOC README.md for a draft session. Serialized per-session to avoid concurrent pushes.
   */
  private tocQueue = new Map<string, Promise<void>>();

  async pushTocForDraft(
    userId: string,
    git: DraftGitSettings,
    productName: string,
    sections: Record<string, { content: string }>
  ): Promise<void> {
    const queueKey = `${git.repo_owner}/${git.repo_name}/${git.docs_path}`;

    const prev = this.tocQueue.get(queueKey) || Promise.resolve();
    const next = prev.then(async () => {
      try {
        const tocContent = this.generateToc(productName, sections, git.docs_path);
        const docsPath = git.docs_path.endsWith('/') ? git.docs_path : `${git.docs_path}/`;
        const filePath = `${docsPath}README.md`;

        // Only push TOC if content actually changed
        const changed = await this.hasContentChanged(userId, git.provider_id, git.repo_owner, git.repo_name, filePath, tocContent, git.default_branch);
        if (!changed) return;

        await gitOperationsService.pushFile(
          userId,
          git.provider_id,
          git.repo_owner,
          git.repo_name,
          filePath,
          tocContent,
          `docs: update table of contents`,
          git.default_branch
        );
      } catch (error: any) {
        console.error('[DocSync] Failed to push TOC:', error.message);
      }
    });

    this.tocQueue.set(queueKey, next);
    await next;
  }

  /**
   * Generate PR description from sync results
   */
  private generatePRDescription(results: SyncResult[], projectName: string): string {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let description = `## Documentation Sync for ${projectName}\n\n`;
    description += `This PR contains documentation updates synced from the Infinia platform.\n\n`;

    if (successful.length > 0) {
      description += `### Updated Documents\n`;
      for (const r of successful) {
        description += `- [x] ${r.section_name} (\`${r.file_path}\`)\n`;
      }
      description += '\n';
    }

    if (failed.length > 0) {
      description += `### Failed Updates\n`;
      for (const r of failed) {
        description += `- [ ] ${r.section_name}: ${r.error}\n`;
      }
      description += '\n';
    }

    description += `---\n*Synced automatically from Infinia Platform*`;
    return description;
  }
}

export const docSyncService = new DocSyncService();
export default docSyncService;
