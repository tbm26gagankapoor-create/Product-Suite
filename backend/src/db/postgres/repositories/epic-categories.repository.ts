import { query } from '../client.js';

export interface EpicCategory {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  minimum_tasks: number;
  order_index: number;
  is_enabled: boolean;
  prompt_guidance: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateEpicCategoryInput {
  display_name?: string;
  description?: string;
  minimum_tasks?: number;
  order_index?: number;
  is_enabled?: boolean;
  prompt_guidance?: string;
  metadata?: Record<string, any>;
}

export interface CreateEpicCategoryInput {
  name: string;
  display_name: string;
  description?: string;
  minimum_tasks?: number;
  order_index: number;
  prompt_guidance?: string;
}

/**
 * Epic Categories Repository
 * Manages the 14-category system for project plan generation
 * Pattern: Stateless singleton with parameterized pool queries
 */
export const epicCategoriesRepository = {
  /**
   * Get all epic categories ordered by execution order
   */
  async findAll(): Promise<EpicCategory[]> {
    const result = await query<EpicCategory>(
      'SELECT * FROM epic_categories ORDER BY order_index'
    );
    return result.rows;
  },

  /**
   * Get only enabled categories (used in batch execution)
   */
  async findAllEnabled(): Promise<EpicCategory[]> {
    const result = await query<EpicCategory>(
      'SELECT * FROM epic_categories WHERE is_enabled = true ORDER BY order_index'
    );
    return result.rows;
  },

  /**
   * Get single category by ID
   */
  async findById(id: string): Promise<EpicCategory | null> {
    const result = await query<EpicCategory>(
      'SELECT * FROM epic_categories WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get single category by unique name
   */
  async findByName(name: string): Promise<EpicCategory | null> {
    const result = await query<EpicCategory>(
      'SELECT * FROM epic_categories WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  },

  /**
   * Update category fields
   * Only updates provided fields, others remain unchanged
   */
  async update(id: string, input: UpdateEpicCategoryInput): Promise<EpicCategory | null> {
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
    if (input.minimum_tasks !== undefined) {
      fields.push(`minimum_tasks = $${paramIndex++}`);
      values.push(input.minimum_tasks);
    }
    if (input.order_index !== undefined) {
      fields.push(`order_index = $${paramIndex++}`);
      values.push(input.order_index);
    }
    if (input.is_enabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      values.push(input.is_enabled);
    }
    if (input.prompt_guidance !== undefined) {
      fields.push(`prompt_guidance = $${paramIndex++}`);
      values.push(input.prompt_guidance);
    }
    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    // No fields to update
    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<EpicCategory>(
      `UPDATE epic_categories
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  /**
   * Create new custom category
   * Used by admins to extend beyond the default 14
   */
  async create(input: CreateEpicCategoryInput): Promise<EpicCategory> {
    const result = await query<EpicCategory>(
      `INSERT INTO epic_categories
       (name, display_name, description, minimum_tasks, order_index, prompt_guidance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.name,
        input.display_name,
        input.description || null,
        input.minimum_tasks ?? 8,
        input.order_index,
        input.prompt_guidance || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Delete category by ID
   * Returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM epic_categories WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

export default epicCategoriesRepository;
