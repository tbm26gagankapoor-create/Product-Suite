import { query } from '../client.js';

export interface PromptTemplate {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string | null;
  template_body: string;
  variables: TemplateVariable[];
  metadata: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  variables: TemplateVariable[];
  metadata: Record<string, any>;
  change_note: string | null;
  created_by: string | null;
  created_at: Date;
}

export interface UpdatePromptTemplateInput {
  display_name?: string;
  description?: string;
  template_body?: string;
  variables?: TemplateVariable[];
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export const promptTemplatesRepository = {
  // =====================================================
  // TEMPLATES
  // =====================================================

  async findAll(): Promise<PromptTemplate[]> {
    const result = await query<PromptTemplate>(
      'SELECT * FROM prompt_templates ORDER BY category, display_name'
    );
    return result.rows;
  },

  async findAllActive(): Promise<PromptTemplate[]> {
    const result = await query<PromptTemplate>(
      'SELECT * FROM prompt_templates WHERE is_active = true ORDER BY category, display_name'
    );
    return result.rows;
  },

  async findById(id: string): Promise<PromptTemplate | null> {
    const result = await query<PromptTemplate>(
      'SELECT * FROM prompt_templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByName(name: string): Promise<PromptTemplate | null> {
    const result = await query<PromptTemplate>(
      'SELECT * FROM prompt_templates WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  },

  async findByCategory(category: string): Promise<PromptTemplate[]> {
    const result = await query<PromptTemplate>(
      'SELECT * FROM prompt_templates WHERE category = $1 ORDER BY display_name',
      [category]
    );
    return result.rows;
  },

  async update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(input.display_name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.template_body !== undefined) {
      fields.push(`template_body = $${paramIndex++}`);
      values.push(input.template_body);
    }
    if (input.variables !== undefined) {
      fields.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(input.variables));
    }
    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    // Always increment version when template_body changes
    if (input.template_body !== undefined) {
      fields.push('version = version + 1');
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<PromptTemplate>(
      `UPDATE prompt_templates SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async toggleActive(id: string, isActive: boolean): Promise<PromptTemplate | null> {
    const result = await query<PromptTemplate>(
      'UPDATE prompt_templates SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return result.rows[0] || null;
  },

  // =====================================================
  // VERSIONS
  // =====================================================

  async createVersion(input: {
    template_id: string;
    version: number;
    template_body: string;
    variables: TemplateVariable[];
    metadata: Record<string, any>;
    change_note?: string;
    created_by?: string;
  }): Promise<PromptTemplateVersion> {
    const result = await query<PromptTemplateVersion>(
      `INSERT INTO prompt_template_versions
       (template_id, version, template_body, variables, metadata, change_note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.template_id,
        input.version,
        input.template_body,
        JSON.stringify(input.variables),
        JSON.stringify(input.metadata),
        input.change_note || null,
        input.created_by || null,
      ]
    );
    return result.rows[0];
  },

  async findVersionsByTemplate(templateId: string): Promise<PromptTemplateVersion[]> {
    const result = await query<PromptTemplateVersion>(
      'SELECT * FROM prompt_template_versions WHERE template_id = $1 ORDER BY version DESC',
      [templateId]
    );
    return result.rows;
  },

  async findVersion(templateId: string, version: number): Promise<PromptTemplateVersion | null> {
    const result = await query<PromptTemplateVersion>(
      'SELECT * FROM prompt_template_versions WHERE template_id = $1 AND version = $2',
      [templateId, version]
    );
    return result.rows[0] || null;
  },
};

export default promptTemplatesRepository;
