
import React from 'react';
import {
    ChevronRight,
    Loader2,
    Check,
    Trash2
} from 'lucide-react';
import { User as UserType, DocumentComment } from '../../types';
import MentionInput from '../MentionInput';
import MentionText from '../MentionText';

// Helper for relative time
const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

interface DocumentCommentsProps {
    isLoadingComments: boolean;
    unresolvedComments: DocumentComment[];
    resolvedComments: DocumentComment[];
    activeInlineComment: DocumentComment | null;
    setActiveInlineComment: (comment: DocumentComment | null) => void;
    showResolved: boolean;
    setShowResolved: (value: boolean) => void;
    replyingToId: string | null;
    setReplyingToId: (id: string | null) => void;
    replyText: string;
    setReplyText: (value: string) => void;
    replyMentions: string[];
    setReplyMentions: (mentions: string[]) => void;
    newCommentText: string;
    setNewCommentText: (value: string) => void;
    newCommentMentions: string[];
    setNewCommentMentions: (mentions: string[]) => void;
    allUsers: UserType[];
    currentUserId: string;
    contentRef: React.RefObject<HTMLDivElement>;
    setShowComments: (value: boolean) => void;
    setShowHistory: (value: boolean) => void;
    handlePostComment: (parentCommentId?: string) => void;
    handleResolveComment: (commentId: string) => void;
    handleUnresolveComment: (commentId: string) => void;
    handleDeleteComment: (commentId: string) => void;
}

const DocumentComments: React.FC<DocumentCommentsProps> = ({
    isLoadingComments,
    unresolvedComments,
    resolvedComments,
    activeInlineComment,
    setActiveInlineComment,
    showResolved,
    setShowResolved,
    replyingToId,
    setReplyingToId,
    replyText,
    setReplyText,
    replyMentions,
    setReplyMentions,
    newCommentText,
    setNewCommentText,
    newCommentMentions,
    setNewCommentMentions,
    allUsers,
    currentUserId,
    contentRef,
    setShowComments,
    setShowHistory,
    handlePostComment,
    handleResolveComment,
    handleUnresolveComment,
    handleDeleteComment,
}) => {
    return (
        <>
            {isLoadingComments ? (
                <div className="text-center py-8">
                    <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-xs mt-2">Loading comments...</p>
                </div>
            ) : unresolvedComments.length > 0 ? (
                unresolvedComments.map(comment => (
                    <div
                        key={comment.id}
                        className={`p-3 bg-white dark:bg-[#1E2028] border rounded-xl shadow-sm cursor-pointer transition-all ${
                            activeInlineComment?.id === comment.id
                                ? 'border-yellow-400 dark:border-yellow-500/50 ring-2 ring-yellow-200 dark:ring-yellow-500/20'
                                : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-[#3D3F46]'
                        }`}
                        onClick={() => {
                            if (comment.selectionId) {
                                // Scroll to and highlight the inline comment in the document
                                const highlight = contentRef.current?.querySelector(`[data-selection-id="${comment.selectionId}"]`);
                                if (highlight) {
                                    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    highlight.classList.add('ring-2', 'ring-yellow-400');
                                    setTimeout(() => {
                                        highlight.classList.remove('ring-2', 'ring-yellow-400');
                                    }, 2000);
                                }
                                setActiveInlineComment(comment);
                            }
                        }}
                    >
                        {/* Selected text preview for inline comments */}
                        {comment.selectedText && (
                            <div className="mb-2 px-2 py-1 bg-yellow-50 dark:bg-yellow-500/10 border-l-2 border-yellow-400 dark:border-yellow-500/50 rounded-r">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                                    "{comment.selectedText.length > 60 ? comment.selectedText.substring(0, 60) + '...' : comment.selectedText}"
                                </p>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <img src={comment.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} className="w-6 h-6 rounded-full mt-1" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">{comment.userName || 'Unknown'}</span>
                                        <span className="text-[10px] text-gray-400">{timeAgo(new Date(comment.createdAt))}</span>
                                        {comment.isEdited && <span className="text-[9px] text-gray-400">(edited)</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleResolveComment(comment.id); }}
                                            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                            title="Resolve comment"
                                        >
                                            <Check size={12} />
                                        </button>
                                        {comment.userId === currentUserId && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                title="Delete comment"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                    <MentionText text={comment.text} users={allUsers} />
                                </div>

                                {/* Reply button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setReplyingToId(replyingToId === comment.id ? null : comment.id); }}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-2"
                                >
                                    Reply
                                </button>

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-[#2D2F36] space-y-3">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex items-start gap-2">
                                                <img src={reply.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userName || 'User')}&background=random`} className="w-5 h-5 rounded-full mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[#172B4D] dark:text-gray-200">{reply.userName || 'Unknown'}</span>
                                                        <span className="text-[9px] text-gray-400">{timeAgo(new Date(reply.createdAt))}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                                                        <MentionText text={reply.text} users={allUsers} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reply input */}
                                {replyingToId === comment.id && (
                                    <div className="mt-3 pl-4 border-l-2 border-blue-300 dark:border-blue-500/30">
                                        <MentionInput
                                            value={replyText}
                                            onChange={setReplyText}
                                            onMentionsChange={setReplyMentions}
                                            onSubmit={() => handlePostComment(comment.id)}
                                            placeholder="Write a reply... Use @ to mention"
                                            users={allUsers}
                                            rows={2}
                                            className="text-[11px]"
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => handlePostComment(comment.id)}
                                                disabled={!replyText.trim()}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                            >
                                                Reply
                                            </button>
                                            <button
                                                onClick={() => { setReplyingToId(null); setReplyText(''); }}
                                                className="px-2 py-1 text-gray-500 text-[10px] hover:text-gray-700 dark:hover:text-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-gray-400 text-xs">No comments yet.</div>
            )}

            {/* Resolved comments section */}
            {resolvedComments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2"
                    >
                        <ChevronRight size={14} className={`transition-transform ${showResolved ? 'rotate-90' : ''}`} />
                        <span>{resolvedComments.length} resolved</span>
                    </button>
                    {showResolved && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            {resolvedComments.map(comment => (
                                <div key={comment.id} className="p-3 bg-gray-50 dark:bg-[#1E2028]/50 border border-gray-200 dark:border-[#2D2F36] rounded-xl opacity-60">
                                    <div className="flex items-start gap-3">
                                        <img src={comment.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} className="w-5 h-5 rounded-full mt-1" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold text-gray-500">{comment.userName || 'Unknown'}</span>
                                                <button
                                                    onClick={() => handleUnresolveComment(comment.id)}
                                                    className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    Reopen
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1 line-through">
                                                <MentionText text={comment.text} users={allUsers} />
                                            </div>
                                            {comment.resolvedByName && (
                                                <p className="text-[9px] text-green-600 dark:text-green-400 mt-1">
                                                    Resolved by {comment.resolvedByName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* New comment input */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                <MentionInput
                    value={newCommentText}
                    onChange={setNewCommentText}
                    onMentionsChange={setNewCommentMentions}
                    onSubmit={() => handlePostComment()}
                    placeholder="Add a comment... Use @ to mention"
                    users={allUsers}
                    rows={3}
                />
                <button
                    onClick={() => handlePostComment()}
                    disabled={!newCommentText.trim()}
                    className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                    Post Comment
                </button>
            </div>
        </>
    );
};

export default DocumentComments;
