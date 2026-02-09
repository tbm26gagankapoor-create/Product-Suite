
import React, { useState, useRef, useEffect } from 'react';
import { Star, MoreHorizontal, UserPlus, AlertCircle, ChevronDown, Zap, Check } from 'lucide-react';
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
  const { users, sprints, tasks, currentOrganization } = useProjectData();
  const tabs = ['Overview', 'Documents', 'Sprints', 'Tasks', 'Boards', 'Timeline', 'Calendar', 'Teams', 'Files'];

  // Sprint selector state
  const [isSprintDropdownOpen, setIsSprintDropdownOpen] = useState(false);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(event.target as Node)) {
        setIsSprintDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get sprints for this project, sorted by status (active first)
  const projectSprints = sprints
    .filter(s => s.projectId === activeProject?.id)
    .sort((a, b) => {
      const statusOrder = { active: 0, planned: 1, completed: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  // Get task counts per sprint
  const getSprintTaskCount = (sprintId: string) => {
    return tasks.filter(t => t.sprintId === sprintId && t.projectId === activeProject?.id && t.type !== 'epic').length;
  };

  // Get all tasks count (for "All Tasks" option)
  const allProjectTasksCount = tasks.filter(t => t.projectId === activeProject?.id && t.type !== 'epic').length;

  // Get selected sprint
  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  // Show sprint selector only on Boards and Tasks tabs
  const showSprintSelector = (activeTab === 'Boards' || activeTab === 'Tasks') && onSprintChange;

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
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        activeProject?.status === 'Completed' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                        activeProject?.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                        activeProject?.status === 'On Hold' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                        activeProject?.status === 'Archived' ? 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/20' :
                        'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                    }`}>
                        {activeProject?.status || 'Active'}
                    </div>
                 </div>
                 <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="hover:underline cursor-pointer">{currentOrganization?.name || 'Organization'}</span>
                    <span>/</span>
                    <span className="hover:underline cursor-pointer">Product</span>
                 </div>
             </div>
        </div>

        <div className="flex items-center gap-3">
             {/* Sprint Selector Dropdown */}
             {showSprintSelector && (
                 <div className="relative" ref={sprintDropdownRef}>
                     <button
                         onClick={() => setIsSprintDropdownOpen(!isSprintDropdownOpen)}
                         className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2D2F36] bg-white dark:bg-[#15171E] hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
                     >
                         <Zap size={14} className="text-purple-500" />
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                             {selectedSprint?.name || 'All Tasks'}
                         </span>
                         {selectedSprint && (
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                 selectedSprint.status === 'active'
                                     ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                     : selectedSprint.status === 'planned'
                                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                     : 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
                             }`}>
                                 {selectedSprint.status}
                             </span>
                         )}
                         <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSprintDropdownOpen ? 'rotate-180' : ''}`} />
                     </button>

                     {isSprintDropdownOpen && (
                         <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                             <div className="p-1">
                                 {/* All Tasks Option */}
                                 <button
                                     onClick={() => {
                                         onSprintChange?.('');
                                         setIsSprintDropdownOpen(false);
                                     }}
                                     className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                         !selectedSprintId
                                             ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                             : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2D2F36]'
                                     }`}
                                 >
                                     <span className="text-sm font-medium">All Tasks</span>
                                     <div className="flex items-center gap-2">
                                         <span className="text-xs text-gray-500 dark:text-gray-400">{allProjectTasksCount}</span>
                                         {!selectedSprintId && <Check size={14} className="text-blue-500" />}
                                     </div>
                                 </button>

                                 {projectSprints.length > 0 && (
                                     <div className="h-px bg-gray-100 dark:bg-[#2D2F36] my-1" />
                                 )}

                                 {/* Sprint Options */}
                                 {projectSprints.map((sprint) => (
                                     <button
                                         key={sprint.id}
                                         onClick={() => {
                                             onSprintChange?.(sprint.id);
                                             setIsSprintDropdownOpen(false);
                                         }}
                                         className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                             selectedSprintId === sprint.id
                                                 ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                 : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2D2F36]'
                                         }`}
                                     >
                                         <div className="flex items-center gap-2">
                                             <span className="text-sm font-medium truncate">{sprint.name}</span>
                                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                 sprint.status === 'active'
                                                     ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                                     : sprint.status === 'planned'
                                                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                                     : 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
                                             }`}>
                                                 {sprint.status}
                                             </span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="text-xs text-gray-500 dark:text-gray-400">{getSprintTaskCount(sprint.id)}</span>
                                             {selectedSprintId === sprint.id && <Check size={14} className="text-blue-500" />}
                                         </div>
                                     </button>
                                 ))}

                                 {projectSprints.length === 0 && (
                                     <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                         No sprints for this project
                                     </div>
                                 )}
                             </div>
                         </div>
                     )}
                 </div>
             )}

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
