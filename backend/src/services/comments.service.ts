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

function enrichComment(comment: Comment): CommentWithUser {
  const user = database.findById<any>('users', comment.user_id);
  return {
    ...comment,
    user_name: user?.name || 'Unknown',
    user_avatar: user?.avatar_url || null,
  };
}

export const commentsService = {
  getByTask(taskId: string): CommentWithUser[] {
    const comments = database.findMany<Comment>('comments', c => c.task_id === taskId && !c.parent_comment_id);

    return comments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(comment => {
        const replies = database.findMany<Comment>('comments', c => c.parent_comment_id === comment.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(enrichComment);

        return {
          ...enrichComment(comment),
          replies,
        };
      });
  },

  getById(id: string): CommentWithUser | null {
    const comment = database.findById<Comment>('comments', id);
    if (!comment) return null;
    return enrichComment(comment);
  },

  create(input: CreateCommentInput): CommentWithUser {
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

    database.insert('comments', comment);
    return enrichComment(comment);
  },

  update(id: string, content: string): CommentWithUser | null {
    const existing = database.findById<Comment>('comments', id);
    if (!existing) return null;

    const updated = database.update<Comment>('comments', id, {
      content,
      is_edited: true,
      updated_at: now(),
    });

    if (!updated) return null;
    return enrichComment(updated);
  },

  delete(id: string): boolean {
    // Also delete replies
    database.deleteMany('comments', c => c.parent_comment_id === id);
    return database.delete('comments', id);
  },

  getCount(taskId: string): number {
    return database.count('comments', c => c.task_id === taskId);
  },
};
