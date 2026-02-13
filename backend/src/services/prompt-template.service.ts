/**
 * Prompt Template Service
 * Manage AI prompts with version control and rollback capability
 * Matches actual Vulcan PM database schema
 */

import { query } from '../db/postgres/client.js';

export interface PromptTemplate {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string;
  template_body: string;
  variables: any;
  metadata: any;
  is_active: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface PromptTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  variables: any;
  metadata: any;
  change_note: string;
  created_by: string;
  created_at: Date;
}

export const promptTemplateService = {
  /**
   * Get all prompt templates
   */
  async listTemplates(params: {
    category?: string;
    activeOnly?: boolean;
  } = {}): Promise<PromptTemplate[]> {
    const { category, activeOnly = false } = params;

    let sql = 'SELECT * FROM prompt_templates WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      values.push(category);
    }

    if (activeOnly) {
      sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY category, name`;

    const result = await query(sql, values);
    return result.rows;
  },

  /**
   * Get prompt template by ID
   */
  async getTemplate(templateId: string): Promise<PromptTemplate | null> {
    const result = await query(
      `SELECT * FROM prompt_templates WHERE id = $1`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  },

  /**
   * Get prompt template by name
   */
  async getTemplateByName(name: string): Promise<PromptTemplate | null> {
    const result = await query(
      `SELECT * FROM prompt_templates WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  },

  /**
   * Create new prompt template with first version
   */
  async createTemplate(params: {
    name: string;
    displayName: string;
    description: string;
    category: string;
    initialContent: string;
    variables?: string[];
    metadata?: any;
    createdBy: string;
    changeNote?: string;
  }): Promise<{ template: PromptTemplate; version: PromptTemplateVersion }> {
    const {
      name,
      displayName,
      description,
      category,
      initialContent,
      variables = [],
      metadata = {},
      createdBy,
      changeNote = 'Initial version'
    } = params;

    try {
      // Create template
      const templateResult = await query(
        `INSERT INTO prompt_templates (
          name, display_name, category, description, template_body, variables, metadata, is_active, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 1)
        RETURNING *`,
        [name, displayName, category, description, initialContent, JSON.stringify(variables), JSON.stringify(metadata)]
      );

      const template = templateResult.rows[0];

      // Create first version
      const versionResult = await query(
        `INSERT INTO prompt_template_versions (
          template_id, version, template_body, variables, metadata, change_note, created_by
        ) VALUES ($1, 1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [template.id, initialContent, JSON.stringify(variables), JSON.stringify(metadata), changeNote, createdBy]
      );

      const version = versionResult.rows[0];

      console.log(`[Prompt Templates] Created template "${name}" v1`);

      return { template, version };

    } catch (error: any) {
      console.error('[Prompt Templates] Error creating template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  },

  /**
   * Create new version of existing template
   */
  async createVersion(params: {
    templateId: string;
    content: string;
    variables?: string[];
    metadata?: any;
    changeNote: string;
    createdBy: string;
    makeCurrent?: boolean;
  }): Promise<PromptTemplateVersion> {
    const { templateId, content, variables = [], metadata = {}, changeNote, createdBy, makeCurrent = true } = params;

    try {
      // Get latest version number
      const latestResult = await query(
        `SELECT MAX(version) as latest FROM prompt_template_versions WHERE template_id = $1`,
        [templateId]
      );

      const nextVersion = (latestResult.rows[0].latest || 0) + 1;

      // Create new version
      const versionResult = await query(
        `INSERT INTO prompt_template_versions (
          template_id, version, template_body, variables, metadata, change_note, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [templateId, nextVersion, content, JSON.stringify(variables), JSON.stringify(metadata), changeNote, createdBy]
      );

      const version = versionResult.rows[0];

      // Update template's current version if requested
      if (makeCurrent) {
        await query(
          `UPDATE prompt_templates
           SET version = $1, template_body = $2, variables = $3, metadata = $4, updated_at = NOW()
           WHERE id = $5`,
          [nextVersion, content, JSON.stringify(variables), JSON.stringify(metadata), templateId]
        );
      }

      console.log(`[Prompt Templates] Created version ${nextVersion} for template ${templateId}`);

      return version;

    } catch (error: any) {
      console.error('[Prompt Templates] Error creating version:', error);
      throw new Error(`Failed to create version: ${error.message}`);
    }
  },

  /**
   * Get all versions of a template
   */
  async getVersions(templateId: string): Promise<PromptTemplateVersion[]> {
    const result = await query(
      `SELECT * FROM prompt_template_versions
       WHERE template_id = $1
       ORDER BY version DESC`,
      [templateId]
    );

    return result.rows;
  },

  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<PromptTemplateVersion | null> {
    const result = await query(
      `SELECT * FROM prompt_template_versions WHERE id = $1`,
      [versionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  },

  /**
   * Get current version of a template
   */
  async getCurrentVersion(templateId: string): Promise<PromptTemplateVersion | null> {
    const result = await query(
      `SELECT v.* FROM prompt_templates t
       JOIN prompt_template_versions v ON v.template_id = t.id AND v.version = t.version
       WHERE t.id = $1`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  },

  /**
   * Rollback to a previous version (set it as current)
   */
  async rollbackToVersion(params: {
    templateId: string;
    versionNumber: number;
    rolledBackBy: string;
  }): Promise<void> {
    const { templateId, versionNumber, rolledBackBy } = params;

    try {
      // Get the version to rollback to
      const versionResult = await query(
        `SELECT * FROM prompt_template_versions
         WHERE template_id = $1 AND version = $2`,
        [templateId, versionNumber]
      );

      if (versionResult.rows.length === 0) {
        throw new Error('Version not found for this template');
      }

      const targetVersion = versionResult.rows[0];

      // Update template to use this version (variables/metadata are already JSONB objects from DB)
      await query(
        `UPDATE prompt_templates
         SET version = $1, template_body = $2, variables = $3::jsonb, metadata = $4::jsonb, updated_at = NOW()
         WHERE id = $5`,
        [targetVersion.version, targetVersion.template_body, JSON.stringify(targetVersion.variables), JSON.stringify(targetVersion.metadata), templateId]
      );

      console.log(`[Prompt Templates] Rolled back template ${templateId} to version ${versionNumber} by ${rolledBackBy}`);

    } catch (error: any) {
      console.error('[Prompt Templates] Error rolling back version:', error);
      throw new Error(`Failed to rollback: ${error.message}`);
    }
  },

  /**
   * Update template metadata (not content - that requires new version)
   */
  async updateTemplate(params: {
    templateId: string;
    name?: string;
    displayName?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<PromptTemplate> {
    const { templateId, name, displayName, description, category, isActive } = params;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (displayName !== undefined) {
      paramCount++;
      updates.push(`display_name = $${paramCount}`);
      values.push(displayName);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (category !== undefined) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      values.push(category);
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    paramCount++;
    values.push(templateId);

    const result = await query(
      `UPDATE prompt_templates
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Template not found');
    }

    return result.rows[0];
  },

  /**
   * Delete template (soft delete by marking inactive)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await query(
      `UPDATE prompt_templates SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [templateId]
    );

    console.log(`[Prompt Templates] Deleted (deactivated) template ${templateId}`);
  },

  /**
   * Render template with variables substituted
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    let rendered = template;

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }
};
