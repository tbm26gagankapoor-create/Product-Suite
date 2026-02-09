
import React from 'react';
import {
  Send,
} from 'lucide-react';
import { Comment } from '../../types';

interface CommentsTabProps {
  comments: Comment[];
  users: any[];
  currentUser: any;
  newComment: string;
  setNewComment: (value: string) => void;
  onAddComment: () => void;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
    canDelete: boolean;
    isReporter: boolean;
    isAssignee: boolean;
  };
}

const CommentsTab: React.FC<CommentsTabProps> = ({
  comments,
  users,
  currentUser,
  newComment,
  setNewComment,
  onAddComment,
  permissions,
}) => {
  const sortedComments = [...(comments || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <>
      {permissions.canComment && (
        <div className="flex gap-4 mb-8 mt-4">
          {currentUser && (
            <img src={currentUser.avatarUrl} className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2D2F36]" />
          )}
          <div className="flex-1">
            <div className="relative">
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none pr-12 text-[#172B4D] dark:text-white shadow-sm"
              />
              <button
                onClick={onAddComment}
                disabled={!newComment.trim()}
                className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {sortedComments.map((comment) => {
        const user = users.find((u: any) => u.id === comment.userId);
        return (
          <div key={`comment-${comment.id}`} className="flex gap-4 group">
            <img src={user?.avatarUrl} className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#2D2F36] mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[#172B4D] dark:text-white">{user?.name}</span>
                <span className="text-xs text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1F2128] p-3 rounded-r-xl rounded-bl-xl border border-gray-100 dark:border-[#2D2F36]">
                {comment.text}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default CommentsTab;
