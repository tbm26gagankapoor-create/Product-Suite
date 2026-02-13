/**
 * Comments Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate comments routes to use tenant routing.
 *
 * Key changes from original comments.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of commentsService and database helper
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. User lookup changed from MongoDB to PostgreSQL (for @mentions)
 * 7. Inlined task permission checks
 *
 * Migration pattern:
 * BEFORE: const comments = await commentsService.getByTask(taskId);
 * AFTER:  const comments = await req.tenantDb.comments().find({ task_id: taskId }).toArray();
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware, requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { activityService } from '../services/activity.service.js';
import { notificationService } from '../services/notification.service.js';
import { generateUUID } from '../lib/database.js';
import { query } from '../db/postgres/client.js';

const router = Router();

// Apply middleware chain to all routes
router.use(authMiddleware);      // 1. Verify JWT, get user from PostgreSQL
router.use(tenantMiddleware);    // 2. Get tenant context, create tenantDb
router.use(requireTenant);       // 3. Enforce tenant context

/**
 * Helper: Check if user can comment on a task
 * Inlined from tasksService.getTaskPermissions()
 */
async function userCanComment(tenantDb: any, taskId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  const task = await tenantDb.tasks().findOne({ id: taskId });
  if (!task) return false;

  // Get project to check membership
  const project = await tenantDb.projects().findOne({ id: task.project_id });
  if (!project) return false;

  // Admin or project member can comment
  if (isAdmin) return true;

  const isProjectMember = project.owner_id === userId || (project.owner_ids && project.owner_ids.includes(userId));
  return isProjectMember;
}

/**
 * GET /comments/task/:taskId
 * Get comments for a task
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/task/:taskId', async (req: TenantRequest, res: Response) => {
  const comments = await req.tenantDb!.comments()
    .find({ task_id: req.params.taskId })
    .sort({ created_at: 1 })
    .toArray();

  res.json({ success: true, data: comments });
});

/**
 * GET /comments/:id
 * Get comment by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  const comment = await req.tenantDb!.comments().findOne({ id: req.params.id });

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  res.json({ success: true, data: comment });
});

/**
 * POST /comments
 * Create comment (with permission check)
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - Inlined permission check
 * - User lookup from PostgreSQL for @mentions (not MongoDB)
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { task_id, user_id, content, parent_comment_id } = req.body;

  // Use user_id from body or from authenticated user
  const actualUserId = user_id || user.id;

  // Validation
  if (!task_id || !actualUserId || !content) {
    return res.status(400).json({
      success: false,
      error: 'task_id and content are required',
    });
  }

  // Check permission to comment
  const canComment = await userCanComment(req.tenantDb!, task_id, user.id, user.isAdmin);
  if (!canComment) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to comment on this task.'
    });
  }

  // Create comment
  const now = new Date().toISOString();
  const comment = {
    id: generateUUID(),
    task_id,
    user_id: actualUserId,
    content,
    parent_comment_id: parent_comment_id || null,
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.comments().insertOne(comment);

  // Log activity for the comment
  await activityService.log({
    entity_type: 'task',
    entity_id: task_id,
    action: 'commented',
    user_id: actualUserId,
    new_value: content.substring(0, 100), // Store first 100 chars of comment
  });

  // Send notifications (fire and forget)
  if (comment) {
    // Notify about the new comment
    notificationService.notifyCommentAdded(task_id, comment.id, actualUserId).catch(err => {
      console.error('Error sending comment notification:', err);
    });

    // Parse and notify @mentions
    const mentionedUsernames = notificationService.parseMentions(content);
    if (mentionedUsernames.length > 0) {
      // Look up user IDs from usernames (PostgreSQL instead of MongoDB)
      (async () => {
        try {
          // Build regex pattern for email matching
          const usernamePattern = mentionedUsernames.join('|');

          // Query PostgreSQL users table
          const result = await query<any>(
            `SELECT id FROM users
             WHERE (name = ANY($1) OR email ~* $2)
             AND tenant_id = $3
             AND status = 'active'`,
            [mentionedUsernames, `^(${usernamePattern})@`, req.tenant!.id]
          );

          const mentionedUserIds = result.rows.map((u: any) => u.id);

          if (mentionedUserIds.length > 0) {
            await notificationService.notifyMention(task_id, mentionedUserIds, actualUserId, content);
          }
        } catch (err) {
          console.error('Error sending mention notifications:', err);
        }
      })();
    }
  }

  res.status(201).json({ success: true, data: comment });
});

/**
 * PATCH /comments/:id
 * Update comment
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: 'content is required' });
  }

  // Get existing comment for activity log
  const existingComment = await req.tenantDb!.comments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Update comment
  const result = await req.tenantDb!.comments().updateOne(
    { id: req.params.id },
    { $set: { content, updated_at: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Get updated comment
  const comment = await req.tenantDb!.comments().findOne({ id: req.params.id });

  // Log activity for the comment update
  await activityService.log({
    entity_type: 'task',
    entity_id: existingComment.task_id,
    action: 'updated_comment',
    user_id: user.id,
    old_value: existingComment.content?.substring(0, 100),
    new_value: content.substring(0, 100),
  });

  res.json({ success: true, data: comment });
});

/**
 * DELETE /comments/:id
 * Delete comment
 *
 * CHANGES:
 * - Direct delete from tenant database
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Get existing comment for activity log
  const existingComment = await req.tenantDb!.comments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Delete comment
  const result = await req.tenantDb!.comments().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity for the comment deletion
  await activityService.log({
    entity_type: 'task',
    entity_id: existingComment.task_id,
    action: 'deleted_comment',
    user_id: user.id,
  });

  res.json({ success: true, message: 'Comment deleted' });
});

export default router;
