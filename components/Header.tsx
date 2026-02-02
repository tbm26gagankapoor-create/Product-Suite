
import React from 'react';
import { Star, MoreHorizontal, UserPlus, AlertCircle } from 'lucide-react';
import { Project } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import ProductIcon from './ProductIcon';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  selectedSprintId?: string;
  onSprintChange?: (id: string) => void;
  activeProject?: Project;
  onFixDates?: () => void;
  missingDateCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  activeTab = 'Overview', 
  onTabChange = (_: string) => {},
  selectedSprintId,
  onSprintChange,
  activeProject,
  onFixDates,
  missingDateCount = 0
}) => {
  const { users } = useProjectData();
  const tabs = ['Overview', 'PRD', 'Sprints', 'Tasks', 'Boards', 'Timeline', 'Calendar', 'Teams', 'Files'];

  // Resolve members from context - ensure uniqueness
  const uniqueMemberIds = Array.from(new Set(activeProject?.members || []));
  const projectMembers = uniqueMemberIds.map(id => users.find(u => u.id === id)).filter(Boolean) || [];

  return (
    <div className="flex flex-col bg-white dark:bg-[#0B0C0E] transition-colors duration-200 pt-8 pb-0 px-8 border-b border-gray-200 dark:border-[#1F2128]">
      
      {/* Top Row: Project Title & Context */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
             {activeProject ? (
                 <ProductIcon project={activeProject} size="lg" className="shadow-lg shadow-blue-500/20" />
             ) : (
                 <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-[#1F2128] animate-pulse"></div>
             )}
             
             <div>
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white tracking-tight">
                        {activeProject?.name || 'Project Name'}
                    </h1>
                    <button className="text-gray-400 hover:text-yellow-400 transition-colors">
                        <Star size={16} />
                    </button>
                    <div className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20">
                        {activeProject?.status || 'Active'}
                    </div>
                 </div>
                 <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="hover:underline cursor-pointer">Infinia Technologies</span>
                    <span>/</span>
                    <span className="hover:underline cursor-pointer">Product</span>
                 </div>
             </div>
        </div>

        <div className="flex items-center gap-3">
             {missingDateCount > 0 && onFixDates && (
                 <button 
                    onClick={onFixDates}
                    className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors animate-in fade-in"
                 >
                    <AlertCircle size={16} />
                    <span>Set {missingDateCount} Dates</span>
                 </button>
             )}
             
             <div className="flex -space-x-2 mr-2">
                {projectMembers.slice(0, 4).map(u => (
                    <img key={u.id} src={u.avatarUrl} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0B0C0E]" title={u.name} />
                ))}
                {projectMembers.length > 4 && (
                    <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1F2128] border-2 border-white dark:border-[#0B0C0E] flex items-center justify-center text-gray-500 text-xs font-medium">
                        +{projectMembers.length - 4}
                    </button>
                )}
             </div>
             <button className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] px-3 py-1.5 rounded-lg transition-colors">
                <UserPlus size={16} />
                Share
             </button>
             <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors">
                 <MoreHorizontal size={20} />
             </button>
        </div>
      </div>

      {/* Bottom Row: Navigation Tabs & Controls */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`pb-3 text-[14px] font-medium transition-all relative select-none whitespace-nowrap ${
                        activeTab === tab 
                        ? 'text-[#172B4D] dark:text-white' 
                        : 'text-[#5E6C84] dark:text-gray-500 hover:text-[#172B4D] dark:hover:text-gray-300'
                    }`}
                >
                    {tab}
                    {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#172B4D] dark:bg-white rounded-t-full"></div>
                    )}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Header;
