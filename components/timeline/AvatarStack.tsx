import React from 'react';
import { User } from '../../types';

interface AvatarStackProps {
  users: User[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  borderColor?: string;
  showTooltip?: boolean;
}

const AvatarStack: React.FC<AvatarStackProps> = ({
  users,
  max = 3,
  size = 'sm',
  borderColor = 'border-white dark:border-[#15171E]',
  showTooltip = true,
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const overflowSizeClasses = {
    sm: 'w-5 h-5 text-[8px]',
    md: 'w-6 h-6 text-[9px]',
    lg: 'w-8 h-8 text-[10px]',
  };

  const visibleUsers = users.slice(0, max);
  const overflowCount = users.length - max;

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center -space-x-1.5">
      {visibleUsers.map((user, index) => (
        <img
          key={user.id}
          src={user.avatarUrl}
          alt={user.name}
          title={showTooltip ? user.name : undefined}
          className={`${sizeClasses[size]} rounded-full border-2 ${borderColor} object-cover shadow-sm transition-transform hover:scale-110 hover:z-10`}
          style={{ zIndex: max - index }}
        />
      ))}
      {overflowCount > 0 && (
        <div
          className={`${overflowSizeClasses[size]} rounded-full border-2 ${borderColor} bg-gray-200 dark:bg-[#2D2F36] flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-sm`}
          title={showTooltip ? `+${overflowCount} more` : undefined}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

export default AvatarStack;
