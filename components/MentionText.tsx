import React from 'react';
import { User } from '../types';

interface MentionTextProps {
  text: string;
  users?: User[];
  className?: string;
}

const MentionText: React.FC<MentionTextProps> = ({
  text,
  users = [],
  className = '',
}) => {
  // Parse text and highlight @mentions
  const renderTextWithMentions = () => {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionStart = match.index;
      const mentionEnd = mentionStart + match[0].length;
      const username = match[1];

      // Add text before mention
      if (mentionStart > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, mentionStart)}
          </span>
        );
      }

      // Find user by name
      const mentionedUser = users.find(
        u => u.name.toLowerCase() === username.toLowerCase() ||
             u.name.split(' ')[0].toLowerCase() === username.toLowerCase()
      );

      // Add mention with highlight
      parts.push(
        <span
          key={`mention-${mentionStart}`}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
          title={mentionedUser ? `${mentionedUser.name}${mentionedUser.email ? ` (${mentionedUser.email})` : ''}` : username}
        >
          @{username}
        </span>
      );

      lastIndex = mentionEnd;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {renderTextWithMentions()}
    </span>
  );
};

export default MentionText;
