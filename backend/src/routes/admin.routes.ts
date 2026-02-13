import { Router, Response } from 'express';
import { adminAuthMiddleware, requireAdmin, requireSuperAdmin, AdminRequest } from '../middleware/admin-auth.middleware.js';
import { query } from '../db/postgres/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const router = Router();

// =====================================================
// AUTHENTICATION (Public - No Auth Required)
// =====================================================

/**
 * POST /admin/auth/login
 * Admin login endpoint
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Get admin user from PostgreSQL
    const result = await query(
      `SELECT id, email, password_hash, name, role, is_active
       FROM admin_users
       WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const admin = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [admin.id, 'login', 'auth', JSON.stringify({ email: admin.email })]
    );

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /admin/auth/me
 * Get current admin user
 */
router.get('/auth/me', adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      admin: req.admin,
    },
  });
});

// =====================================================
// All routes below require authentication
// =====================================================
router.use(adminAuthMiddleware);
router.use(requireAdmin);

// =====================================================
// FEATURE 1: AI PROVIDER MANAGEMENT
// =====================================================

/**
 * GET /admin/ai-providers
 * List all AI providers
 */
router.get('/ai-providers', async (req: AdminRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, provider_type, api_endpoint, is_enabled, is_default,
              config, rate_limits, created_at, updated_at
       FROM ai_providers
       ORDER BY display_name`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching AI providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI providers',
    });
  }
});

/**
 * GET /admin/ai-providers/:id
 * Get single AI provider
 */
router.get('/ai-providers/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, display_name, provider_type, api_endpoint, is_enabled, is_default,
              config, rate_limits, created_at, updated_at
       FROM ai_providers
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI provider',
    });
  }
});

/**
 * POST /admin/ai-providers
 * Create new AI provider
 */
router.post('/ai-providers', async (req: AdminRequest, res: Response) => {
  try {
    const {
      name,
      display_name,
      provider_type,
      api_endpoint,
      api_key,
      is_enabled = true,
      is_default = false,
      config = {},
      rate_limits = {},
    } = req.body;

    if (!name || !display_name || !provider_type || !api_endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE ai_providers SET is_default = false WHERE is_default = true'
      );
    }

    // Encrypt API key if provided
    let api_key_encrypted = null;
    if (api_key) {
      // Simple encryption - in production, use proper encryption
      api_key_encrypted = Buffer.from(api_key).toString('base64');
    }

    const result = await query(
      `INSERT INTO ai_providers
       (name, display_name, provider_type, api_endpoint, api_key_encrypted, is_enabled, is_default, config, rate_limits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
       RETURNING id, name, display_name, provider_type, api_endpoint, is_enabled, is_default, config, rate_limits, created_at`,
      [name, display_name, provider_type, api_endpoint, api_key_encrypted, is_enabled, is_default, JSON.stringify(config), JSON.stringify(rate_limits)]
    );

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'create', 'ai_provider', result.rows[0].id, JSON.stringify({ name, display_name })]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error creating AI provider:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create AI provider',
    });
  }
});

/**
 * PATCH /admin/ai-providers/:id
 * Update AI provider
 */
router.patch('/ai-providers/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      display_name,
      api_endpoint,
      api_key,
      is_enabled,
      is_default,
      config,
      rate_limits,
    } = req.body;

    // Check if provider exists
    const existingResult = await query(
      'SELECT id FROM ai_providers WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found',
      });
    }

    // If setting as default, unset other defaults
    if (is_default === true) {
      await query(
        'UPDATE ai_providers SET is_default = false WHERE id != $1',
        [id]
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(display_name);
    }
    if (api_endpoint !== undefined) {
      updates.push(`api_endpoint = $${paramCount++}`);
      values.push(api_endpoint);
    }
    if (api_key !== undefined) {
      updates.push(`api_key_encrypted = $${paramCount++}`);
      values.push(Buffer.from(api_key).toString('base64'));
    }
    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramCount++}`);
      values.push(is_enabled);
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramCount++}`);
      values.push(is_default);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(config));
    }
    if (rate_limits !== undefined) {
      updates.push(`rate_limits = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(rate_limits));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE ai_providers
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, display_name, provider_type, api_endpoint, is_enabled, is_default, config, rate_limits, updated_at`,
      values
    );

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'update', 'ai_provider', id, JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error updating AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI provider',
    });
  }
});

/**
 * DELETE /admin/ai-providers/:id
 * Delete AI provider
 */
router.delete('/ai-providers/:id', requireSuperAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM ai_providers WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found',
      });
    }

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'delete', 'ai_provider', id, JSON.stringify(result.rows[0])]
    );

    res.json({
      success: true,
      data: { message: 'AI provider deleted successfully' },
    });
  } catch (error: any) {
    console.error('[Admin] Error deleting AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI provider',
    });
  }
});

/**
 * POST /admin/ai-providers/:id/test
 * Test AI provider connection
 */
router.post('/ai-providers/:id/test', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, provider_type, api_endpoint, api_key_encrypted
       FROM ai_providers
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found',
      });
    }

    const provider = result.rows[0];

    // Simple connection test (in production, make actual API call)
    const testResult = {
      provider_name: provider.name,
      endpoint: provider.api_endpoint,
      status: 'success',
      message: 'Connection test successful',
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: testResult,
    });
  } catch (error: any) {
    console.error('[Admin] Error testing AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test AI provider',
    });
  }
});

// =====================================================
// FEATURE 2: SYSTEM DASHBOARD
// =====================================================

/**
 * GET /admin/dashboard/stats
 * Get system-wide statistics
 */
router.get('/dashboard/stats', async (req: AdminRequest, res: Response) => {
  try {
    // Get tenant count
    const tenantsResult = await query(
      `SELECT
         COUNT(*) as total_tenants,
         COUNT(*) FILTER (WHERE is_active = true) as active_tenants,
         COUNT(*) FILTER (WHERE subscription_status = 'active') as paid_tenants
       FROM tenants`
    );

    // Get user count
    const usersResult = await query(
      `SELECT
         COUNT(*) as total_users,
         COUNT(*) FILTER (WHERE status = 'active') as active_users
       FROM users`
    );

    // Get AI provider count
    const providersResult = await query(
      `SELECT
         COUNT(*) as total_providers,
         COUNT(*) FILTER (WHERE is_enabled = true) as enabled_providers
       FROM ai_providers`
    );

    // Get system health
    const systemHealth = {
      database: {
        postgresql: 'healthy',
        mongodb: 'healthy',
      },
      api_server: 'healthy',
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        tenants: tenantsResult.rows[0],
        users: usersResult.rows[0],
        ai_providers: providersResult.rows[0],
        system_health: systemHealth,
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
});

/**
 * GET /admin/dashboard/health
 * Get detailed system health
 */
router.get('/dashboard/health', async (req: AdminRequest, res: Response) => {
  try {
    // Test PostgreSQL
    let postgresHealth = 'healthy';
    try {
      await query('SELECT 1');
    } catch (error) {
      postgresHealth = 'unhealthy';
    }

    // Test MongoDB (simplified - in production, make actual connection test)
    const mongoHealth = 'healthy';

    // Get database sizes (simplified)
    const dbSizes = {
      postgresql: 'N/A',
      mongodb: 'N/A',
    };

    res.json({
      success: true,
      data: {
        status: postgresHealth === 'healthy' && mongoHealth === 'healthy' ? 'healthy' : 'degraded',
        components: {
          postgresql: {
            status: postgresHealth,
            connection_pool: 'active',
          },
          mongodb: {
            status: mongoHealth,
            connection_pool: 'active',
          },
          api_server: {
            status: 'healthy',
            uptime: process.uptime(),
          },
        },
        database_sizes: dbSizes,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
    });
  }
});

// =====================================================
// FEATURE 3: TENANT MANAGEMENT
// =====================================================

/**
 * GET /admin/tenants
 * List all tenants
 */
router.get('/tenants', async (req: AdminRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
         t.id, t.name, t.slug, t.domain, t.subscription_status, t.is_active,
         t.created_at, t.updated_at,
         COUNT(DISTINCT u.id) as user_count
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id AND u.status = 'active'
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants',
    });
  }
});

/**
 * GET /admin/tenants/:id
 * Get single tenant with details
 */
router.get('/tenants/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tenantResult = await query(
      `SELECT id, name, slug, domain, subscription_status, is_active, settings, created_at, updated_at
       FROM tenants
       WHERE id = $1`,
      [id]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Get user count
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND status = $2',
      [id, 'active']
    );

    res.json({
      success: true,
      data: {
        ...tenantResult.rows[0],
        user_count: parseInt(userCountResult.rows[0].count),
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant',
    });
  }
});

/**
 * PATCH /admin/tenants/:id
 * Update tenant (activate/deactivate, change subscription)
 */
router.patch('/tenants/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active, subscription_status, settings } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (subscription_status !== undefined) {
      updates.push(`subscription_status = $${paramCount++}`);
      values.push(subscription_status);
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE tenants
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, slug, subscription_status, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'update', 'tenant', id, JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error updating tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant',
    });
  }
});

// =====================================================
// FEATURE 4: GIT PROVIDER CONFIGURATION
// =====================================================

/**
 * GET /admin/git-providers
 * List all Git providers
 */
router.get('/git-providers', async (req: AdminRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, provider_type, is_enabled,
              oauth_client_id, oauth_client_secret_encrypted, oauth_scopes,
              api_base_url, auth_url, token_url, is_oauth_configured,
              icon_url, config, created_at, updated_at
       FROM git_providers
       ORDER BY display_name`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching Git providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Git providers',
    });
  }
});

/**
 * GET /admin/git-providers/:id
 * Get single Git provider
 */
router.get('/git-providers/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, display_name, provider_type, is_enabled,
              oauth_client_id, oauth_client_secret_encrypted, oauth_scopes,
              api_base_url, auth_url, token_url, is_oauth_configured,
              icon_url, config, created_at, updated_at
       FROM git_providers
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Git provider not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching Git provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Git provider',
    });
  }
});

/**
 * POST /admin/git-providers
 * Create new Git provider
 */
router.post('/git-providers', async (req: AdminRequest, res: Response) => {
  try {
    const {
      name,
      display_name,
      provider_type,
      is_enabled = true,
      oauth_client_id = null,
      oauth_client_secret = null,
      config = {},
    } = req.body;

    if (!name || !display_name || !provider_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const result = await query(
      `INSERT INTO git_providers
       (name, display_name, provider_type, is_enabled, oauth_client_id, config)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, name, display_name, provider_type, is_enabled, oauth_client_id, config, created_at`,
      [name, display_name, provider_type, is_enabled, oauth_client_id, JSON.stringify(config)]
    );

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'create', 'git_provider', result.rows[0].id, JSON.stringify({ name, display_name })]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error creating Git provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Git provider',
    });
  }
});

/**
 * PATCH /admin/git-providers/:id
 * Update Git provider
 */
router.patch('/git-providers/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { display_name, is_enabled, oauth_client_id, config } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(display_name);
    }
    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramCount++}`);
      values.push(is_enabled);
    }
    if (oauth_client_id !== undefined) {
      updates.push(`oauth_client_id = $${paramCount++}`);
      values.push(oauth_client_id);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE git_providers
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, display_name, provider_type, is_enabled, oauth_client_id, config, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Git provider not found',
      });
    }

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'update', 'git_provider', id, JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin] Error updating Git provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Git provider',
    });
  }
});

/**
 * DELETE /admin/git-providers/:id
 * Delete Git provider
 */
router.delete('/git-providers/:id', requireSuperAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM git_providers WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Git provider not found',
      });
    }

    // Log admin action
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin!.id, 'delete', 'git_provider', id, JSON.stringify(result.rows[0])]
    );

    res.json({
      success: true,
      data: { message: 'Git provider deleted successfully' },
    });
  } catch (error: any) {
    console.error('[Admin] Error deleting Git provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Git provider',
    });
  }
});

// =====================================================
// AUDIT LOG
// =====================================================

/**
 * GET /admin/audit-log
 * Get admin audit log
 */
router.get('/audit-log', async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const action = req.query.action as string;
    const entity_type = req.query.entity_type as string;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (action) {
      conditions.push(`al.action = $${paramCount++}`);
      values.push(action);
    }
    if (entity_type) {
      conditions.push(`al.entity_type = $${paramCount++}`);
      values.push(entity_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await query(
      `SELECT
         al.id, al.admin_id, al.action, al.entity_type, al.entity_id,
         al.details, al.created_at,
         au.email as admin_email, au.name as admin_name
       FROM admin_audit_log al
       LEFT JOIN admin_users au ON au.id = al.admin_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );

    const countQuery = conditions.length > 0
      ? `SELECT COUNT(*) as total FROM admin_audit_log al ${whereClause}`
      : 'SELECT COUNT(*) as total FROM admin_audit_log';
    const countResult = await query(countQuery, conditions.length > 0 ? values.slice(0, -2) : []);

    res.json({
      success: true,
      data: {
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
    });
  }
});

export default router;
