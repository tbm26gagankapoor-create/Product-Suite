import { query } from '../client.js';

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  is_secret: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export const adminRepository = {
  // =====================================================
  // ADMIN USERS
  // =====================================================

  async findAdminById(id: string): Promise<AdminUser | null> {
    const result = await query<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findAdminByEmail(email: string): Promise<AdminUser | null> {
    const result = await query<AdminUser>(
      'SELECT * FROM admin_users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  },

  async findAllAdmins(): Promise<AdminUser[]> {
    const result = await query<AdminUser>(
      'SELECT * FROM admin_users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async createAdmin(input: {
    email: string;
    password_hash?: string | null;
    name: string;
    role?: string;
  }): Promise<AdminUser> {
    const result = await query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email.toLowerCase(), input.password_hash || null, input.name, input.role || 'admin']
    );
    return result.rows[0];
  },

  async updateAdmin(id: string, input: Partial<AdminUser>): Promise<AdminUser | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(input.email.toLowerCase());
    }
    if (input.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(input.password_hash);
    }
    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(input.role);
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (fields.length === 0) return this.findAdminById(id);

    values.push(id);
    const result = await query<AdminUser>(
      `UPDATE admin_users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async updateAdminLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await query('DELETE FROM admin_users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  // =====================================================
  // SYSTEM SETTINGS
  // =====================================================

  async getAllSettings(): Promise<SystemSetting[]> {
    const result = await query<SystemSetting>(
      'SELECT * FROM system_settings ORDER BY key'
    );
    return result.rows;
  },

  async getSetting(key: string): Promise<any> {
    const result = await query<SystemSetting>(
      'SELECT * FROM system_settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value ?? null;
  },

  async setSetting(key: string, value: any, description?: string): Promise<SystemSetting> {
    const result = await query<SystemSetting>(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), description]
    );
    return result.rows[0];
  },

  async deleteSetting(key: string): Promise<boolean> {
    const result = await query('DELETE FROM system_settings WHERE key = $1', [key]);
    return (result.rowCount ?? 0) > 0;
  },

  // =====================================================
  // AUDIT LOG
  // =====================================================

  async logAction(input: {
    admin_id?: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<AuditLogEntry> {
    const result = await query<AuditLogEntry>(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.admin_id || null,
        input.action,
        input.entity_type || null,
        input.entity_id || null,
        JSON.stringify(input.details || {}),
        input.ip_address || null,
        input.user_agent || null,
      ]
    );
    return result.rows[0];
  },

  async getAuditLog(options: {
    limit?: number;
    offset?: number;
    admin_id?: string;
    action?: string;
  } = {}): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (options.admin_id) {
      conditions.push(`admin_id = $${paramIndex++}`);
      values.push(options.admin_id);
    }
    if (options.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(options.action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    values.push(limit, offset);
    const result = await query<AuditLogEntry>(
      `SELECT * FROM admin_audit_log ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );
    return result.rows;
  },
};

export default adminRepository;
