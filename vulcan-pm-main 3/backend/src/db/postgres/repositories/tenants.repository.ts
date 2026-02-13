import { query } from '../client.js';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  plan_id: string | null;
  subscription_status: string;
  subscription_started_at: Date | null;
  subscription_ends_at: Date | null;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  plan_id?: string;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  domain?: string;
  logo_url?: string;
  plan_id?: string;
  subscription_status?: string;
  subscription_started_at?: Date;
  subscription_ends_at?: Date;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export const tenantsRepository = {
  async findById(id: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      'SELECT * FROM tenants WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findBySlug(slug: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      'SELECT * FROM tenants WHERE slug = $1',
      [slug]
    );
    return result.rows[0] || null;
  },

  async findByDomain(domain: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      'SELECT * FROM tenants WHERE domain = $1',
      [domain]
    );
    return result.rows[0] || null;
  },

  async findAll(limit = 100, offset = 0): Promise<Tenant[]> {
    const result = await query<Tenant>(
      'SELECT * FROM tenants WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  },

  async create(input: CreateTenantInput): Promise<Tenant> {
    const result = await query<Tenant>(
      `INSERT INTO tenants (name, slug, domain, logo_url, plan_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.name,
        input.slug.toLowerCase(),
        input.domain || null,
        input.logo_url || null,
        input.plan_id || null,
      ]
    );
    return result.rows[0];
  },

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.slug !== undefined) {
      fields.push(`slug = $${paramIndex++}`);
      values.push(input.slug.toLowerCase());
    }
    if (input.domain !== undefined) {
      fields.push(`domain = $${paramIndex++}`);
      values.push(input.domain);
    }
    if (input.logo_url !== undefined) {
      fields.push(`logo_url = $${paramIndex++}`);
      values.push(input.logo_url);
    }
    if (input.plan_id !== undefined) {
      fields.push(`plan_id = $${paramIndex++}`);
      values.push(input.plan_id);
    }
    if (input.subscription_status !== undefined) {
      fields.push(`subscription_status = $${paramIndex++}`);
      values.push(input.subscription_status);
    }
    if (input.subscription_started_at !== undefined) {
      fields.push(`subscription_started_at = $${paramIndex++}`);
      values.push(input.subscription_started_at);
    }
    if (input.subscription_ends_at !== undefined) {
      fields.push(`subscription_ends_at = $${paramIndex++}`);
      values.push(input.subscription_ends_at);
    }
    if (input.settings !== undefined) {
      fields.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(input.settings));
    }
    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<Tenant>(
      `UPDATE tenants SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async hardDelete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM tenants WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async count(): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) FROM tenants WHERE is_active = true'
    );
    return parseInt(result.rows[0].count, 10);
  },
};

export default tenantsRepository;
