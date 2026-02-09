
import React from 'react';
import {
  MoreHorizontal, Trash2, Edit3, Play, File as FileIcon
} from 'lucide-react';
import { Project } from '../../types';
import ProductIcon, { getProductTheme } from '../ProductIcon';

interface DraftCardProps {
  project: Project;
  activeDropdown: string | null;
  onResumeDraft: (project: Project) => void;
  onToggleDropdown: (e: React.MouseEvent, projectId: string) => void;
  onEditProject: (e: React.MouseEvent, project: Project) => void;
  onDeleteProject: (e: React.MouseEvent, project: Project) => void;
}

const DraftCard: React.FC<DraftCardProps> = ({
  project,
  activeDropdown,
  onResumeDraft,
  onToggleDropdown,
  onEditProject,
  onDeleteProject,
}) => {
  const { gradient } = getProductTheme(project.id);
  const bgGradient = project.iconColor || gradient;

  return (
    <div
      onClick={() => onResumeDraft(project)}
      className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-white/5 p-6 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
    >
      {/* Decorative Background Blob - matches product theme */}
      <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${bgGradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>

      {/* Card Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <ProductIcon project={project} size="lg" className="shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform duration-300" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            <FileIcon size={10} className="mr-1" />
            Draft
          </div>
          <button
            onClick={(e) => onToggleDropdown(e, project.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          {activeDropdown === project.id && (
            <div
              className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <button
                onClick={(e) => onEditProject(e, project)}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-2 text-gray-700 dark:text-gray-200"
              >
                <Edit3 size={12} /> Edit
              </button>
              <button
                onClick={(e) => onDeleteProject(e, project)}
                className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 relative z-10">
        {project.name}
        <Play size={18} className="opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0 text-blue-500" />
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[40px] relative z-10">
        <span className="italic text-amber-600 dark:text-amber-400">
          Click to resume from step {project.draftStep || 1}
        </span>
      </p>

      {/* Empty metadata/progress area to maintain card height consistency */}
      <div className="mt-auto relative z-10">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
          <span>Progress</span>
          <span className="text-blue-500">0%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden mb-5">
          <div
            className="h-full rounded-full transition-all duration-1000 bg-blue-400"
            style={{ width: '0%' }}
          ></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center -space-x-2"></div>
          {project.tags && project.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {project.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2128] px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {project.tags.length > 2 && (
                <span className="text-[10px] text-gray-400">+{project.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftCard;
