import { Router, Response } from 'express';
import { tasksService } from '../services/tasks.sqlite.service.js';
import { projectsService } from '../services/projects.service.js';
import { activityService } from '../services/activity.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all tasks (with filters and access control)
router.get('/', (req: AuthRequest, res: Response) => {
  const user = req.user;

  // If no user (not logged in), return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  const filters = {
    project_id: req.query.project_id as string | undefined,
    column_id: req.query.column_id as string | undefined,
    sprint_id: req.query.sprint_id as string | undefined,
    assignee_id: req.query.assignee_id as string | undefined,
    type: req.query.type as string | undefined,
    priority: req.query.priority as string | undefined,
    search: req.query.search as string | undefined,
  };

  const tasks = tasksService.getAllForUser(user.id, user.isAdmin, filters);
  res.json({ success: true, data: tasks });
});

// Get task by ID (with access check)
router.get('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const task = tasksService.getById(taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Create task (requires access to project)
router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { project_id, title } = req.body;

  if (!project_id || !title) {
    return res.status(400).json({
      success: false,
      error: 'project_id and title are required',
    });
  }

  // Check if user has access to the project
  if (user && !(await projectsService.userHasAccess(user.tenantId!, project_id, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied to project' });
  }

  // Set reporter to current user if not specified
  const taskData = {
    ...req.body,
    reporter_id: req.body.reporter_id || user?.id,
  };

  const task = tasksService.create(taskData);

  // Log activity
  activityService.log({
    entity_type: 'task',
    entity_id: task.id,
    action: 'created',
    user_id: user?.id,
    new_value: title,
  });

  res.status(201).json({ success: true, data: task });
});

// Update task (with access check)
router.patch('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const existingTask = tasksService.getById(taskId);
  const task = tasksService.update(taskId, req.body);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Log activity for each changed field
  if (existingTask) {
    const changes = req.body;

    if (changes.title && changes.title !== existingTask.title) {
      activityService.log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'updated',
        user_id: user?.id,
        field_changed: 'title',
        old_value: existingTask.title,
        new_value: changes.title,
      });
    }

    if (changes.description !== undefined && changes.description !== existingTask.description) {
      activityService.log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'updated',
        user_id: user?.id,
        field_changed: 'description',
        old_value: existingTask.description?.substring(0, 50) || '',
        new_value: changes.description?.substring(0, 50) || '',
      });
    }

    if (changes.priority && changes.priority !== existingTask.priority) {
      activityService.log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'updated',
        user_id: user?.id,
        field_changed: 'priority',
        old_value: existingTask.priority,
        new_value: changes.priority,
      });
    }

    if (changes.assignee_id !== undefined && changes.assignee_id !== existingTask.assignee_id) {
      activityService.log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'assigned',
        user_id: user?.id,
        field_changed: 'assignee',
        old_value: existingTask.assignee_id || '',
        new_value: changes.assignee_id || '',
      });
    }

    if (changes.points !== undefined && changes.points !== existingTask.points) {
      activityService.log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'updated',
        user_id: user?.id,
        field_changed: 'points',
        old_value: String(existingTask.points || 0),
        new_value: String(changes.points || 0),
      });
    }
  }

  res.json({ success: true, data: task });
});

// Move task to column (with access check)
router.post('/:id/move', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { column_id } = req.body;
  if (!column_id) {
    return res.status(400).json({ success: false, error: 'column_id is required' });
  }

  const existingTask = tasksService.getById(taskId);
  const task = tasksService.moveToColumn(taskId, column_id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Log activity
  activityService.log({
    entity_type: 'task',
    entity_id: taskId,
    action: 'moved',
    user_id: user?.id,
    field_changed: 'status',
    old_value: existingTask?.column_title || '',
    new_value: task.column_title || '',
  });

  res.json({ success: true, data: task });
});

// Assign task to sprint (with access check)
router.post('/:id/sprint', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { sprint_id } = req.body;
  const existingTask = tasksService.getById(taskId);
  const task = tasksService.assignToSprint(taskId, sprint_id || null);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Log activity
  activityService.log({
    entity_type: 'task',
    entity_id: taskId,
    action: sprint_id ? 'added_to_sprint' : 'removed_from_sprint',
    user_id: user?.id,
    field_changed: 'sprint',
    old_value: existingTask?.sprint_name || '',
    new_value: task.sprint_name || '',
  });

  res.json({ success: true, data: task });
});

// Delete task (with access check)
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const existingTask = tasksService.getById(taskId);
  const deleted = tasksService.delete(taskId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Log activity
  if (existingTask) {
    activityService.log({
      entity_type: 'task',
      entity_id: taskId,
      action: 'deleted',
      user_id: user?.id,
      old_value: existingTask.title,
    });
  }

  res.json({ success: true, message: 'Task deleted' });
});

// === Subtask routes ===

// Get subtasks for a task (with access check)
router.get('/:id/subtasks', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const subtasks = tasksService.getSubtasks(taskId);
  res.json({ success: true, data: subtasks });
});

// Create subtask (with access check)
router.post('/:id/subtasks', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.id;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { title, type, assignee_id, sprint_id } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  const subtask = tasksService.createSubtask({
    parent_task_id: taskId,
    title,
    type,
    assignee_id,
    sprint_id,
  });

  // Log activity
  activityService.log({
    entity_type: 'task',
    entity_id: taskId,
    action: 'added_subtask',
    user_id: user?.id,
    new_value: title,
  });

  res.status(201).json({ success: true, data: subtask });
});

// Update subtask (with access check on parent task)
router.patch('/:taskId/subtasks/:subtaskId', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.taskId;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const subtask = tasksService.updateSubtask(req.params.subtaskId, req.body);
  if (!subtask) {
    return res.status(404).json({ success: false, error: 'Subtask not found' });
  }

  // Log activity if status changed
  if (req.body.is_completed !== undefined) {
    activityService.log({
      entity_type: 'task',
      entity_id: taskId,
      action: req.body.is_completed ? 'completed_subtask' : 'reopened_subtask',
      user_id: user?.id,
      new_value: subtask.title,
    });
  }

  res.json({ success: true, data: subtask });
});

// Delete subtask (with access check on parent task)
router.delete('/:taskId/subtasks/:subtaskId', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const taskId = req.params.taskId;

  // Check access
  if (user && !tasksService.userHasAccess(taskId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const deleted = tasksService.deleteSubtask(req.params.subtaskId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Subtask not found' });
  }

  // Log activity
  activityService.log({
    entity_type: 'task',
    entity_id: taskId,
    action: 'deleted_subtask',
    user_id: user?.id,
  });

  res.json({ success: true, message: 'Subtask deleted' });
});

export default router;
