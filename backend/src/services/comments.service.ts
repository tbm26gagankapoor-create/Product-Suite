import database, { generateUUID, now } from '../lib/database.js';

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  user_name: string;
  user_avatar: string | null;
  replies?: CommentWithUser[];
}

export interface CreateCommentInput {
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
}

async function enrichComment(comment: Comment): Promise<CommentWithUser> {
  const user = await database.findById<any>('users', comment.user_id);
  return {
    ...comment,
    user_name: user?.name || 'Unknown',
    user_avatar: user?.avatar_url || null,
  };
}

export const commentsService = {
  async getByTask(taskId: string): Promise<CommentWithUser[]> {
    const allComments = await database.findMany<Comment>('comments', { task_id: taskId });
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

  async getById(id: string): Promise<CommentWithUser | null> {
    const comment = await database.findById<Comment>('comments', id);
    if (!comment) return null;
    return enrichComment(comment);
  },

  async create(input: CreateCommentInput): Promise<CommentWithUser> {
    const comment: Comment = {
      id: generateUUID(),
      task_id: input.task_id,
      user_id: input.user_id,
      parent_comment_id: input.parent_comment_id || null,
      content: input.content,
      is_edited: false,
      created_at: now(),
      updated_at: now(),
    };

    const saved = await database.insert<Comment>('comments', comment);
    return enrichComment(saved);
  },

  async update(id: string, content: string): Promise<CommentWithUser | null> {
    const existing = await database.findById<Comment>('comments', id);
    if (!existing) return null;

    const updated = await database.update<Comment>('comments', id, {
      content,
      is_edited: true,
      updated_at: now(),
    });

    if (!updated) return null;
    return enrichComment(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Also delete replies
    await database.deleteMany('comments', { parent_comment_id: id });
    return database.delete('comments', id);
  },

  async getCount(taskId: string): Promise<number> {
    return database.count('comments', { task_id: taskId });
  },
};
