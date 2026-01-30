import { Router, Response } from 'express';
import { z } from 'zod';
import { tasksService } from '../services/tasks.service.js';
import { taskLinksService } from '../services/task-links.service.js';
import { authorizationService } from '../services/authorization.service.js';
import { authenticate } from '../middleware/auth.js';
import {
  canReadTask,
  canManageTaskFields,
  canManageTaskStages,
  canAssignTask,
  canDeleteTask,
  canCommentTask,
  canWriteWorkspace,
} from '../middleware/authorize.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';
import { checkPermission, formatUser, formatWorkspace } from '../lib/openfga.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']),
  column_id: z.string().uuid(),
  project_id: z.string().uuid(),
  sprint_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional(),
  parent_epic_id: z.string().uuid().optional(),
  story_points: z.number().int().min(0).max(100).optional(),
  due_date: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']).optional(),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  parent_epic_id: z.string().uuid().nullable().optional(),
  story_points: z.number().int().min(0).max(100).optional(),
  due_date: z.string().datetime().nullable().optional(),
});

const updateStageSchema = z.object({
  column_id: z.string().uuid(),
});

const updateAssigneeSchema = z.object({
  assignee_id: z.string().uuid().nullable(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(10000),
});

const createLinkSchema = z.object({
  blocking_task_id: z.string().uuid(),
  link_type: z.enum(['blocks', 'relates_to', 'duplicates']).default('blocks'),
});

/**
 * GET /tasks
 * List tasks with filters
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const { projectId, sprintId, columnId, assigneeId, reporterId, search, page, limit } = req.query;

    // Check workspace access
    if (projectId) {
      const canRead = await checkPermission(
        formatUser(req.userId!),
        'can_read',
        formatWorkspace(projectId as string)
      );
      if (!canRead) {
        throw new ForbiddenError('No access to this workspace');
      }
    }

    const result = await tasksService.getAll(
      {
        projectId: projectId as string,
        sprintId: sprintId === 'null' ? null : (sprintId as string),
        columnId: columnId as string,
        assigneeId: assigneeId === 'null' ? null : (assigneeId as string),
        reporterId: reporterId as string,
        search: search as string,
      },
      {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      }
    );

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:taskId
 * Get single task
 */
router.get('/:taskId', authenticate, canReadTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const task = await tasksService.getById(req.params.taskId);

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:taskId/permissions
 * Get task permissions for current user
 */
router.get('/:taskId/permissions', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const permissions = await authorizationService.getTaskPermissions(
      req.userId!,
      req.params.taskId
    );

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks
 * Create new task
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    // Check workspace write permission
    const canWrite = await checkPermission(
      formatUser(req.userId!),
      'can_write',
      formatWorkspace(parsed.data.project_id)
    );

    if (!canWrite) {
      throw new ForbiddenError('No permission to create tasks in this workspace');
    }

    const task = await tasksService.create(
      parsed.data,
      req.userId!,
      parsed.data.project_id // Using project_id as workspace_id
    );

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:taskId
 * Update task fields (requires can_manage_fields)
 */
router.patch('/:taskId', authenticate, canManageTaskFields, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const task = await tasksService.update(req.params.taskId, parsed.data, req.userId!);

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:taskId/stage
 * Update task stage (requires can_manage_stages)
 */
router.patch('/:taskId/stage', authenticate, canManageTaskStages, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const task = await tasksService.updateStage(
      req.params.taskId,
      parsed.data.column_id,
      req.userId!
    );

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:taskId/assignee
 * Update task assignee (requires can_assign)
 */
router.patch('/:taskId/assignee', authenticate, canAssignTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateAssigneeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const task = await tasksService.updateAssignee(
      req.params.taskId,
      parsed.data.assignee_id,
      req.userId!
    );

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tasks/:taskId
 * Delete task (requires can_delete)
 */
router.delete('/:taskId', authenticate, canDeleteTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    // Get task to find workspace ID
    const task = await tasksService.getById(req.params.taskId);

    await tasksService.delete(req.params.taskId, task.project_id);

    res.json({
      success: true,
      data: { message: 'Task deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:taskId/comments
 * Get task comments
 */
router.get('/:taskId/comments', authenticate, canReadTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const comments = await tasksService.getComments(req.params.taskId);

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:taskId/comments
 * Add comment to task (requires can_comment)
 */
router.post('/:taskId/comments', authenticate, canCommentTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const comment = await tasksService.addComment(
      req.params.taskId,
      req.userId!,
      parsed.data.content
    );

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Task Links (Dependencies) Routes
// ============================================

/**
 * GET /tasks/:taskId/links
 * Get all task links (blocked by and blocks)
 */
router.get('/:taskId/links', authenticate, canReadTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const links = await taskLinksService.getAllLinks(req.params.taskId);

    res.json({
      success: true,
      data: links,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:taskId/links
 * Create a task link (add blocking task)
 */
router.post('/:taskId/links', authenticate, canManageTaskFields, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = createLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const link = await taskLinksService.createLink(
      parsed.data.blocking_task_id,
      req.params.taskId,
      parsed.data.link_type,
      req.userId!
    );

    res.status(201).json({
      success: true,
      data: link,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tasks/:taskId/links/:linkId
 * Remove a task link
 */
router.delete('/:taskId/links/:linkId', authenticate, canManageTaskFields, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    await taskLinksService.deleteLink(req.params.linkId, req.userId!);

    res.json({
      success: true,
      data: { message: 'Link removed successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:taskId/available-links
 * Get tasks available for linking
 */
router.get('/:taskId/available-links', authenticate, canReadTask, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    // Get the task to find its project
    const task = await tasksService.getById(req.params.taskId);

    const availableTasks = await taskLinksService.getAvailableTasks(
      req.params.taskId,
      task.project_id
    );

    res.json({
      success: true,
      data: availableTasks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
