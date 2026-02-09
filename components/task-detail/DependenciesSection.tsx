
import React from 'react';
import {
  X,
  Plus,
  AlertCircle,
  Loader2,
  PauseCircle,
  Link2,
} from 'lucide-react';
import { TaskLink, AvailableTask } from '../../services/tasks.service';
import SidebarSection from './SidebarSection';

interface DependenciesSectionProps {
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
    canDelete: boolean;
    isReporter: boolean;
    isAssignee: boolean;
  };
  blockedByTasks: TaskLink[];
  blocksTasks: TaskLink[];
  isLoadingLinks: boolean;
  showBlockedByDropdown: boolean;
  setShowBlockedByDropdown: (show: boolean) => void;
  blockingSearchTerm: string;
  setBlockingSearchTerm: (value: string) => void;
  filteredAvailableTasks: AvailableTask[];
  onLoadAvailableTasks: () => void;
  onAddBlockingTask: (task: AvailableTask) => void;
  onRemoveBlockingTask: (linkId: string) => void;
}

const DependenciesSection: React.FC<DependenciesSectionProps> = ({
  permissions,
  blockedByTasks,
  blocksTasks,
  isLoadingLinks,
  showBlockedByDropdown,
  setShowBlockedByDropdown,
  blockingSearchTerm,
  setBlockingSearchTerm,
  filteredAvailableTasks,
  onLoadAvailableTasks,
  onAddBlockingTask,
  onRemoveBlockingTask,
}) => {
  return (
    <SidebarSection title="Dependencies">
      <div className="space-y-4">
        {/* Blocked By Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <PauseCircle size={10} className="text-red-500" /> Blocked By
          </label>

          {isLoadingLinks ? (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Loading...
            </div>
          ) : blockedByTasks.length === 0 ? (
            <div className="text-xs text-gray-400">No blocking tasks</div>
          ) : (
            <div className="space-y-1.5">
              {blockedByTasks.map((link) => (
                <div key={link.id} className="flex items-center gap-2 group">
                  <div className="flex-1 flex items-center gap-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 px-2 py-1.5 rounded-md">
                    <Link2 size={10} className="text-red-400 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-gray-500">{link.blocking_task?.task_key}</span>
                    <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate flex-1">
                      {link.blocking_task?.title}
                    </span>
                  </div>
                  {permissions.canEdit && (
                    <button
                      onClick={() => onRemoveBlockingTask(link.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Blocking Task Button/Dropdown - requires edit permission */}
          {permissions.canEdit && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowBlockedByDropdown(!showBlockedByDropdown);
                  if (!showBlockedByDropdown) onLoadAvailableTasks();
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus size={10} /> Add blocking task
              </button>

            {showBlockedByDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBlockedByDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden max-h-80">
                  {/* Search Input */}
                  <div className="px-3 pb-2">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={blockingSearchTerm}
                      onChange={(e) => setBlockingSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  {/* Task List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredAvailableTasks.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-gray-400 text-center">
                        No tasks available for linking
                      </div>
                    ) : (
                      filteredAvailableTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => onAddBlockingTask(task)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#2D2F36] text-left transition-colors"
                        >
                          <span className="text-[10px] font-mono text-gray-400">{task.task_key}</span>
                          <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate flex-1">
                            {task.title}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          )}
        </div>

        {/* Blocks Section (read-only display) */}
        {blocksTasks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#2D2F36]">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={10} className="text-amber-500" /> Blocks
            </label>
            <div className="space-y-1.5">
              {blocksTasks.map((link) => (
                <div key={link.id} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 px-2 py-1.5 rounded-md">
                  <Link2 size={10} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] font-mono text-gray-500">{link.blocked_task?.task_key}</span>
                  <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate">
                    {link.blocked_task?.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SidebarSection>
  );
};

export default DependenciesSection;
