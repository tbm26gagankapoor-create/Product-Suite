import { Router, Request, Response } from 'express';
import { configService } from '../services/config.service';

const router = Router();

/**
 * GET /api/v1/config
 * Get all configuration data in a single call
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const config = await configService.getAll(organizationId);
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/v1/config/task-types
 * Get task type configurations
 */
router.get('/task-types', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const taskTypes = await configService.getTaskTypes(organizationId);
    res.json(taskTypes);
  } catch (error) {
    console.error('Error fetching task types:', error);
    res.status(500).json({ error: 'Failed to fetch task types' });
  }
});

/**
 * GET /api/v1/config/priorities
 * Get priority configurations
 */
router.get('/priorities', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const priorities = await configService.getPriorities(organizationId);
    res.json(priorities);
  } catch (error) {
    console.error('Error fetching priorities:', error);
    res.status(500).json({ error: 'Failed to fetch priorities' });
  }
});

/**
 * GET /api/v1/config/statuses
 * Get status configurations
 */
router.get('/statuses', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const statuses = await configService.getStatuses(organizationId);
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

/**
 * GET /api/v1/config/roles
 * Get role configurations
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const roles = await configService.getRoles(organizationId);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/v1/config/navigation
 * Get navigation items (both main and doc types)
 */
router.get('/navigation', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const navItems = await configService.getNavItems(organizationId);
    res.json({
      main: navItems.filter(item => item.type === 'main'),
      doc: navItems.filter(item => item.type === 'doc'),
    });
  } catch (error) {
    console.error('Error fetching navigation:', error);
    res.status(500).json({ error: 'Failed to fetch navigation' });
  }
});

/**
 * GET /api/v1/config/theme-colors
 * Get theme color configurations
 */
router.get('/theme-colors', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organization_id as string | undefined;
    const colors = await configService.getThemeColors(organizationId);
    res.json(colors);
  } catch (error) {
    console.error('Error fetching theme colors:', error);
    res.status(500).json({ error: 'Failed to fetch theme colors' });
  }
});

/**
 * POST /api/v1/config/task-types
 * Create a new task type configuration (admin only)
 */
router.post('/task-types', async (req: Request, res: Response) => {
  try {
    const taskType = await configService.createTaskType(req.body);
    res.status(201).json(taskType);
  } catch (error) {
    console.error('Error creating task type:', error);
    res.status(500).json({ error: 'Failed to create task type' });
  }
});

/**
 * PATCH /api/v1/config/task-types/:id
 * Update a task type configuration (admin only)
 */
router.patch('/task-types/:id', async (req: Request, res: Response) => {
  try {
    const taskType = await configService.updateTaskType(req.params.id, req.body);
    if (!taskType) {
      return res.status(404).json({ error: 'Task type not found' });
    }
    res.json(taskType);
  } catch (error) {
    console.error('Error updating task type:', error);
    res.status(500).json({ error: 'Failed to update task type' });
  }
});

/**
 * POST /api/v1/config/priorities
 * Create a new priority configuration (admin only)
 */
router.post('/priorities', async (req: Request, res: Response) => {
  try {
    const priority = await configService.createPriority(req.body);
    res.status(201).json(priority);
  } catch (error) {
    console.error('Error creating priority:', error);
    res.status(500).json({ error: 'Failed to create priority' });
  }
});

/**
 * PATCH /api/v1/config/priorities/:id
 * Update a priority configuration (admin only)
 */
router.patch('/priorities/:id', async (req: Request, res: Response) => {
  try {
    const priority = await configService.updatePriority(req.params.id, req.body);
    if (!priority) {
      return res.status(404).json({ error: 'Priority not found' });
    }
    res.json(priority);
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

/**
 * POST /api/v1/config/statuses
 * Create a new status configuration (admin only)
 */
router.post('/statuses', async (req: Request, res: Response) => {
  try {
    const status = await configService.createStatus(req.body);
    res.status(201).json(status);
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

/**
 * PATCH /api/v1/config/statuses/:id
 * Update a status configuration (admin only)
 */
router.patch('/statuses/:id', async (req: Request, res: Response) => {
  try {
    const status = await configService.updateStatus(req.params.id, req.body);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/v1/config/roles
 * Create a new role configuration (admin only)
 */
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const role = await configService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PATCH /api/v1/config/roles/:id
 * Update a role configuration (admin only)
 */
router.patch('/roles/:id', async (req: Request, res: Response) => {
  try {
    const role = await configService.updateRole(req.params.id, req.body);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * POST /api/v1/config/navigation
 * Create a new navigation item (admin only)
 */
router.post('/navigation', async (req: Request, res: Response) => {
  try {
    const navItem = await configService.createNavItem(req.body);
    res.status(201).json(navItem);
  } catch (error) {
    console.error('Error creating nav item:', error);
    res.status(500).json({ error: 'Failed to create navigation item' });
  }
});

/**
 * PATCH /api/v1/config/navigation/:id
 * Update a navigation item (admin only)
 */
router.patch('/navigation/:id', async (req: Request, res: Response) => {
  try {
    const navItem = await configService.updateNavItem(req.params.id, req.body);
    if (!navItem) {
      return res.status(404).json({ error: 'Navigation item not found' });
    }
    res.json(navItem);
  } catch (error) {
    console.error('Error updating nav item:', error);
    res.status(500).json({ error: 'Failed to update navigation item' });
  }
});

/**
 * POST /api/v1/config/theme-colors
 * Create a new theme color (admin only)
 */
router.post('/theme-colors', async (req: Request, res: Response) => {
  try {
    const color = await configService.createThemeColor(req.body);
    res.status(201).json(color);
  } catch (error) {
    console.error('Error creating theme color:', error);
    res.status(500).json({ error: 'Failed to create theme color' });
  }
});

/**
 * PATCH /api/v1/config/theme-colors/:id
 * Update a theme color (admin only)
 */
router.patch('/theme-colors/:id', async (req: Request, res: Response) => {
  try {
    const color = await configService.updateThemeColor(req.params.id, req.body);
    if (!color) {
      return res.status(404).json({ error: 'Theme color not found' });
    }
    res.json(color);
  } catch (error) {
    console.error('Error updating theme color:', error);
    res.status(500).json({ error: 'Failed to update theme color' });
  }
});

/**
 * DELETE /api/v1/config/:type/:id
 * Soft delete a configuration (admin only)
 */
router.delete('/:type/:id', async (req: Request, res: Response) => {
  try {
    const success = await configService.deleteConfig(req.params.type, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

export default router;
