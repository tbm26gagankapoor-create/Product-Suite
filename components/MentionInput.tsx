import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { User } from '../types';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
  onSubmit?: () => void;
  placeholder?: string;
  users: User[];
  className?: string;
  rows?: number;
  disabled?: boolean;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onMentionsChange,
  onSubmit,
  placeholder = 'Add a comment... Use @ to mention someone',
  users,
  className = '',
  rows = 3,
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, string>>(new Map()); // Map of name -> userId
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract mentioned user IDs from current text and notify parent
  useEffect(() => {
    if (!onMentionsChange) return;

    // Check which tracked mentions are still present in the text
    // We check for "@name" pattern for each known mentioned user
    const mentionedIds: string[] = [];
    mentionedUsers.forEach((userId, name) => {
      // Check if @name is still in the text (followed by space, end of string, or punctuation)
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[.,!?;:])`, 'i');
      if (mentionPattern.test(value)) {
        mentionedIds.push(userId);
      }
    });

    onMentionsChange(mentionedIds);
  }, [value, mentionedUsers, onMentionsChange]);

  // Filter users based on mention query
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(mentionQuery.toLowerCase()))
  ).slice(0, 6);

  // Reset selected index when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    onChange(newValue);

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space between @ and cursor (no longer in mention)
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowDropdown(true);
        return;
      }
    }

    setShowDropdown(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const insertMention = (user: User) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = value.slice(0, mentionStartIndex);
    const afterMention = value.slice(mentionStartIndex + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;

    // Track this user as mentioned
    setMentionedUsers(prev => {
      const updated = new Map(prev);
      updated.set(user.name, user.id);
      return updated;
    });

    onChange(newValue);
    setShowDropdown(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back to textarea and set cursor position
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = mentionStartIndex + user.name.length + 2; // +2 for @ and space
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredUsers.length === 0) {
      // Handle Cmd+Enter or Ctrl+Enter to submit
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          insertMention(filteredUsers[selectedIndex]);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          insertMention(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500/50 resize-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      />

      {/* Mention Dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 mt-1 w-64 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="p-1">
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2D2F36]'
                }`}
              >
                <img
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  {user.email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#15171E]">
            <span className="font-medium">Tab</span> or <span className="font-medium">Enter</span> to select, <span className="font-medium">Esc</span> to close
          </div>
        </div>
      )}

      {/* No results message */}
      {showDropdown && mentionQuery && filteredUsers.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 mt-1 w-64 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] overflow-hidden"
        >
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            No users found matching "{mentionQuery}"
          </div>
        </div>
      )}
    </div>
  );
};

export default MentionInput;
