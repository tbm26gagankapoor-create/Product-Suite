
import React from 'react';
import {
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Task } from '../../types';
import * as LucideIcons from 'lucide-react';

// Helper to get icon class from config
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || LucideIcons.Circle;
};

interface SubtasksSectionProps {
  childTasks: Task[];
  currentTask: Task;
  getTaskTypeConfig: (type: string) => any;
  newSubtaskTitle: string;
  setNewSubtaskTitle: (value: string) => void;
  onAddChildTask: (e: React.FormEvent) => void;
  onUpdateChildTaskStatus: (child: Task) => void;
  onUpdateChildTaskDate: (child: Task, date: string) => void;
}

const SubtasksSection: React.FC<SubtasksSectionProps> = ({
  childTasks,
  currentTask,
  getTaskTypeConfig,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onAddChildTask,
  onUpdateChildTaskStatus,
  onUpdateChildTaskDate,
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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={14} /> Child Issues
        </label>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[#1F2128] px-2 py-0.5 rounded-full">{childTasks.length}</span>
      </div>

      <div className="border border-gray-200 dark:border-[#2D2F36] rounded-xl overflow-hidden bg-white dark:bg-[#15171E] shadow-sm">
        {/* List Header */}
        <div className="grid grid-cols-[32px_1fr_100px_100px_120px] gap-4 px-4 py-2 bg-gray-50/80 dark:bg-[#1F2128]/80 border-b border-gray-200 dark:border-[#2D2F36] text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
          <div></div>
          <div>Title</div>
          <div>Due Date</div>
          <div>Status</div>
          <div>Assignee</div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
          {childTasks.map((st: Task) => (
            <div key={st.id} className="grid grid-cols-[32px_1fr_100px_100px_120px] gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group">
              {/* Icon */}
              <div className="flex justify-center text-gray-400">
                {getTypeIcon(st.type)}
              </div>

              {/* Title */}
              <div className="min-w-0">
                <div className={`text-sm font-medium truncate ${st.columnId === 'done' ? 'text-gray-400 line-through' : 'text-[#172B4D] dark:text-gray-200'}`}>
                  {st.title}
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate">{st.id}</div>
              </div>

              {/* Due Date */}
              <div>
                <input
                  type="date"
                  value={st.dueDate || ''}
                  onChange={(e) => onUpdateChildTaskDate(st, e.target.value)}
                  className="bg-transparent text-xs text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded px-1 py-0.5 focus:border-blue-500 focus:outline-none transition-colors w-full"
                />
              </div>

              {/* Status */}
              <div>
                <button
                  onClick={() => onUpdateChildTaskStatus(st)}
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase w-full transition-colors ${
                    st.columnId === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                    st.columnId === 'inprogress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                  }`}
                >
                  {st.columnId === 'inprogress' ? 'In Progress' : st.columnId}
                </button>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2">
                <img src={st.assignee?.avatarUrl || currentTask.assignee?.avatarUrl} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700" />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{st.assignee?.name || currentTask.assignee?.name?.split(' ')[0]}</span>
              </div>
            </div>
          ))}

          {/* Add Row */}
          <form onSubmit={onAddChildTask} className="flex items-center gap-4 px-4 py-2 bg-gray-50/30 dark:bg-[#1F2128]/30">
            <div className="w-8 flex justify-center text-gray-400"><Plus size={16} /></div>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a child issue..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 placeholder:text-gray-400 text-[#172B4D] dark:text-gray-200 focus:outline-none"
            />
            <button type="submit" disabled={!newSubtaskTitle.trim()} className="text-xs font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubtasksSection;
