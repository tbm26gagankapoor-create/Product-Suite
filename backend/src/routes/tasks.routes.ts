import { Router, Response } from 'express';
import { tasksService } from '../services/tasks.service.js';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all tasks (filtered by user's accessible projects)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { project_id, sprint_id, assignee_id } = req.query;

  // If no user, return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // Get user's accessible projects
  const accessibleProjects = await projectsService.getAllForUser(user.id, user.isAdmin);
  const accessibleProjectIds = new Set(accessibleProjects.map(p => p.id));

  // Get tasks with filters
  const allTasks = await tasksService.getAll({
    project_id: project_id as string,
    sprint_id: sprint_id as string,
    assignee_id: assignee_id as string,
  });

  // Filter tasks to only those from accessible projects
  const tasks = allTasks.filter(task => accessibleProjectIds.has(task.project_id));

  res.json({ success: true, data: tasks });
});

// Get task by ID or task_key
router.get('/:id', async (req, res) => {
  const task = await tasksService.getById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Create task
router.post('/', async (req, res) => {
  const { project_id, title, description, type, priority, points, assignee_id, reporter_id, sprint_id, column_id, due_date, start_date } = req.body;

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
  });

  res.status(201).json({ success: true, data: task });
});

// Update task
router.patch('/:id', async (req, res) => {
  const task = await tasksService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Delete task
router.delete('/:id', async (req, res) => {
  const deleted = await tasksService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, message: 'Task deleted' });
});

// Move task to column
router.post('/:id/move', async (req, res) => {
  const { column_id } = req.body;
  if (!column_id) {
    return res.status(400).json({ success: false, error: 'column_id is required' });
  }

  const task = await tasksService.moveToColumn(req.params.id, column_id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Assign task to sprint
router.post('/:id/sprint', async (req, res) => {
  const { sprint_id } = req.body;

  const task = await tasksService.assignToSprint(req.params.id, sprint_id || null);
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

export default router;
