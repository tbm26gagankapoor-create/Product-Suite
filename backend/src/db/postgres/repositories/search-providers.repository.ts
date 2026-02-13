import { query } from '../client.js';

export interface SearchProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  is_default: boolean;
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateSearchProviderInput {
  display_name?: string;
  api_endpoint?: string;
  api_key_encrypted?: string;
  is_enabled?: boolean;
  is_default?: boolean;
  config?: Record<string, any>;
}

export const searchProvidersRepository = {
  async findAll(): Promise<SearchProvider[]> {
    const result = await query<SearchProvider>(
      'SELECT * FROM search_providers ORDER BY display_name'
    );
    return result.rows;
  },

  async findById(id: string): Promise<SearchProvider | null> {
    const result = await query<SearchProvider>(
      'SELECT * FROM search_providers WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByName(name: string): Promise<SearchProvider | null> {
    const result = await query<SearchProvider>(
      'SELECT * FROM search_providers WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  },

  async findEnabled(): Promise<SearchProvider[]> {
    const result = await query<SearchProvider>(
      'SELECT * FROM search_providers WHERE is_enabled = true ORDER BY display_name'
    );
    return result.rows;
  },

  async findDefault(): Promise<SearchProvider | null> {
    const result = await query<SearchProvider>(
      'SELECT * FROM search_providers WHERE is_default = true AND is_enabled = true LIMIT 1'
    );
    return result.rows[0] || null;
  },

  async update(id: string, input: UpdateSearchProviderInput): Promise<SearchProvider | null> {
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
      if (input.is_default) {
        await query('UPDATE search_providers SET is_default = false WHERE is_default = true');
      }
      fields.push(`is_default = $${paramIndex++}`);
      values.push(input.is_default);
    }
    if (input.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(input.config));
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<SearchProvider>(
      `UPDATE search_providers SET ${fields.join(', ')}, updated_at = NOW()
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
  }): Promise<SearchProvider> {
    const result = await query<SearchProvider>(
      `INSERT INTO search_providers
       (name, display_name, provider_type, api_endpoint, api_key_encrypted, is_enabled, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.name,
        input.display_name,
        input.provider_type,
        input.api_endpoint || null,
        input.api_key_encrypted || null,
        input.is_enabled ?? false,
        JSON.stringify(input.config || {}),
      ]
    );
    return result.rows[0];
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM search_providers WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

export default searchProvidersRepository;
