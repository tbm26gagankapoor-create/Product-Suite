import { query } from '../client.js';

export interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  is_default: boolean;
  config: Record<string, any>;
  rate_limits: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AIProviderModel {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  model_type: string;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  is_enabled: boolean;
  capabilities: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UpdateAIProviderInput {
  display_name?: string;
  api_endpoint?: string;
  api_key_encrypted?: string;
  is_enabled?: boolean;
  is_default?: boolean;
  config?: Record<string, any>;
  rate_limits?: Record<string, any>;
}

export const aiProvidersRepository = {
  // =====================================================
  // PROVIDERS
  // =====================================================

  async findAll(): Promise<AIProvider[]> {
    const result = await query<AIProvider>(
      'SELECT * FROM ai_providers ORDER BY display_name'
    );
    return result.rows;
  },

  async findById(id: string): Promise<AIProvider | null> {
    const result = await query<AIProvider>(
      'SELECT * FROM ai_providers WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByName(name: string): Promise<AIProvider | null> {
    const result = await query<AIProvider>(
      'SELECT * FROM ai_providers WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  },

  async findEnabled(): Promise<AIProvider[]> {
    const result = await query<AIProvider>(
      'SELECT * FROM ai_providers WHERE is_enabled = true ORDER BY display_name'
    );
    return result.rows;
  },

  async findDefault(): Promise<AIProvider | null> {
    const result = await query<AIProvider>(
      'SELECT * FROM ai_providers WHERE is_default = true AND is_enabled = true LIMIT 1'
    );
    return result.rows[0] || null;
  },

  async update(id: string, input: UpdateAIProviderInput): Promise<AIProvider | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(input.display_name);
    }
    if (input.api_endpoint !== undefined) {
      fields.push(`api_endpoint = $${paramIndex++}`);
      values.push(input.api_endpoint);
    }
    if (input.api_key_encrypted !== undefined) {
      fields.push(`api_key_encrypted = $${paramIndex++}`);
      values.push(input.api_key_encrypted);
    }
    if (input.is_enabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      values.push(input.is_enabled);
    }
    if (input.is_default !== undefined) {
      // If setting as default, unset other defaults first
      if (input.is_default) {
        await query('UPDATE ai_providers SET is_default = false WHERE is_default = true');
      }
      fields.push(`is_default = $${paramIndex++}`);
      values.push(input.is_default);
    }
    if (input.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(input.config));
    }
    if (input.rate_limits !== undefined) {
      fields.push(`rate_limits = $${paramIndex++}`);
      values.push(JSON.stringify(input.rate_limits));
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<AIProvider>(
      `UPDATE ai_providers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async create(input: {
    name: string;
    display_name: string;
    provider_type: string;
    api_endpoint?: string;
    api_key_encrypted?: string;
    is_enabled?: boolean;
    config?: Record<string, any>;
    created_by_admin_id?: string;
  }): Promise<AIProvider> {
    const result = await query<AIProvider>(
      `INSERT INTO ai_providers
       (name, display_name, provider_type, api_endpoint, api_key_encrypted, is_enabled, config, is_custom, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING *`,
      [
        input.name,
        input.display_name,
        input.provider_type,
        input.api_endpoint || null,
        input.api_key_encrypted || null,
        input.is_enabled ?? false,
        JSON.stringify(input.config || {}),
        input.created_by_admin_id || null,
      ]
    );
    return result.rows[0];
  },

  async delete(id: string): Promise<boolean> {
    // Only allow deleting custom providers
    const result = await query(
      'DELETE FROM ai_providers WHERE id = $1 AND is_custom = true',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // =====================================================
  // MODELS
  // =====================================================

  async findModelsByProvider(providerId: string): Promise<AIProviderModel[]> {
    const result = await query<AIProviderModel>(
      'SELECT * FROM ai_provider_models WHERE provider_id = $1 ORDER BY display_name',
      [providerId]
    );
    return result.rows;
  },

  async findModelById(id: string): Promise<AIProviderModel | null> {
    const result = await query<AIProviderModel>(
      'SELECT * FROM ai_provider_models WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findEnabledModels(): Promise<(AIProviderModel & { provider_name: string })[]> {
    const result = await query<AIProviderModel & { provider_name: string }>(
      `SELECT m.*, p.name as provider_name
       FROM ai_provider_models m
       JOIN ai_providers p ON m.provider_id = p.id
       WHERE m.is_enabled = true AND p.is_enabled = true
       ORDER BY p.display_name, m.display_name`
    );
    return result.rows;
  },

  async updateModel(id: string, input: Partial<AIProviderModel>): Promise<AIProviderModel | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(input.display_name);
    }
    if (input.is_enabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      values.push(input.is_enabled);
    }
    if (input.context_window !== undefined) {
      fields.push(`context_window = $${paramIndex++}`);
      values.push(input.context_window);
    }
    if (input.max_output_tokens !== undefined) {
      fields.push(`max_output_tokens = $${paramIndex++}`);
      values.push(input.max_output_tokens);
    }
    if (input.input_cost_per_1k !== undefined) {
      fields.push(`input_cost_per_1k = $${paramIndex++}`);
      values.push(input.input_cost_per_1k);
    }
    if (input.output_cost_per_1k !== undefined) {
      fields.push(`output_cost_per_1k = $${paramIndex++}`);
      values.push(input.output_cost_per_1k);
    }

    if (fields.length === 0) return this.findModelById(id);

    values.push(id);
    const result = await query<AIProviderModel>(
      `UPDATE ai_provider_models SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async createModel(input: Omit<AIProviderModel, 'id' | 'created_at' | 'updated_at'>): Promise<AIProviderModel> {
    const result = await query<AIProviderModel>(
      `INSERT INTO ai_provider_models
       (provider_id, model_id, display_name, model_type, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, is_enabled, capabilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.provider_id,
        input.model_id,
        input.display_name,
        input.model_type,
        input.context_window,
        input.max_output_tokens,
        input.input_cost_per_1k,
        input.output_cost_per_1k,
        input.is_enabled,
        JSON.stringify(input.capabilities),
      ]
    );
    return result.rows[0];
  },

  async deleteModel(id: string): Promise<boolean> {
    const result = await query('DELETE FROM ai_provider_models WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },
};

export default aiProvidersRepository;
