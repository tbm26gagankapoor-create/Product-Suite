
import React from 'react';
import {
  MoreHorizontal, Calendar, ArrowUpRight,
  Trash2, Edit3, CheckSquare, Hexagon, Clock, Activity
} from 'lucide-react';
import { Project, User } from '../../types';
import ProductIcon from '../ProductIcon';

interface ProjectListRowProps {
  project: Project;
  users: User[];
  progress: number;
  stats: { total: number; epics: number; tasks: number; completed: number };
  activeDropdown: string | null;
  onProjectSelect: (id: string) => void;
  onToggleDropdown: (e: React.MouseEvent, projectId: string) => void;
  onEditProject: (e: React.MouseEvent, project: Project) => void;
  onDeleteProject: (e: React.MouseEvent, project: Project) => void;
  getStatusColor: (status: string) => string;
  formatShortDate: (dateString?: string) => string;
}

const ProjectListRow: React.FC<ProjectListRowProps> = ({
  project,
  users,
  progress,
  stats,
  activeDropdown,
  onProjectSelect,
  onToggleDropdown,
  onEditProject,
  onDeleteProject,
  getStatusColor,
  formatShortDate,
}) => {
  return (
    <div
      onClick={() => onProjectSelect(project.id)}
      className="grid grid-cols-[minmax(280px,2fr)_100px_100px_80px_80px_140px_70px_44px] gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group"
    >
      {/* Product Column */}
      <div className="flex items-center gap-4">
        <ProductIcon project={project} size="md" className="flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#172B4D] dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.name}
            </h3>
            <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 flex-shrink-0" />
          </div>
          <p className="text-xs text-gray-500 truncate">{project.description}</p>
        </div>
      </div>

      {/* Status Column */}
      <div className="flex flex-col gap-1">
        <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(project.status)}`}>
          {project.status}
        </div>
        {project.healthStatus && (
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-gray-500 dark:text-gray-400">
            <Activity size={9} strokeWidth={1.5} />
            <span className="capitalize">{project.healthStatus.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Start Date Column */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar size={12} className="opacity-50 flex-shrink-0" />
        <span className="truncate">{formatShortDate(project.startDate)}</span>
      </div>

      {/* Due Date Column */}
      <div className={`flex items-center gap-1.5 text-xs ${project.dueDate && new Date(project.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
        <Clock size={12} className="opacity-50 flex-shrink-0" />
        <span className="truncate">{formatShortDate(project.dueDate)}</span>
      </div>

      {/* Tasks Count Column */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title={`${stats.epics} epics, ${stats.tasks} tasks`}>
          <CheckSquare size={12} strokeWidth={1.5} />
          <span className="font-medium">{stats.total}</span>
        </div>
        {stats.epics > 0 && (
          <div className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400" title={`${stats.epics} epics`}>
            <Hexagon size={10} strokeWidth={1.5} />
            <span>{stats.epics}</span>
          </div>
        )}
      </div>

      {/* Progress Column */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className={`text-[10px] font-medium w-8 text-right ${progress === 100 ? 'text-emerald-500' : 'text-blue-500'}`}>{progress}%</span>
        </div>
      </div>

      {/* Members Column */}
      <div>
        <div className="flex items-center -space-x-2">
          {project.members.slice(0, 3).map((userId, i) => {
            const user = users.find(u => u.id === userId);
            return user ? (
              <img key={i} src={user.avatarUrl} title={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#15171E] object-cover" />
            ) : null;
          })}
          {project.members.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#15171E] bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-[9px] text-gray-500 font-bold">
              +{project.members.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end relative">
        <button
          onClick={(e) => onToggleDropdown(e, project.id)}
          className="text-gray-400 hover:text-[#172B4D] dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
        >
          <MoreHorizontal size={18} />
        </button>
        {activeDropdown === project.id && (
          <div
            className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button
              onClick={(e) => onEditProject(e, project)}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium"
            >
              <Edit3 size={14} /> Edit Project
            </button>
            <div className="h-px bg-gray-100 dark:bg-[#2D2F36]"></div>
            <button
              onClick={(e) => onDeleteProject(e, project)}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 font-medium"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectListRow;
