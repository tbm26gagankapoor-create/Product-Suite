import { query } from '../client.js';

export interface DomainWhitelist {
  id: string;
  domain: string;
  domain_type: 'email_domain' | 'entra_tenant';
  tenant_id: string | null;
  is_active: boolean;
  notes: string | null;
  added_by_admin_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDomainWhitelistInput {
  domain: string;
  domain_type?: 'email_domain' | 'entra_tenant';
  tenant_id?: string;
  notes?: string;
  added_by_admin_id?: string;
}

export interface UpdateDomainWhitelistInput {
  domain?: string;
  domain_type?: 'email_domain' | 'entra_tenant';
  tenant_id?: string | null;
  is_active?: boolean;
  notes?: string;
}

export const domainWhitelistRepository = {
  async findById(id: string): Promise<DomainWhitelist | null> {
    const result = await query<DomainWhitelist>(
      'SELECT * FROM domain_whitelist WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByDomain(domain: string, domainType: 'email_domain' | 'entra_tenant' = 'email_domain'): Promise<DomainWhitelist | null> {
    const result = await query<DomainWhitelist>(
      'SELECT * FROM domain_whitelist WHERE LOWER(domain) = LOWER($1) AND domain_type = $2 AND is_active = true',
      [domain, domainType]
    );
    return result.rows[0] || null;
  },

  async findAll(includeInactive = false): Promise<DomainWhitelist[]> {
    const sql = includeInactive
      ? 'SELECT * FROM domain_whitelist ORDER BY created_at DESC'
      : 'SELECT * FROM domain_whitelist WHERE is_active = true ORDER BY created_at DESC';
    const result = await query<DomainWhitelist>(sql);
    return result.rows;
  },

  async findByTenant(tenantId: string): Promise<DomainWhitelist[]> {
    const result = await query<DomainWhitelist>(
      'SELECT * FROM domain_whitelist WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows;
  },

  async create(input: CreateDomainWhitelistInput): Promise<DomainWhitelist> {
    const result = await query<DomainWhitelist>(
      `INSERT INTO domain_whitelist (domain, domain_type, tenant_id, notes, added_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.domain.toLowerCase(),
        input.domain_type || 'email_domain',
        input.tenant_id || null,
        input.notes || null,
        input.added_by_admin_id || null,
      ]
    );
    return result.rows[0];
  },

  async update(id: string, input: UpdateDomainWhitelistInput): Promise<DomainWhitelist | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.domain !== undefined) {
      fields.push(`domain = $${paramIndex++}`);
      values.push(input.domain.toLowerCase());
    }
    if (input.domain_type !== undefined) {
      fields.push(`domain_type = $${paramIndex++}`);
      values.push(input.domain_type);
    }
    if (input.tenant_id !== undefined) {
      fields.push(`tenant_id = $${paramIndex++}`);
      values.push(input.tenant_id);
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(input.notes);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<DomainWhitelist>(
      `UPDATE domain_whitelist SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM domain_whitelist WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async isDomainWhitelisted(emailDomain: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) FROM domain_whitelist WHERE LOWER(domain) = LOWER($1) AND domain_type = $2 AND is_active = true',
      [emailDomain, 'email_domain']
    );
    return parseInt(result.rows[0].count, 10) > 0;
  },

  async isEntraTenantWhitelisted(entraTenantId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) FROM domain_whitelist WHERE LOWER(domain) = LOWER($1) AND domain_type = $2 AND is_active = true',
      [entraTenantId, 'entra_tenant']
    );
    return parseInt(result.rows[0].count, 10) > 0;
  },

  async isWhitelisted(emailDomain: string, entraTenantId?: string): Promise<{ allowed: boolean; matchedEntry?: DomainWhitelist }> {
    // Check email domain first
    const domainMatch = await this.findByDomain(emailDomain, 'email_domain');
    if (domainMatch) {
      return { allowed: true, matchedEntry: domainMatch };
    }

    // Check Entra tenant ID if provided
    if (entraTenantId) {
      const tenantMatch = await this.findByDomain(entraTenantId, 'entra_tenant');
      if (tenantMatch) {
        return { allowed: true, matchedEntry: tenantMatch };
      }
    }

    return { allowed: false };
  },

  async count(): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) FROM domain_whitelist WHERE is_active = true'
    );
    return parseInt(result.rows[0].count, 10);
  },
};

export default domainWhitelistRepository;
