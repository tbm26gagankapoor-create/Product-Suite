/**
 * Notification Routes
 * API endpoints for notification preferences and notifications management
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/notification.service.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// ===================
// Validation Schemas
// ===================

const updatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_digest_frequency: z.enum(['instant', 'daily', 'weekly', 'none']).optional(),
  email_task_assigned: z.boolean().optional(),
  email_task_mentioned: z.boolean().optional(),
  email_comment_added: z.boolean().optional(),
  email_comment_reply: z.boolean().optional(),
  email_sprint_reminder: z.boolean().optional(),
  email_project_updates: z.boolean().optional(),
  email_due_date_reminder: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  inapp_task_assigned: z.boolean().optional(),
  inapp_task_mentioned: z.boolean().optional(),
  inapp_comment_added: z.boolean().optional(),
  inapp_comment_reply: z.boolean().optional(),
  inapp_sprint_reminder: z.boolean().optional(),
  inapp_project_updates: z.boolean().optional(),
  inapp_status_change: z.boolean().optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format').optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format').optional(),
  quiet_hours_timezone: z.string().optional(),
});

const getNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unread_only: z.coerce.boolean().default(false),
});

// ===================
// Routes
// ===================

/**
 * GET /preferences
 * Get current user's notification preferences
 */
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  const prefs = await notificationService.getUserPreferences(req.user!.id);

  res.json({
    success: true,
    data: {
      id: prefs.id,
      user_id: prefs.user_id,
      email_enabled: prefs.email_enabled,
      email_digest_frequency: prefs.email_digest_frequency,
      email_task_assigned: prefs.email_task_assigned,
      email_task_mentioned: prefs.email_task_mentioned,
      email_comment_added: prefs.email_comment_added,
      email_comment_reply: prefs.email_comment_reply,
      email_sprint_reminder: prefs.email_sprint_reminder,
      email_project_updates: prefs.email_project_updates,
      email_due_date_reminder: prefs.email_due_date_reminder,
      inapp_enabled: prefs.inapp_enabled,
      inapp_task_assigned: prefs.inapp_task_assigned,
      inapp_task_mentioned: prefs.inapp_task_mentioned,
      inapp_comment_added: prefs.inapp_comment_added,
      inapp_comment_reply: prefs.inapp_comment_reply,
      inapp_sprint_reminder: prefs.inapp_sprint_reminder,
      inapp_project_updates: prefs.inapp_project_updates,
      inapp_status_change: prefs.inapp_status_change,
      quiet_hours_enabled: prefs.quiet_hours_enabled,
      quiet_hours_start: prefs.quiet_hours_start,
      quiet_hours_end: prefs.quiet_hours_end,
      quiet_hours_timezone: prefs.quiet_hours_timezone,
      created_at: prefs.created_at,
      updated_at: prefs.updated_at,
    },
  });
});

/**
 * PATCH /preferences
 * Update current user's notification preferences
 */
router.patch('/preferences', async (req: AuthRequest, res: Response) => {
  const validationResult = updatePreferencesSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: validationResult.error.errors,
    });
  }

  const updates = validationResult.data;
  const prefs = await notificationService.updateUserPreferences(req.user!.id, updates);

  res.json({
    success: true,
    data: {
      id: prefs.id,
      user_id: prefs.user_id,
      email_enabled: prefs.email_enabled,
      email_digest_frequency: prefs.email_digest_frequency,
      email_task_assigned: prefs.email_task_assigned,
      email_task_mentioned: prefs.email_task_mentioned,
      email_comment_added: prefs.email_comment_added,
      email_comment_reply: prefs.email_comment_reply,
      email_sprint_reminder: prefs.email_sprint_reminder,
      email_project_updates: prefs.email_project_updates,
      email_due_date_reminder: prefs.email_due_date_reminder,
      inapp_enabled: prefs.inapp_enabled,
      inapp_task_assigned: prefs.inapp_task_assigned,
      inapp_task_mentioned: prefs.inapp_task_mentioned,
      inapp_comment_added: prefs.inapp_comment_added,
      inapp_comment_reply: prefs.inapp_comment_reply,
      inapp_sprint_reminder: prefs.inapp_sprint_reminder,
      inapp_project_updates: prefs.inapp_project_updates,
      inapp_status_change: prefs.inapp_status_change,
      quiet_hours_enabled: prefs.quiet_hours_enabled,
      quiet_hours_start: prefs.quiet_hours_start,
      quiet_hours_end: prefs.quiet_hours_end,
      quiet_hours_timezone: prefs.quiet_hours_timezone,
      updated_at: prefs.updated_at,
    },
  });
});

/**
 * GET /
 * Get current user's notifications (paginated)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const validationResult = getNotificationsSchema.safeParse(req.query);

  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: validationResult.error.errors,
    });
  }

  const { page, limit, unread_only } = validationResult.data;

  const { notifications, total, hasMore } = await notificationService.getNotifications(
    req.user!.id,
    { page, limit, unreadOnly: unread_only }
  );

  res.json({
    success: true,
    data: notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      action_url: n.action_url,
      metadata: n.metadata,
      read: n.read,
      created_at: n.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      hasMore,
    },
  });
});

/**
 * GET /unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  const count = await notificationService.getUnreadCount(req.user!.id);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * PATCH /:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await notificationService.markAsRead(id, req.user!.id);

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * POST /mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', async (req: AuthRequest, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

export default router;
