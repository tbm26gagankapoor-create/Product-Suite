/**
 * Tasks Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate tasks routes to use tenant routing.
 *
 * Key changes from original tasks.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of tasksService and database helper
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. Inlined permission checks (no longer use tasksService.getTaskPermissions)
 * 7. Inlined project access checks (no longer use projectsService.getAllForUser)
 *
 * Migration pattern:
 * BEFORE: const tasks = await tasksService.getAllPaginated({ organization_id, ... });
 * AFTER:  const tasks = await req.tenantDb.tasks().find({ ... }).skip().limit().toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { notificationService } from '../services/notification.service.js';
import { createTaskSchema, updateTaskSchema, moveTaskSchema, validate } from '../lib/validators.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * Helper: Get accessible project IDs for user
 * Replaces projectsService.getAllForUser()
 */
async function getAccessibleProjectIds(tenantDb: any, userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    // Admins can access all projects in the tenant
    const projects = await tenantDb.projects().find({}).toArray();
    return projects.map((p: any) => p.id);
  }

  // Non-admins can access projects where they are owner or team member
  const projects = await tenantDb.projects().find({
    $or: [
      { owner_id: userId },
      { owner_ids: userId }
    ]
  }).toArray();

  return projects.map((p: any) => p.id);
}

/**
 * Helper: Get task permissions for user
 * Inlined from tasksService.getTaskPermissions()
 */
async function getTaskPermissions(tenantDb: any, taskId: string, userId: string, isAdmin: boolean) {
  const task = await tenantDb.tasks().findOne({ id: taskId });
  if (!task) {
    return { canEdit: false, canDelete: false, canChangeStatus: false };
  }

  // Get project to check ownership
  const project = await tenantDb.projects().findOne({ id: task.project_id });
  if (!project) {
    return { canEdit: false, canDelete: false, canChangeStatus: false };
  }

  // Admin or project owner can do everything
  const isProjectOwner = project.owner_id === userId || (project.owner_ids && project.owner_ids.includes(userId));
  if (isAdmin || isProjectOwner) {
    return { canEdit: true, canDelete: true, canChangeStatus: true };
  }

  // Task reporter can edit and delete
  const isReporter = task.reporter_id === userId;
  if (isReporter) {
    return { canEdit: true, canDelete: true, canChangeStatus: true };
  }

  // Anyone in the project can change status
  return { canEdit: false, canDelete: false, canChangeStatus: true };
}

/**
 * Helper: Batch get permissions for multiple tasks
 * Optimized version to avoid N+1 queries
 */
async function getTaskPermissionsBatch(tenantDb: any, tasks: any[], userId: string, isAdmin: boolean): Promise<Map<string, any>> {
  const permissionsMap = new Map();

  // Get all unique project IDs
  const projectIds = [...new Set(tasks.map(t => t.project_id))];

  // Fetch all projects in one query
  const projects = await tenantDb.projects().find({ id: { $in: projectIds } }).toArray();
  const projectsMap = new Map(projects.map((p: any) => [p.id, p]));

  // Calculate permissions for each task
  for (const task of tasks) {
    const project = projectsMap.get(task.project_id);
    if (!project) {
      permissionsMap.set(task.id, { canEdit: false, canDelete: false, canChangeStatus: false });
      continue;
    }

    const isProjectOwner = project.owner_id === userId || (project.owner_ids && project.owner_ids.includes(userId));
    const isReporter = task.reporter_id === userId;

    if (isAdmin || isProjectOwner) {
      permissionsMap.set(task.id, { canEdit: true, canDelete: true, canChangeStatus: true });
    } else if (isReporter) {
      permissionsMap.set(task.id, { canEdit: true, canDelete: true, canChangeStatus: true });
    } else {
      permissionsMap.set(task.id, { canEdit: false, canDelete: false, canChangeStatus: true });
    }
  }

  return permissionsMap;
}

/**
 * Helper: Check if update is status-only
 */
function isStatusOnlyUpdate(body: any): boolean {
  const statusFields = ['status', 'column_id'];
  const bodyKeys = Object.keys(body);
  return bodyKeys.length > 0 && bodyKeys.every(key => statusFields.includes(key));
}

/**
 * GET /tasks
 * Get all tasks (filtered by user's accessible projects) - with pagination
 *
 * CHANGES:
 * - Removed organization_id filter (already scoped to tenant database)
 * - Direct query to tenant database instead of tasksService
 * - Inlined project access check
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { project_id, sprint_id, assignee_id, reporter_id, user_id, page, limit } = req.query;

  // Get user's accessible project IDs
  const accessibleProjectIds = await getAccessibleProjectIds(req.tenantDb!, user.id, user.isAdmin);

  // If filtering by project_id, verify user has access
  if (project_id && !accessibleProjectIds.includes(project_id as string)) {
    return res.json({ success: true, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false } });
  }

  // Build filter
  const filter: any = {};

  // Filter by accessible projects (unless specific project_id is provided)
  if (project_id) {
    filter.project_id = project_id;
  } else {
    filter.project_id = { $in: accessibleProjectIds };
  }

  // Additional filters
  if (sprint_id) filter.sprint_id = sprint_id;
  if (assignee_id) filter.assignee_id = assignee_id;
  if (reporter_id) filter.reporter_id = reporter_id;
  if (user_id) {
    filter.$or = [
      { assignee_id: user_id },
      { reporter_id: user_id }
    ];
  }

  // Pagination
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 50, 200);
  const skip = (pageNum - 1) * limitNum;

  // Query tasks with pagination
  const [tasks, total] = await Promise.all([
    req.tenantDb!.tasks()
      .find(filter)
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    req.tenantDb!.tasks().countDocuments(filter)
  ]);

  // Batch add permissions
  const permissionsMap = await getTaskPermissionsBatch(req.tenantDb!, tasks, user.id, user.isAdmin);
  const tasksWithPermissions = tasks.map(task => ({
    ...task,
    permissions: permissionsMap.get(task.id),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasMore = pageNum < totalPages;

  res.json({
    success: true,
    data: tasksWithPermissions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasMore,
    },
  });
});

/**
 * GET /tasks/:id
 * Get task by ID (with permissions)
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Inlined permission calculation
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const task = await req.tenantDb!.tasks().findOne({ id: req.params.id });

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Add permissions
  const permissions = await getTaskPermissions(req.tenantDb!, task.id, user.id, user.isAdmin);

  res.json({ success: true, data: { ...task, permissions } });
});

/**
 * POST /tasks
 * Create task
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - No organization_id needed (implicit from tenant context)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Validate request body
  const validation = validate(createTaskSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  const { project_id, title, description, type, priority, points, assignee_id, reporter_id, sprint_id, column_id, due_date, start_date, parent_epic_id } = validation.data;

  // Create task
  const now = new Date().toISOString();
  const task = {
    id: generateUUID(),
    project_id,
    title,
    description: description || null,
    type: type || 'task',
    priority: priority || 'medium',
    status: 'todo',
    points: points || null,
    assignee_id: assignee_id || null,
    reporter_id: reporter_id || user.id,
    sprint_id: sprint_id || null,
    column_id: column_id || null,
    due_date: due_date || null,
    start_date: start_date || null,
    parent_epic_id: parent_epic_id || null,
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.tasks().insertOne(task);

  // Send notification if task is assigned to someone
  if (assignee_id) {
    // Fire and forget - don't block the response
    notificationService.notifyTaskAssigned(task.id, assignee_id, user.id).catch(err => {
      console.error('Error sending task assignment notification:', err);
    });
  }

  res.status(201).json({ success: true, data: task });
});

/**
 * PATCH /tasks/:id
 * Update task (with permission check)
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const taskId = req.params.id;

  // Get the existing task
  const existingTask = await req.tenantDb!.tasks().findOne({ id: taskId });
  if (!existingTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get permissions for this task
  const permissions = await getTaskPermissions(req.tenantDb!, taskId, user.id, user.isAdmin);

  // Check if this is a status-only update
  const statusOnly = isStatusOnlyUpdate(req.body);

  // If not a status-only update, user needs full edit permission
  if (!statusOnly && !permissions.canEdit) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to edit this task. Only the reporter, admins, or project owners can edit.'
    });
  }

  // For status-only updates, user needs at least canChangeStatus permission
  if (statusOnly && !permissions.canChangeStatus) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to change the status of this task.'
    });
  }

  // Update task
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await req.tenantDb!.tasks().updateOne(
    { id: taskId },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get updated task
  const task = await req.tenantDb!.tasks().findOne({ id: taskId });

  // Check if assignee changed - send notification
  const newAssigneeId = req.body.assignee_id;
  if (newAssigneeId && newAssigneeId !== existingTask.assignee_id) {
    // Fire and forget - don't block the response
    notificationService.notifyTaskAssigned(taskId, newAssigneeId, user.id).catch(err => {
      console.error('Error sending task assignment notification:', err);
    });
  }

  res.json({ success: true, data: task });
});

/**
 * DELETE /tasks/:id
 * Delete task (with permission check)
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const taskId = req.params.id;

  // Get permissions for this task
  const permissions = await getTaskPermissions(req.tenantDb!, taskId, user.id, user.isAdmin);

  if (!permissions.canDelete) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to delete this task. Only the reporter, admins, or project owners can delete.'
    });
  }

  const result = await req.tenantDb!.tasks().deleteOne({ id: taskId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  res.json({ success: true, message: 'Task deleted' });
});

/**
 * POST /tasks/:id/move
 * Move task to column (status change - allowed for all members)
 */
router.post('/:id/move', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const taskId = req.params.id;

  // Validate request body
  const validation = validate(moveTaskSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  const { column_id } = validation.data;

  // Get permissions for this task
  const permissions = await getTaskPermissions(req.tenantDb!, taskId, user.id, user.isAdmin);

  if (!permissions.canChangeStatus) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to change the status of this task.'
    });
  }

  // Update task
  const result = await req.tenantDb!.tasks().updateOne(
    { id: taskId },
    { $set: { column_id, updated_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get updated task
  const task = await req.tenantDb!.tasks().findOne({ id: taskId });

  res.json({ success: true, data: task });
});

/**
 * POST /tasks/:id/sprint
 * Assign task to sprint (requires edit permission)
 */
router.post('/:id/sprint', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const taskId = req.params.id;
  const { sprint_id } = req.body;

  // Get permissions for this task
  const permissions = await getTaskPermissions(req.tenantDb!, taskId, user.id, user.isAdmin);

  if (!permissions.canEdit) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to assign this task to a sprint.'
    });
  }

  // Update task
  const result = await req.tenantDb!.tasks().updateOne(
    { id: taskId },
    { $set: { sprint_id: sprint_id || null, updated_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get updated task
  const task = await req.tenantDb!.tasks().findOne({ id: taskId });

  res.json({ success: true, data: task });
});

/**
 * --- Subtask Management ---
 * NOTE: These routes use a simplified subtask model
 * In production, you may want a separate subtasks collection
 */

/**
 * GET /tasks/:id/subtasks
 * Get subtasks for a task
 */
router.get('/:id/subtasks', async (req: TenantRequest, res: Response) => {
  const task = await req.tenantDb!.tasks().findOne({ id: req.params.id });

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Subtasks are stored in the task document
  const subtasks = task.subtasks || [];

  res.json({ success: true, data: subtasks });
});

/**
 * POST /tasks/:id/subtasks
 * Create subtask
 */
router.post('/:id/subtasks', async (req: TenantRequest, res: Response) => {
  const { title, assignee_id } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  const subtask = {
    id: generateUUID(),
    title,
    assignee_id: assignee_id || null,
    completed: false,
    created_at: new Date().toISOString(),
  };

  // Add subtask to task's subtasks array
  const result = await req.tenantDb!.tasks().updateOne(
    { id: req.params.id },
    { $push: { subtasks: subtask } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  res.status(201).json({ success: true, data: subtask });
});

/**
 * PATCH /tasks/:taskId/subtasks/:subtaskId
 * Update subtask
 */
router.patch('/:taskId/subtasks/:subtaskId', async (req: TenantRequest, res: Response) => {
  const { taskId, subtaskId } = req.params;

  // Get task
  const task = await req.tenantDb!.tasks().findOne({ id: taskId });
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Find and update subtask
  const subtasks = task.subtasks || [];
  const subtaskIndex = subtasks.findIndex((s: any) => s.id === subtaskId);

  if (subtaskIndex === -1) {
    return res.status(404).json({ success: false, error: 'Subtask not found' });
  }

  // Update subtask fields
  const updatedSubtask = { ...subtasks[subtaskIndex], ...req.body };
  subtasks[subtaskIndex] = updatedSubtask;

  // Update task
  await req.tenantDb!.tasks().updateOne(
    { id: taskId },
    { $set: { subtasks, updated_at: new Date().toISOString() } }
  );

  res.json({ success: true, data: updatedSubtask });
});

/**
 * DELETE /tasks/:taskId/subtasks/:subtaskId
 * Delete subtask
 */
router.delete('/:taskId/subtasks/:subtaskId', async (req: TenantRequest, res: Response) => {
  const { taskId, subtaskId } = req.params;

  // Remove subtask from task's subtasks array
  const result = await req.tenantDb!.tasks().updateOne(
    { id: taskId },
    { $pull: { subtasks: { id: subtaskId } } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  res.json({ success: true, message: 'Subtask deleted' });
});

/**
 * --- Task Links (Dependencies) ---
 * NOTE: These routes assume task links are stored in a separate collection or embedded
 * Adjust based on your actual data model
 */

/**
 * GET /tasks/:id/links
 * Get task links (blocked by and blocks)
 */
router.get('/:id/links', async (req: TenantRequest, res: Response) => {
  try {
    const task = await req.tenantDb!.tasks().findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Assuming links are stored in the task document
    const links = task.links || { blocks: [], blocked_by: [] };

    res.json({ success: true, data: links });
  } catch (error: any) {
    console.error('Error fetching task links:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch task links' } });
  }
});

/**
 * GET /tasks/:id/available-links
 * Get available tasks for linking
 */
router.get('/:id/available-links', async (req: TenantRequest, res: Response) => {
  try {
    const task = await req.tenantDb!.tasks().findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Get all tasks in the same project (excluding this task)
    const tasks = await req.tenantDb!.tasks().find({
      project_id: task.project_id,
      id: { $ne: req.params.id }
    }).toArray();

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error fetching available links:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch available links' } });
  }
});

/**
 * POST /tasks/:id/links
 * Add a blocking task link
 */
router.post('/:id/links', async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user!;
    const { blocking_task_id, link_type } = req.body;

    if (!blocking_task_id) {
      return res.status(400).json({ success: false, error: { message: 'blocking_task_id is required' } });
    }

    const link = {
      id: generateUUID(),
      task_id: req.params.id,
      blocking_task_id,
      link_type: link_type || 'blocks',
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    // Add link to task's links array
    await req.tenantDb!.tasks().updateOne(
      { id: req.params.id },
      { $push: { 'links.blocks': link } }
    );

    // Add reverse link to blocking task
    await req.tenantDb!.tasks().updateOne(
      { id: blocking_task_id },
      { $push: { 'links.blocked_by': { ...link, task_id: blocking_task_id, blocking_task_id: req.params.id } } }
    );

    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    console.error('Error adding task link:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to add task link' } });
  }
});

/**
 * DELETE /tasks/:id/links/:linkId
 * Remove a task link
 */
router.delete('/:id/links/:linkId', async (req: TenantRequest, res: Response) => {
  try {
    // Remove link from task's links array
    const result = await req.tenantDb!.tasks().updateOne(
      { id: req.params.id },
      { $pull: { 'links.blocks': { id: req.params.linkId } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: { message: 'Link not found' } });
    }

    res.json({ success: true, message: 'Link removed' });
  } catch (error: any) {
    console.error('Error removing task link:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to remove task link' } });
  }
});

export default router;
