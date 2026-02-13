import { Router, Response } from 'express';
import { requireAuth, requireAdmin, requireOrgAdmin, AuthRequest } from '../middleware/auth.middleware.js';
import { tenantsRepository } from '../db/postgres/repositories/tenants.repository.js';
import { usersRepository } from '../db/postgres/repositories/users.repository.js';
import { initializeTenantDb, dropTenantDb, listTenantDbs } from '../db/mongo/tenant-router.js';
import { projectsRepository } from '../db/mongo/repositories/projects.repository.js';
import { tasksRepository } from '../db/mongo/repositories/tasks.repository.js';

const router = Router();

/**
 * GET /api/tenants/current
 * Get the current user's tenant
 */
router.get('/current', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(404).json({
        success: false,
        error: 'No tenant associated with user',
      });
    }

    const tenant = await tenantsRepository.findById(req.user.tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logo_url,
        plan: tenant.plan_id,
        subscriptionStatus: tenant.subscription_status,
        settings: tenant.settings,
        createdAt: tenant.created_at,
      },
    });
  } catch (error) {
    console.error('[Tenants] Error getting current tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to get tenant' });
  }
});

/**
 * GET /api/tenants/:id
 * Get tenant by ID (admin only)
 */
router.get('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await tenantsRepository.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('[Tenants] Error getting tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to get tenant' });
  }
});

/**
 * GET /api/tenants
 * List all tenants (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const tenants = await tenantsRepository.findAll(limit, offset);
    const total = await tenantsRepository.count();

    res.json({
      success: true,
      data: tenants,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error('[Tenants] Error listing tenants:', error);
    res.status(500).json({ success: false, error: 'Failed to list tenants' });
  }
});

/**
 * POST /api/tenants
 * Create a new tenant (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, domain, logoUrl, planId } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Name and slug are required',
      });
    }

    // Check if slug is already taken
    const existing = await tenantsRepository.findBySlug(slug);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Slug is already taken',
      });
    }

    const tenant = await tenantsRepository.create({
      name,
      slug,
      domain,
      logo_url: logoUrl,
      plan_id: planId,
    });

    // Initialize tenant's MongoDB database
    await initializeTenantDb(tenant.id);

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('[Tenants] Error creating tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to create tenant' });
  }
});

/**
 * PATCH /api/tenants/current
 * Update current tenant settings
 */
router.patch('/current', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(404).json({
        success: false,
        error: 'No tenant associated with user',
      });
    }

    // Only admins can update tenant
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required to update tenant',
      });
    }

    const { name, domain, logoUrl, settings } = req.body;

    const tenant = await tenantsRepository.update(req.user.tenantId, {
      name,
      domain,
      logo_url: logoUrl,
      settings,
    });

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('[Tenants] Error updating tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

/**
 * PATCH /api/tenants/:id
 * Update tenant (admin only)
 */
router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await tenantsRepository.update(req.params.id, req.body);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('[Tenants] Error updating tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /api/tenants/:id
 * Soft delete tenant (admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const success = await tenantsRepository.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      message: 'Tenant deleted',
    });
  } catch (error) {
    console.error('[Tenants] Error deleting tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tenant' });
  }
});

/**
 * GET /api/tenants/databases
 * List all tenant databases (admin only)
 */
router.get('/databases', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantIds = await listTenantDbs();

    res.json({
      success: true,
      data: tenantIds.map(id => ({
        tenantId: id,
        databaseName: `tenant_${id}`,
      })),
      total: tenantIds.length,
    });
  } catch (error) {
    console.error('[Tenants] Error listing tenant databases:', error);
    res.status(500).json({ success: false, error: 'Failed to list tenant databases' });
  }
});

/**
 * GET /api/tenants/:id/users
 * List users in a tenant
 */
router.get('/:id/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Users can only see their own tenant's users
    if (req.user?.tenantId !== req.params.id && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const users = await usersRepository.findByTenant(req.params.id);
    const count = await usersRepository.count(req.params.id);

    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      total: count,
    });
  } catch (error) {
    console.error('[Tenants] Error listing tenant users:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

// =====================================================
// ORG ADMIN ENDPOINTS (Tenant Admin Dashboard)
// These require isOrgAdmin (detected from Entra ID roles)
// =====================================================

/**
 * GET /api/tenants/admin/dashboard
 * Get org admin dashboard with all projects, users, and stats
 * Only accessible by org admins (Entra global/directory admins)
 */
router.get('/admin/dashboard', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    // Get tenant info
    const tenant = await tenantsRepository.findById(tenantId);

    // Get all users in tenant
    const users = await usersRepository.findByTenant(tenantId);
    const userCount = users.length;

    // Get all projects in tenant
    const projects = await projectsRepository.findByTenant(tenantId);
    const projectCount = projects.length;

    // Get task counts per project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await tasksRepository.count({ project_id: project.id });
        const owner = users.find(u => u.id === project.owner_id);
        return {
          id: project.id,
          name: project.name,
          code: project.code,
          description: project.description,
          color: project.color,
          status: project.status,
          visibility: project.visibility,
          taskCount,
          owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };
      })
    );

    // Calculate stats
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const recentLogins = users.filter(u => {
      if (!u.last_login_at) return false;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(u.last_login_at) > dayAgo;
    }).length;

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant?.id,
          name: tenant?.name,
          slug: tenant?.slug,
          domain: tenant?.domain,
          createdAt: tenant?.created_at,
        },
        stats: {
          totalUsers: userCount,
          activeUsers,
          recentLogins,
          totalProjects: projectCount,
          activeProjects,
        },
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          avatarUrl: u.avatar_url,
          lastLoginAt: u.last_login_at,
          loginCount: u.login_count,
          createdAt: u.created_at,
        })),
        projects: projectsWithStats,
      },
    });
  } catch (error) {
    console.error('[Tenants] Error getting admin dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

/**
 * GET /api/tenants/admin/projects
 * List all projects in tenant (org admin only)
 */
router.get('/admin/projects', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    const projects = await projectsRepository.findByTenant(tenantId);
    const users = await usersRepository.findByTenant(tenantId);

    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await tasksRepository.count({ project_id: project.id });
        const owner = users.find(u => u.id === project.owner_id);
        return {
          id: project.id,
          name: project.name,
          code: project.code,
          description: project.description,
          color: project.color,
          status: project.status,
          visibility: project.visibility,
          taskCount,
          owner: owner ? { id: owner.id, name: owner.name, email: owner.email, avatarUrl: owner.avatar_url } : null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithDetails,
      total: projects.length,
    });
  } catch (error) {
    console.error('[Tenants] Error listing admin projects:', error);
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
});

/**
 * GET /api/tenants/admin/users
 * List all users in tenant with detailed info (org admin only)
 */
router.get('/admin/users', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    const users = await usersRepository.findByTenant(tenantId);
    const projects = await projectsRepository.findByTenant(tenantId);

    // Get projects owned by each user
    const usersWithDetails = users.map(u => {
      const ownedProjects = projects.filter(p => p.owner_id === u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        lastLoginAt: u.last_login_at,
        loginCount: u.login_count,
        emailVerified: u.email_verified,
        projectsOwned: ownedProjects.length,
        ownedProjectNames: ownedProjects.map(p => ({ id: p.id, name: p.name, code: p.code })),
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      };
    });

    res.json({
      success: true,
      data: usersWithDetails,
      total: users.length,
    });
  } catch (error) {
    console.error('[Tenants] Error listing admin users:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

/**
 * PATCH /api/tenants/admin/users/:userId
 * Update user role/status (org admin only)
 */
router.patch('/admin/users/:userId', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { userId } = req.params;
    const { role, status } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    // Verify user belongs to same tenant
    const user = await usersRepository.findById(userId);
    if (!user || user.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, error: 'User not found in tenant' });
    }

    // Prevent demoting yourself
    if (userId === req.user?.id && role && role !== user.role) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }

    const updatedUser = await usersRepository.update(userId, { role, status });

    res.json({
      success: true,
      data: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        role: updatedUser?.role,
        status: updatedUser?.status,
      },
    });
  } catch (error) {
    console.error('[Tenants] Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

export default router;
