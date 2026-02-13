/**
 * Notifications Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate notifications routes to use tenant routing.
 *
 * Key changes from original notifications.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of notificationService
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. Kept Zod validation schemas
 *
 * Migration pattern:
 * BEFORE: const prefs = await notificationService.getUserPreferences(userId);
 * AFTER:  const prefs = await req.tenantDb.notificationPreferences().findOne({ user_id: userId });
 *
 * NOTE: Notification preferences could alternatively be stored in PostgreSQL as system-wide user settings.
 * This implementation keeps them in tenant MongoDB for consistency with existing architecture.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { generateUUID } from '../lib/database.js';

const router = Router();

// Apply middleware chain to all routes
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

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
// Helper Functions
// ===================

/**
 * Get or create notification preferences for a user
 */
async function getOrCreatePreferences(tenantDb: any, userId: string) {
  let prefs = await tenantDb.notificationPreferences().findOne({ user_id: userId });

  if (!prefs) {
    // Create default preferences
    const now = new Date().toISOString();
    prefs = {
      id: generateUUID(),
      user_id: userId,
      email_enabled: true,
      email_digest_frequency: 'instant',
      email_task_assigned: true,
      email_task_mentioned: true,
      email_comment_added: true,
      email_comment_reply: true,
      email_sprint_reminder: true,
      email_project_updates: true,
      email_due_date_reminder: true,
      inapp_enabled: true,
      inapp_task_assigned: true,
      inapp_task_mentioned: true,
      inapp_comment_added: true,
      inapp_comment_reply: true,
      inapp_sprint_reminder: true,
      inapp_project_updates: true,
      inapp_status_change: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      quiet_hours_timezone: 'UTC',
      created_at: now,
      updated_at: now,
    };

    await tenantDb.notificationPreferences().insertOne(prefs);
  }

  return prefs;
}

// ===================
// Routes
// ===================

/**
 * GET /preferences
 * Get current user's notification preferences
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Auto-create preferences if they don't exist
 */
router.get('/preferences', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const prefs = await getOrCreatePreferences(req.tenantDb!, user.id);

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
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/preferences', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const validationResult = updatePreferencesSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: validationResult.error.errors,
    });
  }

  const updates = {
    ...validationResult.data,
    updated_at: new Date().toISOString(),
  };

  // Ensure preferences exist
  await getOrCreatePreferences(req.tenantDb!, user.id);

  // Update preferences
  await req.tenantDb!.notificationPreferences().updateOne(
    { user_id: user.id },
    { $set: updates }
  );

  // Get updated preferences
  const prefs = await req.tenantDb!.notificationPreferences().findOne({ user_id: user.id });

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
 *
 * CHANGES:
 * - Direct query to tenant database with pagination
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const validationResult = getNotificationsSchema.safeParse(req.query);

  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: validationResult.error.errors,
    });
  }

  const { page, limit, unread_only } = validationResult.data;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = { user_id: user.id };
  if (unread_only) {
    filter.read = false;
  }

  // Query notifications with pagination
  const [notifications, total] = await Promise.all([
    req.tenantDb!.notifications()
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    req.tenantDb!.notifications().countDocuments(filter),
  ]);

  const hasMore = skip + notifications.length < total;

  res.json({
    success: true,
    data: {
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
    },
  });
});

/**
 * GET /unread-count
 * Get count of unread notifications
 *
 * CHANGES:
 * - Direct count query to tenant database
 */
router.get('/unread-count', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  const count = await req.tenantDb!.notifications().countDocuments({
    user_id: user.id,
    read: false,
  });

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * PATCH /:id/read
 * Mark a notification as read
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/:id/read', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  // Update notification (verify it belongs to this user)
  const result = await req.tenantDb!.notifications().updateOne(
    { id, user_id: user.id },
    { $set: { read: true, read_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found',
    });
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * POST /mark-all-read
 * Mark all notifications as read
 *
 * CHANGES:
 * - Direct bulk update to tenant database
 */
router.post('/mark-all-read', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Mark all unread notifications as read
  await req.tenantDb!.notifications().updateMany(
    { user_id: user.id, read: false },
    { $set: { read: true, read_at: new Date().toISOString() } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

export default router;
