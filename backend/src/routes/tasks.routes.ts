import { Router, Response } from 'express';
import { tasksService } from '../services/tasks.service.js';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/notification.service.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all tasks (filtered by user's accessible projects)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { project_id, sprint_id, assignee_id, reporter_id, user_id } = req.query;

  // If no user, return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // Get user's accessible projects (filtered by organization)
  const accessibleProjects = await projectsService.getAllForUser(user.id, user.isAdmin, user.organizationId);
  const accessibleProjectIds = new Set(accessibleProjects.map(p => p.id));

  // Get tasks with filters
  const allTasks = await tasksService.getAll({
    project_id: project_id as string,
    sprint_id: sprint_id as string,
    assignee_id: assignee_id as string,
    reporter_id: reporter_id as string,
    user_id: user_id as string,
  });

  // Filter tasks to only those from accessible projects
  const filteredTasks = allTasks.filter(task => accessibleProjectIds.has(task.project_id));

  // Add permissions to each task
  const tasksWithPermissions = await Promise.all(
    filteredTasks.map(async (task) => {
      const permissions = await tasksService.getTaskPermissions(task.id, user.id, user.isAdmin);
      return { ...task, permissions };
    })
  );

  res.json({ success: true, data: tasksWithPermissions });
});

// Get task by ID or task_key (with permissions)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const task = await tasksService.getById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Add permissions if user is authenticated
  if (user) {
    const permissions = await tasksService.getTaskPermissions(task.id, user.id, user.isAdmin);
    return res.json({ success: true, data: { ...task, permissions } });
  }

  res.json({ success: true, data: task });
});

// Create task
router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { project_id, title, description, type, priority, points, assignee_id, reporter_id, sprint_id, column_id, due_date, start_date, parent_epic_id } = req.body;

  if (!project_id || !title) {
    return res.status(400).json({
      success: false,
      error: 'project_id and title are required',
    });
  }

  const task = await tasksService.create({
    project_id,
    title,
    description,
    type,
    priority,
    points,
    assignee_id,
    reporter_id,
    sprint_id,
    column_id,
    due_date,
    start_date,
    parent_epic_id,
  });

  // Send notification if task is assigned to someone (and user is authenticated)
  if (task && assignee_id && user) {
    // Fire and forget - don't block the response
    notificationService.notifyTaskAssigned(task.id, assignee_id, user.id).catch(err => {
      console.error('Error sending task assignment notification:', err);
    });
  }

  res.status(201).json({ success: true, data: task });
});

// Update task (with permission check)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Get the existing task to check for assignee changes
  const existingTask = await tasksService.getById(taskId);
  if (!existingTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get permissions for this task
  const permissions = await tasksService.getTaskPermissions(taskId, user.id, user.isAdmin);

  // Check if this is a status-only update
  const isStatusOnly = tasksService.isStatusOnlyUpdate(req.body);

  // If not a status-only update, user needs full edit permission
  if (!isStatusOnly && !permissions.canEdit) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to edit this task. Only the reporter, admins, or project owners can edit.'
    });
  }

  // For status-only updates, user needs at least canChangeStatus permission
  if (isStatusOnly && !permissions.canChangeStatus) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to change the status of this task.'
    });
  }

  const task = await tasksService.update(taskId, req.body);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

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

// Delete task (with permission check)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Get permissions for this task
  const permissions = await tasksService.getTaskPermissions(taskId, user.id, user.isAdmin);

  if (!permissions.canDelete) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to delete this task. Only the reporter, admins, or project owners can delete.'
    });
  }

  const deleted = await tasksService.delete(taskId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, message: 'Task deleted' });
});

// Move task to column (status change - allowed for all members)
router.post('/:id/move', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;
  const { column_id } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!column_id) {
    return res.status(400).json({ success: false, error: 'column_id is required' });
  }

  // Get permissions for this task
  const permissions = await tasksService.getTaskPermissions(taskId, user.id, user.isAdmin);

  if (!permissions.canChangeStatus) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to change the status of this task.'
    });
  }

  const task = await tasksService.moveToColumn(taskId, column_id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Assign task to sprint (requires edit permission)
router.post('/:id/sprint', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;
  const { sprint_id } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Get permissions for this task
  const permissions = await tasksService.getTaskPermissions(taskId, user.id, user.isAdmin);

  if (!permissions.canEdit) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to assign this task to a sprint.'
    });
  }

  const task = await tasksService.assignToSprint(taskId, sprint_id || null);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// --- Subtask Management ---

// Get subtasks for a task
router.get('/:id/subtasks', async (req, res) => {
  const subtasks = await tasksService.getSubtasks(req.params.id);
  res.json({ success: true, data: subtasks });
});

// Create subtask
router.post('/:id/subtasks', async (req, res) => {
  const { title, assignee_id } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  const subtask = await tasksService.createSubtask(req.params.id, { title, assignee_id });
  res.status(201).json({ success: true, data: subtask });
});

// Update subtask
router.patch('/:taskId/subtasks/:subtaskId', async (req, res) => {
  const subtask = await tasksService.updateSubtask(req.params.subtaskId, req.body);
  if (!subtask) {
    return res.status(404).json({ success: false, error: 'Subtask not found' });
  }
  res.json({ success: true, data: subtask });
});

// Delete subtask
router.delete('/:taskId/subtasks/:subtaskId', async (req, res) => {
  const deleted = await tasksService.deleteSubtask(req.params.subtaskId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Subtask not found' });
  }
  res.json({ success: true, message: 'Subtask deleted' });
});

// --- Task Links (Dependencies) ---

// Get task links (blocked by and blocks)
router.get('/:id/links', async (req, res) => {
  try {
    const links = await tasksService.getTaskLinks(req.params.id);
    res.json({ success: true, data: links });
  } catch (error: any) {
    console.error('Error fetching task links:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch task links' } });
  }
});

// Get available tasks for linking
router.get('/:id/available-links', async (req, res) => {
  try {
    const tasks = await tasksService.getAvailableLinksForTask(req.params.id);
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error fetching available links:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch available links' } });
  }
});

// Add a blocking task link
router.post('/:id/links', async (req: AuthRequest, res) => {
  try {
    const { blocking_task_id, link_type } = req.body;

    if (!blocking_task_id) {
      return res.status(400).json({ success: false, error: { message: 'blocking_task_id is required' } });
    }

    const link = await tasksService.addTaskLink(req.params.id, blocking_task_id, link_type, req.user?.id);
    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    console.error('Error adding task link:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to add task link' } });
  }
});

// Remove a task link
router.delete('/:id/links/:linkId', async (req, res) => {
  try {
    const deleted = await tasksService.removeTaskLink(req.params.linkId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Link not found' } });
    }
    res.json({ success: true, message: 'Link removed' });
  } catch (error: any) {
    console.error('Error removing task link:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to remove task link' } });
  }
});

export default router;
