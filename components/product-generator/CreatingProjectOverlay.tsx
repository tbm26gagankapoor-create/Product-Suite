import React from 'react';
import { Briefcase } from 'lucide-react';

interface CreatingProjectOverlayProps {
  creationProgress: number;
}

const CreatingProjectOverlay: React.FC<CreatingProjectOverlayProps> = ({
  creationProgress,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#12141A] animate-in fade-in duration-500 z-50">
        <div className="relative mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30 animate-pulse">
                <Briefcase size={40} className="text-white" />
            </div>
        </div>
        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">Creating Your Project</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm">
            Setting up epics, tasks, and initializing your workspace...
        </p>

        <div className="w-80 bg-gray-100 dark:bg-[#1F2128] rounded-full h-3 overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${creationProgress}%` }}
            />
        </div>

        <div className="flex gap-8 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span className={creationProgress > 20 ? "text-green-600 dark:text-green-400" : ""}>Structure</span>
            <span className={creationProgress > 50 ? "text-green-600 dark:text-green-400" : ""}>Epics</span>
            <span className={creationProgress > 80 ? "text-green-600 dark:text-green-400" : ""}>Tasks</span>
            <span className={creationProgress > 95 ? "text-green-600 dark:text-green-400" : ""}>Complete</span>
        </div>
    </div>
  );
};

export default CreatingProjectOverlay;
