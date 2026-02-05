import { Router, Response } from 'express';
import { documentCommentsService } from '../services/document-comments.service.js';
import { activityService } from '../services/activity.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/notification.service.js';
import { User, Project } from '../models/index.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Get comments for a project section
router.get('/projects/:projectId/document-comments', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id, include_resolved } = req.query;

  if (section_id) {
    const comments = await documentCommentsService.getBySection(projectId, section_id as string);
    return res.json({ success: true, data: comments });
  }

  const includeResolved = include_resolved !== 'false';
  const comments = await documentCommentsService.getByProject(projectId, includeResolved);
  res.json({ success: true, data: comments });
});

// Get unresolved comment count for a project
router.get('/projects/:projectId/document-comments/count', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id } = req.query;

  const count = await documentCommentsService.getUnresolvedCount(projectId, section_id as string | undefined);
  res.json({ success: true, data: { count } });
});

// Get comment by ID
router.get('/document-comments/:id', async (req: AuthRequest, res: Response) => {
  const comment = await documentCommentsService.getById(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }
  res.json({ success: true, data: comment });
});

// Get inline comments (comments with text selection) for highlighting
router.get('/projects/:projectId/document-comments/inline', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id } = req.query;

  if (!section_id) {
    return res.status(400).json({ success: false, error: 'section_id is required' });
  }

  const comments = await documentCommentsService.getInlineComments(projectId, section_id as string);
  res.json({ success: true, data: comments });
});

// Create document comment
router.post('/projects/:projectId/document-comments', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { projectId } = req.params;
  const { section_id, text, mentions, parent_comment_id, selected_text, selection_id } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!section_id || !text) {
    return res.status(400).json({
      success: false,
      error: 'section_id and text are required',
    });
  }

  // Verify project exists
  const project = await Project.findOne({ id: projectId });
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Parse mentions from text
  const mentionedUsernames = notificationService.parseMentions(text);
  let mentionedUserIds: string[] = mentions || [];

  // If mentions weren't provided, look them up from the text
  if (mentionedUsernames.length > 0 && mentionedUserIds.length === 0) {
    try {
      const mentionedUsers = await User.find({
        $or: [
          { name: { $in: mentionedUsernames } },
          { email: { $regex: new RegExp(`^(${mentionedUsernames.join('|')})@`, 'i') } }
        ]
      });
      mentionedUserIds = mentionedUsers.map(u => u.id);
    } catch (err) {
      console.error('Error looking up mentioned users:', err);
    }
  }

  const comment = await documentCommentsService.create({
    project_id: projectId,
    section_id,
    user_id: user.id,
    text,
    mentions: mentionedUserIds,
    parent_comment_id,
    selected_text,
    selection_id,
  });

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: projectId,
    action: 'document_commented',
    user_id: user.id,
    new_value: `Section: ${section_id} - ${text.substring(0, 100)}`,
  });

  // Send mention notifications (fire and forget)
  if (mentionedUserIds.length > 0) {
    console.log('[Document Comment] Processing mentions:', {
      mentionedUserIds,
      mentionerId: user.id,
      mentionerName: user.name,
      // Filter out self-mentions here for logging
      willNotify: mentionedUserIds.filter(id => id !== user.id)
    });

    notificationService.notifyDocumentMention(
      projectId,
      section_id,
      mentionedUserIds,
      user.id,
      text
    ).catch(err => {
      console.error('Error sending document mention notifications:', err);
    });
  } else {
    console.log('[Document Comment] No mentions to notify. Parsed usernames:', mentionedUsernames);
  }

  res.status(201).json({ success: true, data: comment });
});

// Update document comment
router.patch('/document-comments/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { text, mentions } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!text) {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  const existingComment = await documentCommentsService.getById(req.params.id);
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Only the comment author can edit
  if (existingComment.userId !== user.id && !user.isAdmin) {
    return res.status(403).json({ success: false, error: 'You can only edit your own comments' });
  }

  // Parse new mentions
  const mentionedUsernames = notificationService.parseMentions(text);
  let mentionedUserIds: string[] = mentions || [];

  if (mentionedUsernames.length > 0 && mentionedUserIds.length === 0) {
    try {
      const mentionedUsers = await User.find({
        $or: [
          { name: { $in: mentionedUsernames } },
          { email: { $regex: new RegExp(`^(${mentionedUsernames.join('|')})@`, 'i') } }
        ]
      });
      mentionedUserIds = mentionedUsers.map(u => u.id);
    } catch (err) {
      console.error('Error looking up mentioned users:', err);
    }
  }

  const comment = await documentCommentsService.update(req.params.id, text, mentionedUserIds);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.projectId,
    action: 'document_comment_updated',
    user_id: user.id,
    old_value: existingComment.text?.substring(0, 100),
    new_value: text.substring(0, 100),
  });

  // Notify new mentions (excluding those already mentioned before)
  const oldMentions = existingComment.mentions || [];
  const newMentions = mentionedUserIds.filter(id => !oldMentions.includes(id));
  if (newMentions.length > 0) {
    notificationService.notifyDocumentMention(
      existingComment.projectId,
      existingComment.sectionId,
      newMentions,
      user.id,
      text
    ).catch(err => {
      console.error('Error sending document mention notifications:', err);
    });
  }

  res.json({ success: true, data: comment });
});

// Delete document comment
router.delete('/document-comments/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const existingComment = await documentCommentsService.getById(req.params.id);
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Only the comment author or admin can delete
  if (existingComment.userId !== user.id && !user.isAdmin) {
    return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
  }

  const deleted = await documentCommentsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.projectId,
    action: 'document_comment_deleted',
    user_id: user.id,
  });

  res.json({ success: true, message: 'Comment deleted' });
});

// Resolve document comment
router.post('/document-comments/:id/resolve', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const existingComment = await documentCommentsService.getById(req.params.id);
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const comment = await documentCommentsService.resolve(req.params.id, user.id);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.projectId,
    action: 'document_comment_resolved',
    user_id: user.id,
  });

  res.json({ success: true, data: comment });
});

// Unresolve document comment
router.post('/document-comments/:id/unresolve', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const existingComment = await documentCommentsService.getById(req.params.id);
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const comment = await documentCommentsService.unresolve(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.projectId,
    action: 'document_comment_unresolved',
    user_id: user.id,
  });

  res.json({ success: true, data: comment });
});

export default router;
