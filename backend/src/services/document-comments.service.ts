import database, { generateUUID, now } from '../lib/database.js';

export interface DocumentComment {
  id: string;
  project_id: string;
  section_id: string;
  user_id: string;
  parent_comment_id: string | null;
  text: string;
  mentions: string[];
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  is_edited: boolean;
  // Inline text selection fields (Google Docs style)
  selected_text: string | null;
  selection_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentCommentWithUser {
  id: string;
  projectId: string;
  sectionId: string;
  userId: string;
  parentCommentId: string | null;
  text: string;
  mentions: string[];
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  isEdited: boolean;
  // Inline text selection fields (Google Docs style)
  selectedText: string | null;
  selectionId: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userAvatar: string | null;
  resolvedByName?: string;
  replies?: DocumentCommentWithUser[];
}

export interface CreateDocumentCommentInput {
  project_id: string;
  section_id: string;
  user_id: string;
  text: string;
  mentions?: string[];
  parent_comment_id?: string;
  // Inline text selection fields
  selected_text?: string;
  selection_id?: string;
}

async function enrichComment(comment: DocumentComment): Promise<DocumentCommentWithUser> {
  const user = await database.findById<any>('users', comment.user_id);
  let resolvedByName: string | undefined;

  if (comment.resolved_by) {
    const resolvedByUser = await database.findById<any>('users', comment.resolved_by);
    resolvedByName = resolvedByUser?.name || 'Unknown';
  }

  // Transform snake_case to camelCase for frontend compatibility
  return {
    id: comment.id,
    projectId: comment.project_id,
    sectionId: comment.section_id,
    userId: comment.user_id,
    parentCommentId: comment.parent_comment_id,
    text: comment.text,
    mentions: comment.mentions,
    isResolved: comment.is_resolved,
    resolvedBy: comment.resolved_by,
    resolvedAt: comment.resolved_at,
    isEdited: comment.is_edited,
    selectedText: comment.selected_text,
    selectionId: comment.selection_id,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    userName: user?.name || 'Unknown',
    userAvatar: user?.avatar_url || null,
    resolvedByName,
  };
}

export const documentCommentsService = {
  async getBySection(projectId: string, sectionId: string): Promise<DocumentCommentWithUser[]> {
    const allComments = await database.findMany<DocumentComment>('document_comments', {
      project_id: projectId,
      section_id: sectionId,
    });

    const rootComments = allComments.filter(c => !c.parent_comment_id);

    const enrichedComments = await Promise.all(
      rootComments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(async (comment) => {
          const replies = allComments
            .filter(c => c.parent_comment_id === comment.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          const enrichedReplies = await Promise.all(replies.map(enrichComment));

          return {
            ...(await enrichComment(comment)),
            replies: enrichedReplies,
          };
        })
    );

    return enrichedComments;
  },

  async getByProject(projectId: string, includeResolved: boolean = true): Promise<DocumentCommentWithUser[]> {
    const filter: Record<string, any> = { project_id: projectId };
    if (!includeResolved) {
      filter.is_resolved = false;
    }

    const allComments = await database.findMany<DocumentComment>('document_comments', filter);
    const rootComments = allComments.filter(c => !c.parent_comment_id);

    const enrichedComments = await Promise.all(
      rootComments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(async (comment) => {
          const replies = allComments
            .filter(c => c.parent_comment_id === comment.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          const enrichedReplies = await Promise.all(replies.map(enrichComment));

          return {
            ...(await enrichComment(comment)),
            replies: enrichedReplies,
          };
        })
    );

    return enrichedComments;
  },

  async getById(id: string): Promise<DocumentCommentWithUser | null> {
    const comment = await database.findById<DocumentComment>('document_comments', id);
    if (!comment) return null;
    return enrichComment(comment);
  },

  async create(input: CreateDocumentCommentInput): Promise<DocumentCommentWithUser> {
    const comment: DocumentComment = {
      id: generateUUID(),
      project_id: input.project_id,
      section_id: input.section_id,
      user_id: input.user_id,
      parent_comment_id: input.parent_comment_id || null,
      text: input.text,
      mentions: input.mentions || [],
      is_resolved: false,
      resolved_by: null,
      resolved_at: null,
      is_edited: false,
      selected_text: input.selected_text || null,
      selection_id: input.selection_id || null,
      created_at: now(),
      updated_at: now(),
    };

    const saved = await database.insert<DocumentComment>('document_comments', comment);
    return enrichComment(saved);
  },

  async update(id: string, text: string, mentions?: string[]): Promise<DocumentCommentWithUser | null> {
    const existing = await database.findById<DocumentComment>('document_comments', id);
    if (!existing) return null;

    const updateData: Partial<DocumentComment> = {
      text,
      is_edited: true,
      updated_at: now(),
    };

    if (mentions !== undefined) {
      updateData.mentions = mentions;
    }

    const updated = await database.update<DocumentComment>('document_comments', id, updateData);

    if (!updated) return null;
    return enrichComment(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Also delete replies
    await database.deleteMany('document_comments', { parent_comment_id: id });
    return database.delete('document_comments', id);
  },

  async resolve(id: string, userId: string): Promise<DocumentCommentWithUser | null> {
    const existing = await database.findById<DocumentComment>('document_comments', id);
    if (!existing) return null;

    const updated = await database.update<DocumentComment>('document_comments', id, {
      is_resolved: true,
      resolved_by: userId,
      resolved_at: now(),
      updated_at: now(),
    });

    if (!updated) return null;
    return enrichComment(updated);
  },

  async unresolve(id: string): Promise<DocumentCommentWithUser | null> {
    const existing = await database.findById<DocumentComment>('document_comments', id);
    if (!existing) return null;

    const updated = await database.update<DocumentComment>('document_comments', id, {
      is_resolved: false,
      resolved_by: null,
      resolved_at: null,
      updated_at: now(),
    });

    if (!updated) return null;
    return enrichComment(updated);
  },

  async getUnresolvedCount(projectId: string, sectionId?: string): Promise<number> {
    const filter: Record<string, any> = {
      project_id: projectId,
      is_resolved: false,
      parent_comment_id: null, // Only count root comments
    };
    if (sectionId) {
      filter.section_id = sectionId;
    }
    return database.count('document_comments', filter);
  },

  // Get inline comments (comments with text selection) for highlighting
  async getInlineComments(projectId: string, sectionId: string): Promise<DocumentCommentWithUser[]> {
    const allComments = await database.findMany<DocumentComment>('document_comments', {
      project_id: projectId,
      section_id: sectionId,
    });

    // Filter to only comments with selections (not replies)
    const inlineComments = allComments.filter(c => c.selected_text && c.selection_id && !c.parent_comment_id);

    const enrichedComments = await Promise.all(
      inlineComments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(async (comment) => {
          const replies = allComments
            .filter(c => c.parent_comment_id === comment.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          const enrichedReplies = await Promise.all(replies.map(enrichComment));

          return {
            ...(await enrichComment(comment)),
            replies: enrichedReplies,
          };
        })
    );

    return enrichedComments;
  },
};
