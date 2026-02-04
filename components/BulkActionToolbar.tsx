import React, { useState } from 'react';
import {
  X,
  Trash2,
  MoveRight,
  UserPlus,
  Flag,
  CheckCircle,
  MoreHorizontal,
  Zap,
  Calendar
} from 'lucide-react';
import { Task, Sprint, User, Priority } from '../types';
import { useConfig } from '../context/ConfigContext';

interface BulkActionToolbarProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  onBulkStatusChange: (status: string) => void;
  onBulkAssigneeChange: (assigneeId: string) => void;
  onBulkPriorityChange: (priority: Priority) => void;
  onBulkSprintChange: (sprintId: string | null) => void;
  onBulkDelete: () => void;
  sprints: Sprint[];
  users: User[];
}

const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedTasks,
  onClearSelection,
  onBulkStatusChange,
  onBulkAssigneeChange,
  onBulkPriorityChange,
  onBulkSprintChange,
  onBulkDelete,
  sprints,
  users,
}) => {
  const { statuses } = useConfig();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (selectedTasks.length === 0) return null;

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleAction = (action: () => void) => {
    action();
    setActiveDropdown(null);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-[#1F2128] rounded-2xl shadow-2xl border border-gray-700 dark:border-[#2D2F36]">
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
            {selectedTasks.length}
          </span>
          <span className="text-sm font-medium text-gray-300">
            {selectedTasks.length === 1 ? 'task' : 'tasks'} selected
          </span>
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('status')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-expanded={activeDropdown === 'status'}
            aria-haspopup="true"
          >
            <MoveRight size={16} />
            <span className="hidden sm:inline">Move to</span>
          </button>

          {activeDropdown === 'status' && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
              <div className="p-1">
                {statuses.map((status) => (
                  <button
                    key={status.name}
                    onClick={() => handleAction(() => onBulkStatusChange(status.name))}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignee Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('assignee')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-expanded={activeDropdown === 'assignee'}
            aria-haspopup="true"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Assign</span>
          </button>

          {activeDropdown === 'assignee' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
              <div className="p-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAction(() => onBulkAssigneeChange(user.id))}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="truncate">{user.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Priority Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('priority')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-expanded={activeDropdown === 'priority'}
            aria-haspopup="true"
          >
            <Flag size={16} />
            <span className="hidden sm:inline">Priority</span>
          </button>

          {activeDropdown === 'priority' && (
            <div className="absolute bottom-full left-0 mb-2 w-40 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
              <div className="p-1">
                {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handleAction(() => onBulkPriorityChange(priority))}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      priority === 'HIGH'
                        ? 'text-red-400 hover:bg-red-500/10'
                        : priority === 'MEDIUM'
                        ? 'text-amber-400 hover:bg-amber-500/10'
                        : 'text-blue-400 hover:bg-blue-500/10'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        priority === 'HIGH'
                          ? 'bg-red-500'
                          : priority === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sprint Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('sprint')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-expanded={activeDropdown === 'sprint'}
            aria-haspopup="true"
          >
            <Zap size={16} />
            <span className="hidden sm:inline">Sprint</span>
          </button>

          {activeDropdown === 'sprint' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
              <div className="p-1">
                <button
                  onClick={() => handleAction(() => onBulkSprintChange(null))}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Remove from sprint
                </button>
                <div className="h-px bg-gray-700 my-1" />
                {sprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    onClick={() => handleAction(() => onBulkSprintChange(sprint.id))}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{sprint.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sprint.status === 'active'
                          ? 'bg-blue-500/10 text-blue-400'
                          : sprint.status === 'completed'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {sprint.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mark Complete */}
        <button
          onClick={() => onBulkStatusChange('done')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="Mark as complete"
        >
          <CheckCircle size={16} />
          <span className="hidden sm:inline">Complete</span>
        </button>

        {/* Delete */}
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete selected"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default BulkActionToolbar;
