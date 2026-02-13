import { query } from '../client.js';

export interface SSOConnection {
  id: string;
  tenant_id: string;
  name: string;
  provider: 'saml' | 'oidc' | 'google' | 'microsoft' | 'okta' | 'auth0';
  is_enabled: boolean;
  is_default: boolean;
  client_id: string | null;
  client_secret_encrypted: string | null;
  issuer_url: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  jwks_url: string | null;
  scopes: string;
  idp_entity_id: string | null;
  idp_sso_url: string | null;
  idp_certificate: string | null;
  sp_entity_id: string | null;
  attribute_mapping: Record<string, string>;
  auto_provision_users: boolean;
  default_role: string;
  allowed_domains: string[] | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSSOConnectionInput {
  tenant_id: string;
  name: string;
  provider: SSOConnection['provider'];
  client_id?: string;
  client_secret_encrypted?: string;
  issuer_url?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  scopes?: string;
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_certificate?: string;
  sp_entity_id?: string;
  attribute_mapping?: Record<string, string>;
  auto_provision_users?: boolean;
  default_role?: string;
  allowed_domains?: string[];
}

export interface UpdateSSOConnectionInput {
  name?: string;
  is_enabled?: boolean;
  is_default?: boolean;
  client_id?: string;
  client_secret_encrypted?: string;
  issuer_url?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  scopes?: string;
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_certificate?: string;
  sp_entity_id?: string;
  attribute_mapping?: Record<string, string>;
  auto_provision_users?: boolean;
  default_role?: string;
  allowed_domains?: string[];
}

export const ssoRepository = {
  async findById(id: string): Promise<SSOConnection | null> {
    const result = await query<SSOConnection>(
      'SELECT * FROM sso_connections WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByTenant(tenantId: string): Promise<SSOConnection[]> {
    const result = await query<SSOConnection>(
      'SELECT * FROM sso_connections WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows;
  },

  async findDefault(tenantId: string): Promise<SSOConnection | null> {
    const result = await query<SSOConnection>(
      'SELECT * FROM sso_connections WHERE tenant_id = $1 AND is_default = true AND is_enabled = true LIMIT 1',
      [tenantId]
    );
    return result.rows[0] || null;
  },

  async findEnabled(tenantId: string): Promise<SSOConnection[]> {
    const result = await query<SSOConnection>(
      'SELECT * FROM sso_connections WHERE tenant_id = $1 AND is_enabled = true ORDER BY is_default DESC',
      [tenantId]
    );
    return result.rows;
  },

  async create(input: CreateSSOConnectionInput): Promise<SSOConnection> {
    const result = await query<SSOConnection>(
      `INSERT INTO sso_connections (
        tenant_id, name, provider, client_id, client_secret_encrypted,
        issuer_url, authorization_url, token_url, userinfo_url, jwks_url,
        scopes, idp_entity_id, idp_sso_url, idp_certificate, sp_entity_id,
        attribute_mapping, auto_provision_users, default_role, allowed_domains
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        input.tenant_id,
        input.name,
        input.provider,
        input.client_id || null,
        input.client_secret_encrypted || null,
        input.issuer_url || null,
        input.authorization_url || null,
        input.token_url || null,
        input.userinfo_url || null,
        input.jwks_url || null,
        input.scopes || 'openid profile email',
        input.idp_entity_id || null,
        input.idp_sso_url || null,
        input.idp_certificate || null,
        input.sp_entity_id || null,
        JSON.stringify(input.attribute_mapping || { email: 'email', name: 'name' }),
        input.auto_provision_users ?? true,
        input.default_role || 'member',
        input.allowed_domains || null,
      ]
    );
    return result.rows[0];
  },

  async update(id: string, input: UpdateSSOConnectionInput): Promise<SSOConnection | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const simpleFields = [
      'name', 'is_enabled', 'is_default', 'client_id', 'client_secret_encrypted',
      'issuer_url', 'authorization_url', 'token_url', 'userinfo_url', 'jwks_url',
      'scopes', 'idp_entity_id', 'idp_sso_url', 'idp_certificate', 'sp_entity_id',
      'auto_provision_users', 'default_role'
    ];

    for (const field of simpleFields) {
      if ((input as any)[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push((input as any)[field]);
      }
    }

    if (input.attribute_mapping !== undefined) {
      fields.push(`attribute_mapping = $${paramIndex++}`);
      values.push(JSON.stringify(input.attribute_mapping));
    }
    if (input.allowed_domains !== undefined) {
      fields.push(`allowed_domains = $${paramIndex++}`);
      values.push(input.allowed_domains);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<SSOConnection>(
      `UPDATE sso_connections SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM sso_connections WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async setDefault(id: string, tenantId: string): Promise<void> {
    // First, unset all defaults for the tenant
    await query(
      'UPDATE sso_connections SET is_default = false WHERE tenant_id = $1',
      [tenantId]
    );
    // Then set the new default
    await query(
      'UPDATE sso_connections SET is_default = true WHERE id = $1',
      [id]
    );
  },

  // ===== Multi-Tenant Entra ID SSO =====

  async findEntraProvider(): Promise<SsoProvider | null> {
    const result = await query<SsoProvider>(
      'SELECT * FROM sso_providers WHERE provider_type = $1',
      ['entra_id']
    );
    return result.rows[0] || null;
  },

  async findProviderByType(providerType: string): Promise<SsoProvider | null> {
    const result = await query<SsoProvider>(
      'SELECT * FROM sso_providers WHERE provider_type = $1',
      [providerType]
    );
    return result.rows[0] || null;
  },

  async findEnabledProviders(): Promise<SsoProvider[]> {
    const result = await query<SsoProvider>(
      'SELECT * FROM sso_providers WHERE is_enabled = true ORDER BY display_order, name'
    );
    return result.rows;
  },

  async findAllProviders(): Promise<SsoProvider[]> {
    const result = await query<SsoProvider>(
      'SELECT * FROM sso_providers ORDER BY display_order, name'
    );
    return result.rows;
  },

  async findProviderById(id: string): Promise<SsoProvider | null> {
    const result = await query<SsoProvider>(
      'SELECT * FROM sso_providers WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async updateProvider(id: string, updates: {
    name?: string;
    display_name?: string;
    client_id?: string;
    client_secret_encrypted?: string;
    redirect_uri?: string;
    is_enabled?: boolean;
    tenant_id?: string;
    issuer_url?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    userinfo_endpoint?: string;
    scopes?: string;
    config?: Record<string, any>;
    icon_url?: string;
    display_order?: number;
  }): Promise<SsoProvider | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const simpleFields = [
      'name', 'display_name', 'client_id', 'client_secret_encrypted',
      'redirect_uri', 'is_enabled', 'tenant_id', 'issuer_url',
      'authorization_endpoint', 'token_endpoint', 'userinfo_endpoint',
      'scopes', 'icon_url', 'display_order'
    ];

    for (const field of simpleFields) {
      if ((updates as any)[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push((updates as any)[field]);
      }
    }

    if (updates.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) return this.findProviderById(id);

    values.push(id);
    const result = await query<SsoProvider>(
      `UPDATE sso_providers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async deleteProvider(id: string): Promise<boolean> {
    const result = await query('DELETE FROM sso_providers WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async updateEntraProvider(updates: {
    client_id?: string;
    is_enabled?: boolean;
    tenant_id?: string;
    scopes?: string;
  }): Promise<SsoProvider | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.client_id !== undefined) {
      fields.push(`client_id = $${paramIndex++}`);
      values.push(updates.client_id);
    }
    if (updates.is_enabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      values.push(updates.is_enabled);
    }
    if (updates.tenant_id !== undefined) {
      fields.push(`tenant_id = $${paramIndex++}`);
      values.push(updates.tenant_id);
    }
    if (updates.scopes !== undefined) {
      fields.push(`scopes = $${paramIndex++}`);
      values.push(updates.scopes);
    }

    if (fields.length === 0) return this.findEntraProvider();

    values.push('entra_id');
    const result = await query<SsoProvider>(
      `UPDATE sso_providers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE provider_type = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // ===== Organization Admin Consents =====

  async findConsentByEntraTenant(entraTenantId: string): Promise<SsoOrgConsent | null> {
    const result = await query<SsoOrgConsent>(
      `SELECT * FROM sso_org_consents
       WHERE entra_tenant_id = $1 AND is_active = true`,
      [entraTenantId]
    );
    return result.rows[0] || null;
  },

  async findConsentsByAppTenant(tenantId: string): Promise<SsoOrgConsent[]> {
    const result = await query<SsoOrgConsent>(
      'SELECT * FROM sso_org_consents WHERE tenant_id = $1 ORDER BY consented_at DESC',
      [tenantId]
    );
    return result.rows;
  },

  async createOrUpdateConsent(input: {
    provider_id: string;
    entra_tenant_id: string;
    organization_name?: string;
    verified_domains?: string[];
    tenant_id?: string;
    consented_by_email?: string;
    consented_by_name?: string;
    consented_by_oid?: string;
  }): Promise<SsoOrgConsent> {
    const result = await query<SsoOrgConsent>(
      `INSERT INTO sso_org_consents
       (provider_id, entra_tenant_id, organization_name, verified_domains,
        tenant_id, consented_by_email, consented_by_name, consented_by_oid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (provider_id, entra_tenant_id)
       DO UPDATE SET
         organization_name = EXCLUDED.organization_name,
         verified_domains = EXCLUDED.verified_domains,
         consented_by_email = EXCLUDED.consented_by_email,
         consented_by_name = EXCLUDED.consented_by_name,
         consented_by_oid = EXCLUDED.consented_by_oid,
         consented_at = NOW(),
         is_active = true,
         updated_at = NOW()
       RETURNING *`,
      [
        input.provider_id,
        input.entra_tenant_id,
        input.organization_name || null,
        JSON.stringify(input.verified_domains || []),
        input.tenant_id || null,
        input.consented_by_email || null,
        input.consented_by_name || null,
        input.consented_by_oid || null,
      ]
    );
    return result.rows[0];
  },

  async linkConsentToTenant(entraTenantId: string, tenantId: string): Promise<SsoOrgConsent | null> {
    const result = await query<SsoOrgConsent>(
      `UPDATE sso_org_consents SET tenant_id = $1, updated_at = NOW()
       WHERE entra_tenant_id = $2
       RETURNING *`,
      [tenantId, entraTenantId]
    );
    return result.rows[0] || null;
  },

  async revokeConsent(entraTenantId: string): Promise<boolean> {
    const result = await query(
      'UPDATE sso_org_consents SET is_active = false, updated_at = NOW() WHERE entra_tenant_id = $1',
      [entraTenantId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // ===== SSO User Operations =====

  async findUserBySso(ssoProvider: string, ssoSubjectId: string): Promise<SsoUser | null> {
    const result = await query<SsoUser>(
      `SELECT id, tenant_id, email, name, sso_provider, sso_subject_id, sso_tenant_id, auth_method
       FROM users
       WHERE sso_provider = $1 AND sso_subject_id = $2`,
      [ssoProvider, ssoSubjectId]
    );
    return result.rows[0] || null;
  },

  async findUserByEmailAndTenant(email: string, tenantId: string): Promise<SsoUser | null> {
    const result = await query<SsoUser>(
      `SELECT id, tenant_id, email, name, sso_provider, sso_subject_id, sso_tenant_id, auth_method
       FROM users
       WHERE LOWER(email) = LOWER($1) AND tenant_id = $2`,
      [email, tenantId]
    );
    return result.rows[0] || null;
  },

  async createSsoUser(input: {
    tenant_id: string;
    email: string;
    name: string;
    sso_provider: string;
    sso_subject_id: string;
    sso_tenant_id: string;
    role?: string;
    avatar_url?: string;
  }): Promise<SsoUser> {
    const result = await query<SsoUser>(
      `INSERT INTO users
       (tenant_id, email, name, sso_provider, sso_subject_id, sso_tenant_id, auth_method, role, avatar_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'sso', $7, $8, true)
       RETURNING id, tenant_id, email, name, sso_provider, sso_subject_id, sso_tenant_id, auth_method`,
      [
        input.tenant_id,
        input.email.toLowerCase(),
        input.name,
        input.sso_provider,
        input.sso_subject_id,
        input.sso_tenant_id,
        input.role || 'member',
        input.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.name)}`,
      ]
    );
    return result.rows[0];
  },

  async linkSsoToUser(
    userId: string,
    ssoProvider: string,
    ssoSubjectId: string,
    ssoTenantId: string
  ): Promise<boolean> {
    const result = await query(
      `UPDATE users
       SET sso_provider = $1, sso_subject_id = $2, sso_tenant_id = $3,
           auth_method = CASE WHEN password_hash IS NOT NULL THEN 'both' ELSE 'sso' END,
           updated_at = NOW()
       WHERE id = $4`,
      [ssoProvider, ssoSubjectId, ssoTenantId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateSsoUserLastLogin(userId: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1',
      [userId]
    );
  },

  async updateUserOrgAdminStatus(userId: string, isOrgAdmin: boolean): Promise<void> {
    await query(
      `UPDATE users
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
           role = CASE WHEN $2 = true THEN 'org_admin' ELSE role END,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify({ isOrgAdmin, orgAdminUpdatedAt: new Date().toISOString() }), isOrgAdmin, userId]
    );
  },
};

// Entra ID specific types
export interface SsoProvider {
  id: string;
  provider_type: string;
  name: string;
  display_name: string | null;
  is_enabled: boolean;
  client_id: string | null;
  client_secret_encrypted: string | null;
  redirect_uri: string | null;
  tenant_id: string;
  issuer_url: string | null;
  authorization_endpoint: string | null;
  token_endpoint: string | null;
  userinfo_endpoint: string | null;
  scopes: string;
  config: Record<string, any>;
  icon_url: string | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SsoOrgConsent {
  id: string;
  provider_id: string;
  entra_tenant_id: string;
  organization_name: string | null;
  verified_domains: string[];
  tenant_id: string | null;
  consented_by_email: string | null;
  consented_by_name: string | null;
  consented_by_oid: string | null;
  consented_at: Date;
  is_active: boolean;
  auto_provision_users: boolean;
  default_role: string;
  created_at: Date;
  updated_at: Date;
}

export interface SsoUser {
  id: string;
  tenant_id: string | null;
  email: string;
  name: string;
  sso_provider: string | null;
  sso_subject_id: string | null;
  sso_tenant_id: string | null;
  auth_method: string;
}

export default ssoRepository;
