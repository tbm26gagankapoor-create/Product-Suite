
import React from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Wand2,
  Briefcase,
  Trash2,
} from 'lucide-react';
import { Task } from '../../types';
import * as LucideIcons from 'lucide-react';

// Helper to get icon class from config
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || LucideIcons.Circle;
};

interface TaskHeaderProps {
  currentTask: Task;
  currentProject: any;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
    canDelete: boolean;
    isReporter: boolean;
    isAssignee: boolean;
  };
  taskTypes: any[];
  getTaskTypeConfig: (type: string) => any;
  showAiPanel: boolean;
  setShowAiPanel: (show: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClose: () => void;
  // AI Panel props
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isAiGenerating: boolean;
  isEpic: boolean;
  onAiBuild: () => void;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  currentTask,
  currentProject,
  permissions,
  taskTypes,
  getTaskTypeConfig,
  showAiPanel,
  setShowAiPanel,
  setShowDeleteConfirm,
  onTypeChange,
  onClose,
  aiPrompt,
  setAiPrompt,
  isAiGenerating,
  isEpic,
  onAiBuild,
}) => {
  const getTypeIcon = (type?: string) => {
    const config = getTaskTypeConfig(type || 'task');
    if (config) {
      const IconComponent = getIconComponentByName(config.icon);
      return <IconComponent size={14} className={config.color} />;
    }
    return <LucideIcons.CheckSquare size={14} className="text-blue-500" />;
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Type Selector - requires edit permission */}
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {getTypeIcon(currentTask.type)}
            </div>
            <select
              value={currentTask.type || 'task'}
              onChange={onTypeChange}
              disabled={!permissions.canEdit}
              className={`bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg pl-8 pr-3 py-1 text-xs font-medium text-[#172B4D] dark:text-white outline-none focus:border-blue-500 shadow-sm capitalize appearance-none transition-colors ${permissions.canEdit ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2D2F36]/80' : 'cursor-default opacity-75'}`}
            >
              {taskTypes.map(t => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Task ID */}
          <span className="text-xs font-mono text-gray-500 bg-gray-50 dark:bg-[#1F2128] px-2 py-1 rounded border border-gray-200 dark:border-[#2D2F36]">
            {currentTask.id}
          </span>

          {/* Project */}
          {currentProject && (
            <>
              <div className="h-4 w-px bg-gray-300 dark:bg-[#2D2F36]"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Briefcase size={14} />
                {currentProject.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Assist Button */}
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showAiPanel ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'}`}
          >
            <Sparkles size={14} fill={showAiPanel ? "currentColor" : "none"} />
            AI Assist
          </button>
          <div className="h-4 w-px bg-gray-300 dark:bg-[#2D2F36] mx-1"></div>
          {/* Delete - only show if user has permission */}
          {permissions.canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
              title="Delete Task"
            >
              <Trash2 size={18} />
            </button>
          )}
          {/* Close */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] ml-2">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* AI Panel */}
      {showAiPanel && (
        <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 bg-purple-100 dark:bg-purple-800 rounded-md text-purple-600 dark:text-purple-300">
              <Wand2 size={16} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-2">Build with AI</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={isEpic ? "e.g. Detailed subtasks for mobile app MVP with user flows..." : "e.g. Write a comprehensive technical spec for this bug fix..."}
                className="w-full bg-white dark:bg-[#0B0C0E] border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20 mb-3 placeholder:text-gray-400"
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  onClick={onAiBuild}
                  disabled={!aiPrompt.trim() || isAiGenerating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskHeader;
