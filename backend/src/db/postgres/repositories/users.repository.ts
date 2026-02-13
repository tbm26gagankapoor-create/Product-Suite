import { query, transaction } from '../client.js';

export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  email_verified: boolean;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  last_login_at: Date | null;
  login_count: number;
  preferences: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  tenant_id?: string;
  email: string;
  password_hash?: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  email_verified?: boolean;
  password_hash?: string;
  name?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const usersRepository = {
  async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    if (tenantId) {
      const result = await query<User>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id = $2',
        [email, tenantId]
      );
      return result.rows[0] || null;
    }
    const result = await query<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  },

  async findByTenant(tenantId: string): Promise<User[]> {
    const result = await query<User>(
      'SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows;
  },

  async findAll(limit = 100, offset = 0): Promise<User[]> {
    const result = await query<User>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  },

  async create(input: CreateUserInput): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (tenant_id, email, password_hash, name, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.tenant_id || null,
        input.email.toLowerCase(),
        input.password_hash || null,
        input.name,
        input.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.name)}`,
        input.role || 'member',
      ]
    );
    return result.rows[0];
  },

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(input.email.toLowerCase());
    }
    if (input.email_verified !== undefined) {
      fields.push(`email_verified = $${paramIndex++}`);
      values.push(input.email_verified);
    }
    if (input.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(input.password_hash);
    }
    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(input.avatar_url);
    }
    if (input.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(input.role);
    }
    if (input.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.preferences !== undefined) {
      fields.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(input.preferences));
    }
    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<User>(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1',
      [id]
    );
  },

  async count(tenantId?: string): Promise<number> {
    if (tenantId) {
      const result = await query<{ count: string }>(
        'SELECT COUNT(*) FROM users WHERE tenant_id = $1',
        [tenantId]
      );
      return parseInt(result.rows[0].count, 10);
    }
    const result = await query<{ count: string }>('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
  },
};

export default usersRepository;
