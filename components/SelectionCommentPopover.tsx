import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send } from 'lucide-react';
import { User } from '../types';
import MentionInput from './MentionInput';

interface SelectionCommentPopoverProps {
  selectedText: string;
  position: { x: number; y: number };
  onAddComment: (text: string, selectedText: string, selectionId: string, mentions?: string[]) => Promise<void>;
  onClose: () => void;
  users: User[];
}

const SelectionCommentPopover: React.FC<SelectionCommentPopoverProps> = ({
  selectedText,
  position,
  onAddComment,
  onClose,
  users,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      // Generate a unique selection ID
      const selectionId = `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await onAddComment(commentText, selectedText, selectionId, commentMentions);
      setCommentText('');
      setCommentMentions([]);
      onClose();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate position to keep popover in viewport
  const getPopoverStyle = () => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
    };

    // Position above the selection
    style.left = position.x;
    style.top = position.y - 10;
    style.transform = 'translate(-50%, -100%)';

    return style;
  };

  return (
    <div
      ref={popoverRef}
      style={getPopoverStyle()}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      {!isExpanded ? (
        // Compact button to start comment
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-xl hover:bg-blue-700 transition-colors text-xs font-medium"
        >
          <MessageSquarePlus size={14} />
          <span>Comment</span>
        </button>
      ) : (
        // Expanded comment form
        <div className="w-72 bg-white dark:bg-[#1F2128] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2D2F36] overflow-hidden">
          {/* Header with selected text preview */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#15171E]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected text</span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
              "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
            </p>
          </div>

          {/* Comment input */}
          <div className="p-3">
            <MentionInput
              value={commentText}
              onChange={setCommentText}
              onMentionsChange={setCommentMentions}
              onSubmit={handleSubmit}
              placeholder="Add a comment... Use @ to mention"
              users={users}
              rows={2}
              className="text-xs"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={onClose}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!commentText.trim() || isSubmitting}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                <Send size={12} />
                <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionCommentPopover;
