import { Router, Response } from 'express';
import { commentsService } from '../services/comments.service.js';
import { activityService } from '../services/activity.service.js';
import { tasksService } from '../services/tasks.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/notification.service.js';
import { User } from '../models/index.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Get comments for a task
router.get('/task/:taskId', async (req, res) => {
  const comments = await commentsService.getByTask(req.params.taskId);
  res.json({ success: true, data: comments });
});

// Get comment by ID
router.get('/:id', async (req, res) => {
  const comment = await commentsService.getById(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }
  res.json({ success: true, data: comment });
});

// Create comment (with permission check)
router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { task_id, user_id, content, parent_comment_id } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Use user_id from body or from authenticated user
  const actualUserId = user_id || user.id;

  if (!task_id || !actualUserId || !content) {
    return res.status(400).json({
      success: false,
      error: 'task_id and content are required',
    });
  }

  // Check permission to comment
  const permissions = await tasksService.getTaskPermissions(task_id, user.id, user.isAdmin);
  if (!permissions.canComment) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to comment on this task.'
    });
  }

  const comment = await commentsService.create({ task_id, user_id: actualUserId, content, parent_comment_id });

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
      // Look up user IDs from usernames
      (async () => {
        try {
          const mentionedUsers = await User.find({
            $or: [
              { name: { $in: mentionedUsernames } },
              { email: { $regex: new RegExp(`^(${mentionedUsernames.join('|')})@`, 'i') } }
            ]
          });
          const mentionedUserIds = mentionedUsers.map(u => u.id);

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

// Update comment
router.patch('/:id', async (req: AuthRequest, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: 'content is required' });
  }

  const existingComment = await commentsService.getById(req.params.id);
  const comment = await commentsService.update(req.params.id, content);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity for the comment update
  if (existingComment) {
    await activityService.log({
      entity_type: 'task',
      entity_id: existingComment.task_id,
      action: 'updated_comment',
      user_id: req.user?.id,
      old_value: existingComment.content?.substring(0, 100),
      new_value: content.substring(0, 100),
    });
  }

  res.json({ success: true, data: comment });
});

// Delete comment
router.delete('/:id', async (req: AuthRequest, res) => {
  const existingComment = await commentsService.getById(req.params.id);
  const deleted = await commentsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity for the comment deletion
  if (existingComment) {
    await activityService.log({
      entity_type: 'task',
      entity_id: existingComment.task_id,
      action: 'deleted_comment',
      user_id: req.user?.id,
    });
  }

  res.json({ success: true, message: 'Comment deleted' });
});

export default router;
