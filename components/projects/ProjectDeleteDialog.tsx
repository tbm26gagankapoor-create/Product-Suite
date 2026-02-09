
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Project } from '../../types';

interface ProjectDeleteDialogProps {
  project: Project | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ProjectDeleteDialog: React.FC<ProjectDeleteDialogProps> = ({
  project,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!project) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-white dark:bg-[#15171E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">Delete Project?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Are you sure you want to delete <strong>{project.name}</strong>? This action will soft-delete the project along with all associated tasks, sprints, and epics.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProjectDeleteDialog;
