/**
 * Config Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate config routes to use tenant routing.
 *
 * Key changes from original config.routes.ts:
 * 1. Added tenantMiddleware and requireTenant (IMPORTANT: original had no auth middleware!)
 * 2. Use req.tenantDb instead of configService
 * 3. Removed organization_id query parameter (already scoped to tenant)
 * 4. Direct MongoDB collection access via req.tenantDb for per-tenant config
 * 5. Added TenantRequest type for all handlers
 *
 * SECURITY NOTE: The original config.routes.ts had NO auth middleware, which is a critical security risk.
 * This version adds proper authentication and tenant isolation.
 *
 * NOTE: Configuration could alternatively be stored in PostgreSQL as system-wide settings.
 * This implementation stores them in tenant MongoDB for per-tenant customization.
 *
 * Migration pattern:
 * BEFORE: const taskTypes = await configService.getTaskTypes(organizationId);
 * AFTER:  const taskTypes = await req.tenantDb.configTaskTypes().find({}).toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
// IMPORTANT: Original config.routes.ts had NO auth middleware - adding it here for security
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * GET /config
 * Get all configuration data in a single call
 *
 * CHANGES:
 * - Query all config collections from tenant database
 * - Removed organization_id query parameter (already scoped)
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    // Query all configuration types in parallel
    const [taskTypes, priorities, statuses, roles, navItems, themeColors] = await Promise.all([
      req.tenantDb!.collection('config_task_types').find({ deleted: { $ne: true } }).toArray(),
      req.tenantDb!.collection('config_priorities').find({ deleted: { $ne: true } }).toArray(),
      req.tenantDb!.collection('config_statuses').find({ deleted: { $ne: true } }).toArray(),
      req.tenantDb!.collection('config_roles').find({ deleted: { $ne: true } }).toArray(),
      req.tenantDb!.collection('config_nav_items').find({ deleted: { $ne: true } }).toArray(),
      req.tenantDb!.collection('config_theme_colors').find({ deleted: { $ne: true } }).toArray(),
    ]);

    res.json({
      taskTypes,
      priorities,
      statuses,
      roles,
      navItems,
      themeColors,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /config/task-types
 * Get task type configurations
 */
router.get('/task-types', async (req: TenantRequest, res: Response) => {
  try {
    const taskTypes = await req.tenantDb!.collection('config_task_types')
      .find({ deleted: { $ne: true } })
      .toArray();
    res.json(taskTypes);
  } catch (error) {
    console.error('Error fetching task types:', error);
    res.status(500).json({ error: 'Failed to fetch task types' });
  }
});

/**
 * GET /config/priorities
 * Get priority configurations
 */
router.get('/priorities', async (req: TenantRequest, res: Response) => {
  try {
    const priorities = await req.tenantDb!.collection('config_priorities')
      .find({ deleted: { $ne: true } })
      .toArray();
    res.json(priorities);
  } catch (error) {
    console.error('Error fetching priorities:', error);
    res.status(500).json({ error: 'Failed to fetch priorities' });
  }
});

/**
 * GET /config/statuses
 * Get status configurations
 */
router.get('/statuses', async (req: TenantRequest, res: Response) => {
  try {
    const statuses = await req.tenantDb!.collection('config_statuses')
      .find({ deleted: { $ne: true } })
      .toArray();
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

/**
 * GET /config/roles
 * Get role configurations
 */
router.get('/roles', async (req: TenantRequest, res: Response) => {
  try {
    const roles = await req.tenantDb!.collection('config_roles')
      .find({ deleted: { $ne: true } })
      .toArray();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /config/navigation
 * Get navigation items (both main and doc types)
 */
router.get('/navigation', async (req: TenantRequest, res: Response) => {
  try {
    const navItems = await req.tenantDb!.collection('config_nav_items')
      .find({ deleted: { $ne: true } })
      .toArray();

    res.json({
      main: navItems.filter((item: any) => item.type === 'main'),
      doc: navItems.filter((item: any) => item.type === 'doc'),
    });
  } catch (error) {
    console.error('Error fetching navigation:', error);
    res.status(500).json({ error: 'Failed to fetch navigation' });
  }
});

/**
 * GET /config/theme-colors
 * Get theme color configurations
 */
router.get('/theme-colors', async (req: TenantRequest, res: Response) => {
  try {
    const colors = await req.tenantDb!.collection('config_theme_colors')
      .find({ deleted: { $ne: true } })
      .toArray();
    res.json(colors);
  } catch (error) {
    console.error('Error fetching theme colors:', error);
    res.status(500).json({ error: 'Failed to fetch theme colors' });
  }
});

/**
 * POST /config/task-types
 * Create a new task type configuration (admin only)
 */
router.post('/task-types', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;

    // Only admins can create config
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const taskType = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_task_types').insertOne(taskType);
    res.status(201).json(taskType);
  } catch (error) {
    console.error('Error creating task type:', error);
    res.status(500).json({ error: 'Failed to create task type' });
  }
});

/**
 * PATCH /config/task-types/:id
 * Update a task type configuration (admin only)
 */
router.patch('/task-types/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    const result = await req.tenantDb!.collection('config_task_types').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Task type not found' });
    }

    const taskType = await req.tenantDb!.collection('config_task_types').findOne({ id: req.params.id });
    res.json(taskType);
  } catch (error) {
    console.error('Error updating task type:', error);
    res.status(500).json({ error: 'Failed to update task type' });
  }
});

// Similar patterns for priorities, statuses, roles, navigation, theme-colors
// Implementing create and update endpoints for each type

/**
 * POST /config/priorities
 */
router.post('/priorities', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const priority = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_priorities').insertOne(priority);
    res.status(201).json(priority);
  } catch (error) {
    console.error('Error creating priority:', error);
    res.status(500).json({ error: 'Failed to create priority' });
  }
});

/**
 * PATCH /config/priorities/:id
 */
router.patch('/priorities/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const result = await req.tenantDb!.collection('config_priorities').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Priority not found' });
    }

    const priority = await req.tenantDb!.collection('config_priorities').findOne({ id: req.params.id });
    res.json(priority);
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

/**
 * POST /config/statuses
 */
router.post('/statuses', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const status = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_statuses').insertOne(status);
    res.status(201).json(status);
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

/**
 * PATCH /config/statuses/:id
 */
router.patch('/statuses/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const result = await req.tenantDb!.collection('config_statuses').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    const statusItem = await req.tenantDb!.collection('config_statuses').findOne({ id: req.params.id });
    res.json(statusItem);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /config/roles
 */
router.post('/roles', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const role = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_roles').insertOne(role);
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PATCH /config/roles/:id
 */
router.patch('/roles/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const result = await req.tenantDb!.collection('config_roles').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = await req.tenantDb!.collection('config_roles').findOne({ id: req.params.id });
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * POST /config/navigation
 */
router.post('/navigation', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const navItem = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_nav_items').insertOne(navItem);
    res.status(201).json(navItem);
  } catch (error) {
    console.error('Error creating nav item:', error);
    res.status(500).json({ error: 'Failed to create navigation item' });
  }
});

/**
 * PATCH /config/navigation/:id
 */
router.patch('/navigation/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const result = await req.tenantDb!.collection('config_nav_items').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Navigation item not found' });
    }

    const navItem = await req.tenantDb!.collection('config_nav_items').findOne({ id: req.params.id });
    res.json(navItem);
  } catch (error) {
    console.error('Error updating nav item:', error);
    res.status(500).json({ error: 'Failed to update navigation item' });
  }
});

/**
 * POST /config/theme-colors
 */
router.post('/theme-colors', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date().toISOString();
    const color = {
      id: generateUUID(),
      ...req.body,
      deleted: false,
      created_at: now,
      updated_at: now,
    };

    await req.tenantDb!.collection('config_theme_colors').insertOne(color);
    res.status(201).json(color);
  } catch (error) {
    console.error('Error creating theme color:', error);
    res.status(500).json({ error: 'Failed to create theme color' });
  }
});

/**
 * PATCH /config/theme-colors/:id
 */
router.patch('/theme-colors/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const result = await req.tenantDb!.collection('config_theme_colors').updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Theme color not found' });
    }

    const color = await req.tenantDb!.collection('config_theme_colors').findOne({ id: req.params.id });
    res.json(color);
  } catch (error) {
    console.error('Error updating theme color:', error);
    res.status(500).json({ error: 'Failed to update theme color' });
  }
});

/**
 * DELETE /config/:type/:id
 * Soft delete a configuration (admin only)
 */
router.delete('/:type/:id', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, id } = req.params;
    const collectionName = `config_${type.replace(/-/g, '_')}`;

    const result = await req.tenantDb!.collection(collectionName).updateOne(
      { id },
      { $set: { deleted: true, deleted_at: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

export default router;
