/**
 * Document Comments Routes - Tenant-Aware Version
 *
 * This is a REFERENCE IMPLEMENTATION showing how to migrate document-comments routes to use tenant routing.
 *
 * Key changes from original document-comments.routes.ts:
 * 1. Added tenantMiddleware and requireTenant
 * 2. Changed AuthRequest to TenantRequest
 * 3. Use req.tenantDb instead of documentCommentsService
 * 4. Removed organization_id filters (already scoped to tenant)
 * 5. Direct MongoDB collection access via req.tenantDb
 * 6. User lookup changed from MongoDB to PostgreSQL (for @mentions)
 * 7. Project lookup from tenant database (not global Project model)
 *
 * Migration pattern:
 * BEFORE: const comments = await documentCommentsService.getByProject(projectId);
 * AFTER:  const comments = await req.tenantDb.documentComments().find({ project_id: projectId }).toArray();
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
 * GET /projects/:projectId/document-comments
 * Get comments for a project section
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Filter by section_id or include_resolved
 */
router.get('/projects/:projectId/document-comments', async (req: TenantRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id, include_resolved } = req.query;

  // Build filter
  const filter: any = { project_id: projectId };

  if (section_id) {
    filter.section_id = section_id;
  }

  // Filter resolved comments unless explicitly requested
  const includeResolved = include_resolved !== 'false';
  if (!includeResolved) {
    filter.resolved = { $ne: true };
  }

  const comments = await req.tenantDb!.documentComments()
    .find(filter)
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: comments });
});

/**
 * GET /projects/:projectId/document-comments/count
 * Get unresolved comment count for a project
 *
 * CHANGES:
 * - Direct count query to tenant database
 */
router.get('/projects/:projectId/document-comments/count', async (req: TenantRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id } = req.query;

  // Build filter
  const filter: any = {
    project_id: projectId,
    resolved: { $ne: true },
  };

  if (section_id) {
    filter.section_id = section_id;
  }

  const count = await req.tenantDb!.documentComments().countDocuments(filter);

  res.json({ success: true, data: { count } });
});

/**
 * GET /document-comments/:id
 * Get comment by ID
 *
 * CHANGES:
 * - Direct query to tenant database
 */
router.get('/document-comments/:id', async (req: TenantRequest, res: Response) => {
  const comment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  res.json({ success: true, data: comment });
});

/**
 * GET /projects/:projectId/document-comments/inline
 * Get inline comments (comments with text selection) for highlighting
 *
 * CHANGES:
 * - Direct query to tenant database
 * - Filter for comments with selected_text or selection_id
 */
router.get('/projects/:projectId/document-comments/inline', async (req: TenantRequest, res: Response) => {
  const { projectId } = req.params;
  const { section_id } = req.query;

  if (!section_id) {
    return res.status(400).json({ success: false, error: 'section_id is required' });
  }

  // Query inline comments (those with text selection)
  const comments = await req.tenantDb!.documentComments()
    .find({
      project_id: projectId,
      section_id: section_id as string,
      $or: [
        { selected_text: { $exists: true, $ne: null } },
        { selection_id: { $exists: true, $ne: null } },
      ],
    })
    .sort({ created_at: -1 })
    .toArray();

  res.json({ success: true, data: comments });
});

/**
 * POST /projects/:projectId/document-comments
 * Create document comment
 *
 * CHANGES:
 * - Direct insert to tenant database
 * - Verify project exists in tenant database (not global Project model)
 * - User lookup from PostgreSQL for @mentions (not MongoDB)
 */
router.post('/projects/:projectId/document-comments', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { projectId } = req.params;
  const { section_id, text, mentions, parent_comment_id, selected_text, selection_id } = req.body;

  // Validation
  if (!section_id || !text) {
    return res.status(400).json({
      success: false,
      error: 'section_id and text are required',
    });
  }

  // Verify project exists in tenant database
  const project = await req.tenantDb!.projects().findOne({ id: projectId });
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Parse mentions from text
  const mentionedUsernames = notificationService.parseMentions(text);
  let mentionedUserIds: string[] = mentions || [];

  // If mentions weren't provided, look them up from PostgreSQL
  if (mentionedUsernames.length > 0 && mentionedUserIds.length === 0) {
    try {
      const usernamePattern = mentionedUsernames.join('|');
      const result = await query<any>(
        `SELECT id FROM users
         WHERE (name = ANY($1) OR email ~* $2)
         AND tenant_id = $3
         AND status = 'active'`,
        [mentionedUsernames, `^(${usernamePattern})@`, req.tenant!.id]
      );
      mentionedUserIds = result.rows.map((u: any) => u.id);
    } catch (err) {
      console.error('Error looking up mentioned users:', err);
    }
  }

  // Create comment
  const now = new Date().toISOString();
  const comment = {
    id: generateUUID(),
    project_id: projectId,
    section_id,
    user_id: user.id,
    text,
    mentions: mentionedUserIds,
    parent_comment_id: parent_comment_id || null,
    selected_text: selected_text || null,
    selection_id: selection_id || null,
    resolved: false,
    // Note: organization_id is NOT stored - implicit from tenant database
    created_at: now,
    updated_at: now,
  };

  await req.tenantDb!.documentComments().insertOne(comment);

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
  }

  res.status(201).json({ success: true, data: comment });
});

/**
 * PATCH /document-comments/:id
 * Update document comment
 *
 * CHANGES:
 * - Direct update to tenant database
 * - User lookup from PostgreSQL for new @mentions
 */
router.patch('/document-comments/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;
  const { text, mentions } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  // Get existing comment
  const existingComment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Only the comment author can edit
  if (existingComment.user_id !== user.id && !user.isAdmin) {
    return res.status(403).json({ success: false, error: 'You can only edit your own comments' });
  }

  // Parse new mentions
  const mentionedUsernames = notificationService.parseMentions(text);
  let mentionedUserIds: string[] = mentions || [];

  if (mentionedUsernames.length > 0 && mentionedUserIds.length === 0) {
    try {
      const usernamePattern = mentionedUsernames.join('|');
      const result = await query<any>(
        `SELECT id FROM users
         WHERE (name = ANY($1) OR email ~* $2)
         AND tenant_id = $3
         AND status = 'active'`,
        [mentionedUsernames, `^(${usernamePattern})@`, req.tenant!.id]
      );
      mentionedUserIds = result.rows.map((u: any) => u.id);
    } catch (err) {
      console.error('Error looking up mentioned users:', err);
    }
  }

  // Update comment
  const updates = {
    text,
    mentions: mentionedUserIds,
    updated_at: new Date().toISOString(),
  };

  const result = await req.tenantDb!.documentComments().updateOne(
    { id: req.params.id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Get updated comment
  const comment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.project_id,
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
      existingComment.project_id,
      existingComment.section_id,
      newMentions,
      user.id,
      text
    ).catch(err => {
      console.error('Error sending document mention notifications:', err);
    });
  }

  res.json({ success: true, data: comment });
});

/**
 * DELETE /document-comments/:id
 * Delete document comment
 *
 * CHANGES:
 * - Direct delete from tenant database
 */
router.delete('/document-comments/:id', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Get existing comment
  const existingComment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Only the comment author or admin can delete
  if (existingComment.user_id !== user.id && !user.isAdmin) {
    return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
  }

  // Delete comment
  const result = await req.tenantDb!.documentComments().deleteOne({ id: req.params.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.project_id,
    action: 'document_comment_deleted',
    user_id: user.id,
  });

  res.json({ success: true, message: 'Comment deleted' });
});

/**
 * POST /document-comments/:id/resolve
 * Resolve document comment
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.post('/document-comments/:id/resolve', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Get existing comment
  const existingComment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Mark as resolved
  const result = await req.tenantDb!.documentComments().updateOne(
    { id: req.params.id },
    {
      $set: {
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Get updated comment
  const comment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.project_id,
    action: 'document_comment_resolved',
    user_id: user.id,
  });

  res.json({ success: true, data: comment });
});

/**
 * POST /document-comments/:id/unresolve
 * Unresolve document comment
 *
 * CHANGES:
 * - Direct update to tenant database
 */
router.post('/document-comments/:id/unresolve', async (req: TenantRequest, res: Response) => {
  const user = req.user!;

  // Get existing comment
  const existingComment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });
  if (!existingComment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Mark as unresolved
  const result = await req.tenantDb!.documentComments().updateOne(
    { id: req.params.id },
    {
      $set: {
        resolved: false,
        updated_at: new Date().toISOString(),
      },
      $unset: {
        resolved_by: '',
        resolved_at: '',
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  // Get updated comment
  const comment = await req.tenantDb!.documentComments().findOne({ id: req.params.id });

  // Log activity
  await activityService.log({
    entity_type: 'project',
    entity_id: existingComment.project_id,
    action: 'document_comment_unresolved',
    user_id: user.id,
  });

  res.json({ success: true, data: comment });
});

export default router;
