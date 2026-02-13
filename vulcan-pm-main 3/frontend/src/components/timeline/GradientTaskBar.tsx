import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Task, User } from '../../types';
import { TASK_GRADIENTS } from '../../utils/timelineUtils';
import AvatarStack from './AvatarStack';

interface GradientTaskBarProps {
  task: {
    id: string;
    title: string;
    columnId: string;
    assignee?: User;
    originalTask?: Task;
  };
  left: number;
  width: number;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

const GradientTaskBar: React.FC<GradientTaskBarProps> = ({
  task,
  left,
  width,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const gradient = TASK_GRADIENTS[task.columnId] || TASK_GRADIENTS.todo;
  const minWidthForTitle = 80;
  const minWidthForAvatar = 60;

  // Collect assignees (could expand to multiple if needed)
  const assignees: User[] = task.assignee ? [task.assignee] : [];

  // Build gradient string with optional via color
  const gradientStyle = gradient.via
    ? `linear-gradient(90deg, ${gradient.from} 0%, ${gradient.via} 50%, ${gradient.to} 100%)`
    : `linear-gradient(90deg, ${gradient.from} 0%, ${gradient.to} 100%)`;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-8 rounded-xl shadow-lg hover:shadow-xl cursor-pointer group flex items-center overflow-hidden transition-all duration-200 hover:scale-[1.01]"
      style={{
        left,
        width: Math.max(width, 24),
        background: gradientStyle,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        onMouseEnter(e);
        setShowMenu(true);
      }}
      onMouseLeave={() => {
        onMouseLeave();
        setShowMenu(false);
      }}
    >
      {/* Content */}
      <div className="flex items-center justify-between w-full px-3 gap-2">
        {/* Task Title */}
        {width >= minWidthForTitle && (
          <span className="text-[10px] font-semibold text-gray-700 truncate flex-1 min-w-0">
            {task.title}
          </span>
        )}

        {/* Right side: Avatar + Menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Avatar Stack */}
          {width >= minWidthForAvatar && assignees.length > 0 && (
            <AvatarStack
              users={assignees}
              max={2}
              size="sm"
              borderColor="border-white/80"
              showTooltip={false}
            />
          )}

          {/* More Options Menu Button */}
          <button
            className={`p-0.5 rounded-full hover:bg-black/10 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`}
            onClick={(e) => {
              e.stopPropagation();
              // Could trigger a dropdown menu here
            }}
          >
            <MoreHorizontal size={12} className="text-gray-600/70" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradientTaskBar;
