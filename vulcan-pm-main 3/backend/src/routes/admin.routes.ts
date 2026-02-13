import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { adminRepository } from '../db/postgres/repositories/admin.repository.js';
import { aiProvidersRepository } from '../db/postgres/repositories/ai-providers.repository.js';
import { tenantsRepository } from '../db/postgres/repositories/tenants.repository.js';
import { usersRepository } from '../db/postgres/repositories/users.repository.js';
import { ssoRepository } from '../db/postgres/repositories/sso.repository.js';
import { projectsRepository } from '../db/mongo/repositories/projects.repository.js';
import { domainWhitelistRepository } from '../db/postgres/repositories/domain-whitelist.repository.js';
import { gitProvidersRepository } from '../db/postgres/repositories/git-providers.repository.js';
import { searchProvidersRepository } from '../db/postgres/repositories/search-providers.repository.js';
import { webSearchService } from '../services/web-search.service.js';
import { aiService } from '../services/ai.service.js';
import { promptTemplatesRepository } from '../db/postgres/repositories/prompt-templates.repository.js';
import { promptTemplateService } from '../services/prompt-template.service.js';
import { epicCategoriesRepository } from '../db/postgres/repositories/epic-categories.repository.js';

// Admin SSO state storage (use Redis in production)
const adminSsoStateStore = new Map<string, { nonce: string; createdAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of adminSsoStateStore.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      adminSsoStateStore.delete(key);
    }
  }
}, 60 * 1000);

const router = Router();

// =====================================================
// ADMIN AUTH MIDDLEWARE
// =====================================================

interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

async function requireAdminAuth(req: AdminRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { adminId: string; type: string };

    if (decoded.type !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid admin token' });
    }

    const admin = await adminRepository.findAdminById(decoded.adminId);

    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, error: 'Admin not found or inactive' });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }
}

// =====================================================
// ADMIN AUTH
// =====================================================

/**
 * POST /api/admin/auth/login
 * Admin login
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const admin = await adminRepository.findAdminByEmail(email);

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if admin has a password (SSO-only users don't have one)
    if (!admin.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'This account requires SSO login',
        code: 'SSO_REQUIRED',
      });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ success: false, error: 'Account is disabled' });
    }

    // Update last login
    await adminRepository.updateAdminLastLogin(admin.id);

    // Log action
    await adminRepository.logAction({
      admin_id: admin.id,
      action: 'login',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    // Generate token
    const token = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      config.jwt.secret,
      { expiresIn: '24h' }
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
  } catch (error) {
    console.error('[Admin] Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * GET /api/admin/auth/me
 * Get current admin
 */
router.get('/auth/me', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  res.json({ success: true, data: req.admin });
});

/**
 * GET /api/admin/auth/sso/status
 * Check if admin SSO is enabled
 */
router.get('/auth/sso/status', async (req: Request, res: Response) => {
  const isEnabled = !!(config.entraAdmin.clientId && config.entraAdmin.clientSecret);
  res.json({
    success: true,
    data: {
      enabled: isEnabled,
      provider: 'entra_id',
      displayName: 'Sign in with Microsoft',
    },
  });
});

/**
 * GET /api/admin/auth/sso/login
 * Initiate admin Entra ID login
 */
router.get('/auth/sso/login', async (req: Request, res: Response) => {
  try {
    if (!config.entraAdmin.clientId) {
      return res.status(400).json({ success: false, error: 'Admin SSO is not configured' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    adminSsoStateStore.set(state, { nonce, createdAt: Date.now() });

    const params = new URLSearchParams({
      client_id: config.entraAdmin.clientId,
      response_type: 'code',
      redirect_uri: config.entraAdmin.redirectUri,
      response_mode: 'query',
      scope: config.entraAdmin.scopes.join(' '),
      state,
      nonce,
      prompt: 'select_account',
    });

    const authUrl = `${config.entraAdmin.authorizationEndpoint}?${params.toString()}`;

    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    console.error('[Admin SSO] Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate SSO login' });
  }
});

/**
 * Check if user is a member of the admin group via Microsoft Graph API
 */
async function checkAdminGroupMembership(accessToken: string, groupId: string): Promise<boolean> {
  try {
    // Check if user is member of the specified group
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.group?$filter=id eq '${groupId}'`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('[Admin SSO] Group membership check failed:', await response.text());
      return false;
    }

    const data = await response.json() as { value?: Array<{ id: string }> };
    return (data.value?.length ?? 0) > 0;
  } catch (error) {
    console.error('[Admin SSO] Error checking group membership:', error);
    return false;
  }
}

/**
 * POST /api/admin/auth/sso/callback
 * Handle admin Entra ID callback
 */
router.post('/auth/sso/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing code or state' });
    }

    // Validate state
    const storedState = adminSsoStateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ success: false, error: 'Invalid or expired state' });
    }
    adminSsoStateStore.delete(state);

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      client_id: config.entraAdmin.clientId,
      client_secret: config.entraAdmin.clientSecret,
      code,
      redirect_uri: config.entraAdmin.redirectUri,
      grant_type: 'authorization_code',
      scope: config.entraAdmin.scopes.join(' '),
    });

    const tokenResponse = await fetch(config.entraAdmin.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json() as { error_description?: string };
      console.error('[Admin SSO] Token exchange failed:', error);
      throw new Error(error.error_description || 'Failed to exchange code');
    }

    const tokens = await tokenResponse.json() as { id_token: string; access_token: string };

    // Decode ID token
    const idToken = jwt.decode(tokens.id_token) as { email?: string; preferred_username?: string; name?: string } | null;
    if (!idToken) {
      throw new Error('Failed to decode ID token');
    }

    const email = idToken.email || idToken.preferred_username;

    if (!email) {
      throw new Error('Email not found in token');
    }

    const name = idToken.name || email.split('@')[0] || 'Admin User';

    // Check admin group membership (required)
    if (config.entraAdmin.groupId) {
      const isMember = await checkAdminGroupMembership(tokens.access_token, config.entraAdmin.groupId);
      if (!isMember) {
        console.log(`[Admin SSO] User ${email} is not a member of admin group`);
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to access the admin portal. Please contact your administrator.',
          code: 'NOT_IN_ADMIN_GROUP',
        });
      }
      console.log(`[Admin SSO] User ${email} verified as member of admin group`);
    } else {
      console.warn('[Admin SSO] No admin group configured - falling back to domain check');
      // Fallback to domain check if no group configured
      if (config.entraAdmin.allowedDomains.length > 0) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const isAllowed = config.entraAdmin.allowedDomains.some(
          d => d.toLowerCase() === emailDomain
        );
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            error: 'Your domain is not authorized for admin access',
          });
        }
      }
    }

    // Find or create admin user
    let admin = await adminRepository.findAdminByEmail(email);

    if (!admin) {
      // Auto-create admin user from SSO
      admin = await adminRepository.createAdmin({
        email,
        name,
        role: 'admin',
        password_hash: null, // SSO user, no password
      });
      console.log(`[Admin SSO] Created new admin user: ${email}`);
    }

    if (!admin.is_active) {
      return res.status(403).json({ success: false, error: 'Account is disabled' });
    }

    // Update last login
    await adminRepository.updateAdminLastLogin(admin.id);

    // Log action
    await adminRepository.logAction({
      admin_id: admin.id,
      action: 'sso_login',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      details: { provider: 'entra_id' },
    });

    // Generate token
    const token = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      config.jwt.secret,
      { expiresIn: '24h' }
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
    console.error('[Admin SSO] Callback error:', error);
    res.status(500).json({ success: false, error: error.message || 'SSO authentication failed' });
  }
});

// =====================================================
// DASHBOARD STATS
// =====================================================

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
router.get('/stats', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const [tenantCount, userCount, providerCount] = await Promise.all([
      tenantsRepository.count(),
      usersRepository.count(),
      aiProvidersRepository.findEnabled().then(p => p.length),
    ]);

    res.json({
      success: true,
      data: {
        tenants: tenantCount,
        users: userCount,
        activeProviders: providerCount,
      },
    });
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// =====================================================
// TENANTS MANAGEMENT
// =====================================================

/**
 * GET /api/admin/tenants
 * List all tenants with user and project counts
 */
router.get('/tenants', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const [tenants, total] = await Promise.all([
      tenantsRepository.findAll(limit, offset),
      tenantsRepository.count(),
    ]);

    // Enrich tenants with user and project counts
    const enrichedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, projectCount] = await Promise.all([
          usersRepository.count(tenant.id),
          projectsRepository.count(tenant.id),
        ]);
        return {
          ...tenant,
          userCount,
          projectCount,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedTenants,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error('[Admin] Tenants error:', error);
    res.status(500).json({ success: false, error: 'Failed to get tenants' });
  }
});

/**
 * GET /api/admin/tenants/:id
 * Get tenant details with user and project counts
 */
router.get('/tenants/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const tenant = await tenantsRepository.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const [userCount, projectCount] = await Promise.all([
      usersRepository.count(tenant.id),
      projectsRepository.count(tenant.id),
    ]);

    res.json({
      success: true,
      data: { ...tenant, userCount, projectCount },
    });
  } catch (error) {
    console.error('[Admin] Tenant error:', error);
    res.status(500).json({ success: false, error: 'Failed to get tenant' });
  }
});

/**
 * PATCH /api/admin/tenants/:id
 * Update tenant
 */
router.patch('/tenants/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const tenant = await tenantsRepository.update(req.params.id, req.body);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_tenant',
      entity_type: 'tenant',
      entity_id: tenant.id,
      details: req.body,
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('[Admin] Update tenant error:', error);
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

// =====================================================
// AI PROVIDERS
// =====================================================

/**
 * GET /api/admin/ai-providers
 * List all AI providers
 */
router.get('/ai-providers', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const providers = await aiProvidersRepository.findAll();

    // Don't expose API keys
    const safeProviders = providers.map(p => ({
      ...p,
      api_key_encrypted: p.api_key_encrypted ? '***configured***' : null,
    }));

    res.json({ success: true, data: safeProviders });
  } catch (error) {
    console.error('[Admin] AI providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get AI providers' });
  }
});

/**
 * POST /api/admin/ai-providers
 * Create a custom AI provider
 */
router.post('/ai-providers', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { name, display_name, provider_type, api_endpoint, api_key, config } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Name and display name are required',
      });
    }

    // Check if name already exists
    const existing = await aiProvidersRepository.findByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A provider with this name already exists',
      });
    }

    const provider = await aiProvidersRepository.create({
      name,
      display_name,
      provider_type: provider_type || 'openai_compatible',
      api_endpoint,
      api_key_encrypted: api_key, // TODO: Encrypt in production
      config: config || { requires_api_key: !!api_key },
      created_by_admin_id: req.admin!.id,
    });

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'create_ai_provider',
      entity_type: 'ai_provider',
      entity_id: provider.id,
      details: { name, display_name, provider_type, api_endpoint },
    });

    res.status(201).json({
      success: true,
      data: {
        ...provider,
        api_key_encrypted: provider.api_key_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Create AI provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to create AI provider' });
  }
});

/**
 * GET /api/admin/ai-providers/:id
 * Get AI provider details with models
 */
router.get('/ai-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await aiProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    const models = await aiProvidersRepository.findModelsByProvider(provider.id);

    res.json({
      success: true,
      data: {
        ...provider,
        api_key_encrypted: provider.api_key_encrypted ? '***configured***' : null,
        models,
      },
    });
  } catch (error) {
    console.error('[Admin] AI provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to get AI provider' });
  }
});

/**
 * PATCH /api/admin/ai-providers/:id
 * Update AI provider (including API key)
 */
router.patch('/ai-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { api_key, ...rest } = req.body;

    // If API key provided, encrypt it (in production, use proper encryption)
    const updateData: any = { ...rest };
    if (api_key) {
      // In production, encrypt the API key before storing
      updateData.api_key_encrypted = api_key; // TODO: Encrypt this
    }

    const provider = await aiProvidersRepository.update(req.params.id, updateData);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_ai_provider',
      entity_type: 'ai_provider',
      entity_id: provider.id,
      details: { ...rest, api_key: api_key ? '***' : undefined },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        api_key_encrypted: provider.api_key_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Update AI provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to update AI provider' });
  }
});

/**
 * DELETE /api/admin/ai-providers/:id
 * Delete a custom AI provider
 */
router.delete('/ai-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await aiProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    const deleted = await aiProvidersRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete system providers. Only custom providers can be deleted.',
      });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'delete_ai_provider',
      entity_type: 'ai_provider',
      entity_id: req.params.id,
      details: { name: provider.name, display_name: provider.display_name },
    });

    res.json({ success: true, message: 'Provider deleted' });
  } catch (error) {
    console.error('[Admin] Delete AI provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete AI provider' });
  }
});

/**
 * GET /api/admin/ai-providers/:id/models
 * List models for a provider
 */
router.get('/ai-providers/:id/models', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const models = await aiProvidersRepository.findModelsByProvider(req.params.id);
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('[Admin] AI models error:', error);
    res.status(500).json({ success: false, error: 'Failed to get models' });
  }
});

/**
 * POST /api/admin/ai-providers/:id/models
 * Add model to provider
 */
router.post('/ai-providers/:id/models', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const model = await aiProvidersRepository.createModel({
      provider_id: req.params.id,
      ...req.body,
    });

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'create_ai_model',
      entity_type: 'ai_model',
      entity_id: model.id,
      details: req.body,
    });

    res.status(201).json({ success: true, data: model });
  } catch (error) {
    console.error('[Admin] Create AI model error:', error);
    res.status(500).json({ success: false, error: 'Failed to create model' });
  }
});

/**
 * PATCH /api/admin/ai-models/:id
 * Update AI model
 */
router.patch('/ai-models/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const model = await aiProvidersRepository.updateModel(req.params.id, req.body);

    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    res.json({ success: true, data: model });
  } catch (error) {
    console.error('[Admin] Update AI model error:', error);
    res.status(500).json({ success: false, error: 'Failed to update model' });
  }
});

/**
 * DELETE /api/admin/ai-models/:id
 * Delete AI model
 */
router.delete('/ai-models/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const success = await aiProvidersRepository.deleteModel(req.params.id);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    res.json({ success: true, message: 'Model deleted' });
  } catch (error) {
    console.error('[Admin] Delete AI model error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete model' });
  }
});

/**
 * POST /api/admin/ai-providers/:id/test
 * Test connection to an AI provider
 */
router.post('/ai-providers/:id/test', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await aiProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    if (!provider.api_key_encrypted && provider.config?.requires_api_key !== false) {
      return res.json({
        success: true,
        data: { success: false, message: 'No API key configured for this provider' },
      });
    }

    // Clear AI service cache so it picks up latest config
    aiService.clearCache();

    const result = await aiService.testConnection(req.params.id);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Admin] Test AI provider error:', error);
    res.json({
      success: true,
      data: { success: false, message: error.message || 'Test failed' },
    });
  }
});

// =====================================================
// SYSTEM SETTINGS
// =====================================================

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const settings = await adminRepository.getAllSettings();

    // Convert to key-value object
    const settingsObj = settings.reduce((acc, s) => {
      acc[s.key] = { value: s.value, description: s.description, is_secret: s.is_secret };
      return acc;
    }, {} as Record<string, any>);

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('[Admin] Settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
router.patch('/settings', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await adminRepository.setSetting(key, value);
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_settings',
      details: { keys: Object.keys(updates) },
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[Admin] Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// =====================================================
// AUDIT LOG
// =====================================================

/**
 * GET /api/admin/audit-log
 * Get audit log entries
 */
router.get('/audit-log', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await adminRepository.getAuditLog({ limit, offset });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[Admin] Audit log error:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit log' });
  }
});

// =====================================================
// ADMIN USERS MANAGEMENT
// =====================================================

/**
 * GET /api/admin/admins
 * List admin users
 */
router.get('/admins', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const admins = await adminRepository.findAllAdmins();

    res.json({
      success: true,
      data: admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        is_active: a.is_active,
        last_login_at: a.last_login_at,
        created_at: a.created_at,
      })),
    });
  } catch (error) {
    console.error('[Admin] List admins error:', error);
    res.status(500).json({ success: false, error: 'Failed to get admins' });
  }
});

/**
 * POST /api/admin/admins
 * Create admin user
 */
router.post('/admins', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    // Only super_admin can create new admins
    if (req.admin!.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }

    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name required' });
    }

    // Check if email exists
    const existing = await adminRepository.findAdminByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const admin = await adminRepository.createAdmin({
      email,
      password_hash,
      name,
      role: role || 'admin',
    });

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'create_admin',
      entity_type: 'admin',
      entity_id: admin.id,
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('[Admin] Create admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
});

// =====================================================
// SSO FEDERATION CONFIGURATION
// =====================================================

/**
 * GET /api/admin/sso/providers
 * Get all SSO providers
 */
router.get('/sso/providers', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const providers = await ssoRepository.findAllProviders();

    // Mask secrets
    const safeProviders = providers.map(p => ({
      ...p,
      client_id: p.client_id || null,
      client_secret_encrypted: p.client_secret_encrypted ? '***configured***' : null,
    }));

    res.json({ success: true, data: safeProviders });
  } catch (error) {
    console.error('[Admin] SSO providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SSO providers' });
  }
});

/**
 * GET /api/admin/sso/providers/:id
 * Get a single SSO provider
 */
router.get('/sso/providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await ssoRepository.findProviderById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        ...provider,
        client_secret_encrypted: provider.client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Get SSO provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SSO provider' });
  }
});

/**
 * PATCH /api/admin/sso/providers/:id
 * Update an SSO provider
 */
router.patch('/sso/providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { client_secret, ...rest } = req.body;

    const updates: any = { ...rest };

    // Handle client secret separately
    if (client_secret !== undefined && client_secret !== '') {
      // In production, encrypt this properly
      updates.client_secret_encrypted = client_secret;
    }

    const provider = await ssoRepository.updateProvider(req.params.id, updates);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_sso_provider',
      entity_type: 'sso_provider',
      entity_id: provider.id,
      details: {
        provider_type: provider.provider_type,
        is_enabled: provider.is_enabled,
        fields_updated: Object.keys(rest),
      },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        client_secret_encrypted: provider.client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Update SSO provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to update SSO provider' });
  }
});

/**
 * PATCH /api/admin/sso/entra
 * Update Entra ID SSO configuration (legacy endpoint for backward compatibility)
 */
router.patch('/sso/entra', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { is_enabled, client_id } = req.body;

    const updates: any = {};
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;
    if (client_id !== undefined) updates.client_id = client_id;

    const provider = await ssoRepository.updateEntraProvider(updates);

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_sso_provider',
      entity_type: 'sso_provider',
      entity_id: provider?.id,
      details: { provider: 'entra_id', is_enabled },
    });

    res.json({
      success: true,
      data: provider ? {
        id: provider.id,
        is_enabled: provider.is_enabled,
        client_id: provider.client_id ? '***configured***' : null,
        tenant_id: provider.tenant_id,
      } : null,
    });
  } catch (error) {
    console.error('[Admin] Update Entra SSO error:', error);
    res.status(500).json({ success: false, error: 'Failed to update SSO configuration' });
  }
});

/**
 * GET /api/admin/sso/consents
 * Get all organization consents
 */
router.get('/sso/consents', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await ssoRepository.findEntraProvider();
    if (!provider) {
      return res.json({ success: true, data: [] });
    }

    // Get all consents from the database
    const result = await import('../db/postgres/client.js');
    const consents = await result.query(
      `SELECT c.*, t.name as tenant_name, t.slug as tenant_slug
       FROM sso_org_consents c
       LEFT JOIN tenants t ON c.tenant_id = t.id
       WHERE c.provider_id = $1
       ORDER BY c.consented_at DESC`,
      [provider.id]
    );

    res.json({
      success: true,
      data: consents.rows,
    });
  } catch (error) {
    console.error('[Admin] SSO consents error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SSO consents' });
  }
});

/**
 * POST /api/admin/sso/consents/:id/link
 * Link an SSO consent to a tenant
 */
router.post('/sso/consents/:id/link', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId is required' });
    }

    // Verify tenant exists
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Get the consent
    const result = await import('../db/postgres/client.js');
    const consentResult = await result.query(
      'SELECT * FROM sso_org_consents WHERE id = $1',
      [req.params.id]
    );

    if (consentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consent not found' });
    }

    // Update the consent
    const updateResult = await result.query(
      'UPDATE sso_org_consents SET tenant_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [tenantId, req.params.id]
    );

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'link_sso_consent',
      entity_type: 'sso_consent',
      entity_id: req.params.id,
      details: { tenantId, entraTenantId: consentResult.rows[0].entra_tenant_id },
    });

    res.json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('[Admin] Link SSO consent error:', error);
    res.status(500).json({ success: false, error: 'Failed to link consent to tenant' });
  }
});

/**
 * DELETE /api/admin/sso/consents/:id
 * Revoke an SSO consent
 */
router.delete('/sso/consents/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const result = await import('../db/postgres/client.js');

    // Get the consent first for logging
    const consentResult = await result.query(
      'SELECT * FROM sso_org_consents WHERE id = $1',
      [req.params.id]
    );

    if (consentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consent not found' });
    }

    // Soft delete (set is_active = false)
    await result.query(
      'UPDATE sso_org_consents SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'revoke_sso_consent',
      entity_type: 'sso_consent',
      entity_id: req.params.id,
      details: { entraTenantId: consentResult.rows[0].entra_tenant_id },
    });

    res.json({ success: true, message: 'Consent revoked' });
  } catch (error) {
    console.error('[Admin] Revoke SSO consent error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke consent' });
  }
});

// =====================================================
// DOMAIN WHITELIST MANAGEMENT
// =====================================================

/**
 * GET /api/admin/whitelist
 * Get domain whitelist configuration and entries
 */
router.get('/whitelist', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const [entries, whitelistEnabled] = await Promise.all([
      domainWhitelistRepository.findAll(includeInactive),
      adminRepository.getSetting('signup_domain_whitelist_enabled'),
    ]);

    res.json({
      success: true,
      data: {
        enabled: whitelistEnabled === 'true',
        entries,
        count: entries.filter(e => e.is_active).length,
      },
    });
  } catch (error) {
    console.error('[Admin] Whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to get whitelist' });
  }
});

/**
 * POST /api/admin/whitelist
 * Add a domain to the whitelist
 */
router.post('/whitelist', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { domain, domain_type, tenant_id, notes } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    // Check if already exists
    const existing = await domainWhitelistRepository.findByDomain(
      domain,
      domain_type || 'email_domain'
    );
    if (existing) {
      return res.status(409).json({ success: false, error: 'Domain already whitelisted' });
    }

    const entry = await domainWhitelistRepository.create({
      domain,
      domain_type: domain_type || 'email_domain',
      tenant_id,
      notes,
      added_by_admin_id: req.admin!.id,
    });

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'add_whitelist_domain',
      entity_type: 'domain_whitelist',
      entity_id: entry.id,
      details: { domain, domain_type },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[Admin] Add whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to add domain to whitelist' });
  }
});

/**
 * PATCH /api/admin/whitelist/:id
 * Update a whitelist entry
 */
router.patch('/whitelist/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const entry = await domainWhitelistRepository.update(req.params.id, req.body);

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Whitelist entry not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_whitelist_domain',
      entity_type: 'domain_whitelist',
      entity_id: entry.id,
      details: req.body,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('[Admin] Update whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to update whitelist entry' });
  }
});

/**
 * DELETE /api/admin/whitelist/:id
 * Remove a domain from the whitelist
 */
router.delete('/whitelist/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    // Get entry first for logging
    const entry = await domainWhitelistRepository.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Whitelist entry not found' });
    }

    const deleted = await domainWhitelistRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Whitelist entry not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'remove_whitelist_domain',
      entity_type: 'domain_whitelist',
      entity_id: req.params.id,
      details: { domain: entry.domain, domain_type: entry.domain_type },
    });

    res.json({ success: true, message: 'Domain removed from whitelist' });
  } catch (error) {
    console.error('[Admin] Delete whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove domain from whitelist' });
  }
});

/**
 * POST /api/admin/whitelist/toggle
 * Enable or disable domain whitelist enforcement
 */
router.post('/whitelist/toggle', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled must be a boolean' });
    }

    await adminRepository.setSetting('signup_domain_whitelist_enabled', String(enabled));

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: enabled ? 'enable_whitelist' : 'disable_whitelist',
      details: { enabled },
    });

    res.json({
      success: true,
      message: enabled ? 'Domain whitelist enabled' : 'Domain whitelist disabled',
      data: { enabled },
    });
  } catch (error) {
    console.error('[Admin] Toggle whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle whitelist' });
  }
});

// =====================================================
// GIT PROVIDERS MANAGEMENT
// =====================================================

/**
 * GET /api/admin/git-providers
 * List all Git providers
 */
router.get('/git-providers', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const providers = await gitProvidersRepository.findAll();

    // Mask OAuth secrets
    const safeProviders = providers.map(p => ({
      ...p,
      oauth_client_secret_encrypted: p.oauth_client_secret_encrypted ? '***configured***' : null,
      oauth_callback_url: `${config.frontendUrl}/api/v1/git/auth/${p.id}/callback`,
    }));

    res.json({ success: true, data: safeProviders });
  } catch (error) {
    console.error('[Admin] Git providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get Git providers' });
  }
});

/**
 * GET /api/admin/git-providers/:id
 * Get Git provider details
 */
router.get('/git-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await gitProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        ...provider,
        oauth_client_secret_encrypted: provider.oauth_client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Git provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to get Git provider' });
  }
});

/**
 * PATCH /api/admin/git-providers/:id
 * Update Git provider (OAuth credentials)
 */
router.patch('/git-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { oauth_client_secret, ...rest } = req.body;

    const updateData: any = { ...rest };

    // If OAuth client secret provided, store it (in production, encrypt it)
    if (oauth_client_secret !== undefined && oauth_client_secret !== '') {
      updateData.oauth_client_secret_encrypted = oauth_client_secret;
    }

    // Check if OAuth is now configured
    if (updateData.oauth_client_id || updateData.oauth_client_secret_encrypted) {
      const existingProvider = await gitProvidersRepository.findById(req.params.id);
      const hasClientId = updateData.oauth_client_id || existingProvider?.oauth_client_id;
      const hasSecret = updateData.oauth_client_secret_encrypted || existingProvider?.oauth_client_secret_encrypted;
      updateData.is_oauth_configured = !!(hasClientId && hasSecret);
    }

    const provider = await gitProvidersRepository.update(req.params.id, updateData);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_git_provider',
      entity_type: 'git_provider',
      entity_id: provider.id,
      details: {
        ...rest,
        oauth_client_secret: oauth_client_secret ? '***' : undefined,
      },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        oauth_client_secret_encrypted: provider.oauth_client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Update Git provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to update Git provider' });
  }
});

/**
 * POST /api/admin/git-providers/:id/enable
 * Enable a Git provider
 */
router.post('/git-providers/:id/enable', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await gitProvidersRepository.setEnabled(req.params.id, true);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'enable_git_provider',
      entity_type: 'git_provider',
      entity_id: provider.id,
      details: { name: provider.name },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        oauth_client_secret_encrypted: provider.oauth_client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Enable Git provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to enable Git provider' });
  }
});

/**
 * POST /api/admin/git-providers/:id/disable
 * Disable a Git provider
 */
router.post('/git-providers/:id/disable', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await gitProvidersRepository.setEnabled(req.params.id, false);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'disable_git_provider',
      entity_type: 'git_provider',
      entity_id: provider.id,
      details: { name: provider.name },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        oauth_client_secret_encrypted: provider.oauth_client_secret_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Disable Git provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to disable Git provider' });
  }
});

/**
 * DELETE /api/admin/git-providers/:id/oauth
 * Clear OAuth credentials for a Git provider
 */
router.delete('/git-providers/:id/oauth', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await gitProvidersRepository.clearOAuthCredentials(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'clear_git_provider_oauth',
      entity_type: 'git_provider',
      entity_id: provider.id,
      details: { name: provider.name },
    });

    res.json({
      success: true,
      data: provider,
      message: 'OAuth credentials cleared',
    });
  } catch (error) {
    console.error('[Admin] Clear Git provider OAuth error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear OAuth credentials' });
  }
});

// =====================================================
// SEARCH PROVIDERS
// =====================================================

/**
 * GET /api/admin/search-providers
 * List all search providers
 */
router.get('/search-providers', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const providers = await searchProvidersRepository.findAll();

    const safeProviders = providers.map(p => ({
      ...p,
      api_key_encrypted: p.api_key_encrypted ? '***configured***' : null,
    }));

    res.json({ success: true, data: safeProviders });
  } catch (error) {
    console.error('[Admin] Search providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get search providers' });
  }
});

/**
 * GET /api/admin/search-providers/:id
 * Get search provider details
 */
router.get('/search-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await searchProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        ...provider,
        api_key_encrypted: provider.api_key_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Search provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to get search provider' });
  }
});

/**
 * PATCH /api/admin/search-providers/:id
 * Update search provider (including API key)
 */
router.patch('/search-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { api_key, ...rest } = req.body;

    const updateData: any = { ...rest };
    if (api_key) {
      updateData.api_key_encrypted = api_key;
    }

    const provider = await searchProvidersRepository.update(req.params.id, updateData);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Clear cache after config change
    webSearchService.clearCache();

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_search_provider',
      entity_type: 'search_provider',
      entity_id: provider.id,
      details: { ...rest, api_key: api_key ? '***' : undefined },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        api_key_encrypted: provider.api_key_encrypted ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('[Admin] Update search provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to update search provider' });
  }
});

/**
 * DELETE /api/admin/search-providers/:id
 * Delete a search provider
 */
router.delete('/search-providers/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await searchProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    const deleted = await searchProvidersRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete search provider',
      });
    }

    webSearchService.clearCache();

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'delete_search_provider',
      entity_type: 'search_provider',
      entity_id: req.params.id,
      details: { name: provider.name, display_name: provider.display_name },
    });

    res.json({ success: true, message: 'Provider deleted' });
  } catch (error) {
    console.error('[Admin] Delete search provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete search provider' });
  }
});

/**
 * POST /api/admin/search-providers/:id/test
 * Test a search provider connection
 */
router.post('/search-providers/:id/test', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const provider = await searchProvidersRepository.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    if (!provider.api_key_encrypted) {
      return res.json({
        success: true,
        data: { success: false, message: 'No API key configured' },
      });
    }

    // Temporarily make this the default for testing
    const wasDefault = provider.is_default;
    if (!wasDefault) {
      await searchProvidersRepository.update(provider.id, { is_default: true });
    }
    webSearchService.clearCache();

    const result = await webSearchService.testConnection();

    // Restore default if changed
    if (!wasDefault) {
      await searchProvidersRepository.update(provider.id, { is_default: false });
      webSearchService.clearCache();
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Admin] Test search provider error:', error);
    res.json({
      success: true,
      data: { success: false, message: error.message || 'Test failed' },
    });
  }
});

// =====================================================
// PROMPT TEMPLATES
// =====================================================

/**
 * GET /api/admin/prompt-templates
 * List all prompt templates (optional ?category= filter)
 */
router.get('/prompt-templates', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { category } = req.query;
    const templates = category
      ? await promptTemplatesRepository.findByCategory(category as string)
      : await promptTemplatesRepository.findAll();

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[Admin] Prompt templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get prompt templates' });
  }
});

/**
 * GET /api/admin/prompt-templates/:id
 * Get a single prompt template
 */
router.get('/prompt-templates/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const template = await promptTemplatesRepository.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('[Admin] Prompt template error:', error);
    res.status(500).json({ success: false, error: 'Failed to get prompt template' });
  }
});

/**
 * PATCH /api/admin/prompt-templates/:id
 * Update a prompt template (auto-creates version record)
 */
router.patch('/prompt-templates/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { template_body, display_name, description, variables, metadata, change_note } = req.body;

    const current = await promptTemplatesRepository.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const updated = await promptTemplatesRepository.update(req.params.id, {
      template_body,
      display_name,
      description,
      variables,
      metadata,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: 'Failed to update template' });
    }

    // Create version record when template body changes
    if (template_body !== undefined) {
      await promptTemplatesRepository.createVersion({
        template_id: updated.id,
        version: updated.version,
        template_body: updated.template_body,
        variables: updated.variables,
        metadata: updated.metadata,
        change_note: change_note || null,
        created_by: req.admin!.email,
      });
    }

    // Clear cache so next AI call uses the new template
    promptTemplateService.clearCache();

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_prompt_template',
      entity_type: 'prompt_template',
      entity_id: updated.id,
      details: { name: current.name, version: updated.version, change_note },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin] Update prompt template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update prompt template' });
  }
});

/**
 * POST /api/admin/prompt-templates/:id/toggle
 * Enable or disable a prompt template
 */
router.post('/prompt-templates/:id/toggle', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'is_active (boolean) is required' });
    }

    const updated = await promptTemplatesRepository.toggleActive(req.params.id, is_active);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    promptTemplateService.clearCache();

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: is_active ? 'enable_prompt_template' : 'disable_prompt_template',
      entity_type: 'prompt_template',
      entity_id: updated.id,
      details: { name: updated.name },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin] Toggle prompt template error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle prompt template' });
  }
});

/**
 * GET /api/admin/prompt-templates/:id/versions
 * List version history for a prompt template
 */
router.get('/prompt-templates/:id/versions', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const template = await promptTemplatesRepository.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const versions = await promptTemplatesRepository.findVersionsByTemplate(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('[Admin] Prompt template versions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get version history' });
  }
});

/**
 * GET /api/admin/prompt-templates/:id/versions/:version
 * Get a specific version of a prompt template
 */
router.get('/prompt-templates/:id/versions/:version', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const version = await promptTemplatesRepository.findVersion(
      req.params.id,
      parseInt(req.params.version, 10)
    );
    if (!version) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }
    res.json({ success: true, data: version });
  } catch (error) {
    console.error('[Admin] Prompt template version error:', error);
    res.status(500).json({ success: false, error: 'Failed to get version' });
  }
});

/**
 * POST /api/admin/prompt-templates/:id/rollback/:version
 * Rollback a prompt template to a specific version
 */
router.post('/prompt-templates/:id/rollback/:version', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const targetVersion = await promptTemplatesRepository.findVersion(
      req.params.id,
      parseInt(req.params.version, 10)
    );
    if (!targetVersion) {
      return res.status(404).json({ success: false, error: 'Target version not found' });
    }

    // Apply the old version's content to the current template (increments version)
    const updated = await promptTemplatesRepository.update(req.params.id, {
      template_body: targetVersion.template_body,
      variables: targetVersion.variables,
      metadata: targetVersion.metadata,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: 'Failed to rollback' });
    }

    // Create a new version record noting the rollback
    await promptTemplatesRepository.createVersion({
      template_id: updated.id,
      version: updated.version,
      template_body: updated.template_body,
      variables: updated.variables,
      metadata: updated.metadata,
      change_note: `Rollback to version ${targetVersion.version}`,
      created_by: req.admin!.email,
    });

    promptTemplateService.clearCache();

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'rollback_prompt_template',
      entity_type: 'prompt_template',
      entity_id: updated.id,
      details: { name: updated.name, rolledBackTo: targetVersion.version, newVersion: updated.version },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin] Rollback prompt template error:', error);
    res.status(500).json({ success: false, error: 'Failed to rollback prompt template' });
  }
});

/**
 * POST /api/admin/prompt-templates/:id/preview
 * Preview: resolve a template with sample variables (dry-run)
 */
router.post('/prompt-templates/:id/preview', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { variables } = req.body;
    const template = await promptTemplatesRepository.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const resolvedText = promptTemplateService.resolveTemplate(
      template.template_body,
      variables || {}
    );

    res.json({
      success: true,
      data: {
        resolvedText,
        charCount: resolvedText.length,
        variables: template.variables,
      },
    });
  } catch (error: any) {
    console.error('[Admin] Preview prompt template error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to preview template' });
  }
});

// =====================================================
// EPIC CATEGORIES
// =====================================================

/**
 * GET /api/admin/epic-categories
 * List all epic categories
 */
router.get('/epic-categories', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const categories = await epicCategoriesRepository.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Admin] Epic categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to get epic categories' });
  }
});

/**
 * GET /api/admin/epic-categories/:id
 * Get category details
 */
router.get('/epic-categories/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const category = await epicCategoriesRepository.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[Admin] Epic category error:', error);
    res.status(500).json({ success: false, error: 'Failed to get epic category' });
  }
});

/**
 * PATCH /api/admin/epic-categories/:id
 * Update category
 */
router.patch('/epic-categories/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const category = await epicCategoriesRepository.update(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'update_epic_category',
      entity_type: 'epic_category',
      entity_id: category.id,
      details: { name: category.name },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[Admin] Epic category update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update epic category' });
  }
});

/**
 * POST /api/admin/epic-categories
 * Create custom category
 */
router.post('/epic-categories', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const category = await epicCategoriesRepository.create(req.body);

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'create_epic_category',
      entity_type: 'epic_category',
      entity_id: category.id,
      details: { name: category.name },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[Admin] Epic category create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create epic category' });
  }
});

/**
 * DELETE /api/admin/epic-categories/:id
 * Delete category
 */
router.delete('/epic-categories/:id', requireAdminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const category = await epicCategoriesRepository.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const deleted = await epicCategoriesRepository.delete(req.params.id);
    if (!deleted) {
      return res.status(400).json({ success: false, error: 'Failed to delete category' });
    }

    await adminRepository.logAction({
      admin_id: req.admin!.id,
      action: 'delete_epic_category',
      entity_type: 'epic_category',
      entity_id: req.params.id,
      details: { name: category.name },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Epic category delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete epic category' });
  }
});

export default router;
