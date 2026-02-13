
import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Sun, Moon,
  PanelLeft, LogOut, LayoutGrid, Zap,
  Users, Package, Settings2, Shield, UserCog,
  ListTodo, Layout, Calendar, ChevronDown, ChevronRight, Plus,
  Search, Check, FolderOpen, ArrowRight
} from 'lucide-react';
import { VulcanIcon } from './VulcanLogo';
import { DOC_NAV_ITEMS } from '../constants';
import { View } from '../App';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../context/ProjectDataContext';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  activeProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  activeDocSection: string;
  onDocSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout, activeProjectId, onProjectSelect, activeDocSection, onDocSectionChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currentUser, projects, isOrgAdmin } = useProjectData();

  // Project Dropdown
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const projectSearchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // KB / Docs Expandable
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Close dropdowns on click outside (check both trigger and menu refs)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = projectDropdownRef.current?.contains(target);
      const clickedMenu = dropdownMenuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setShowProjectDropdown(false);
        setProjectSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position and focus search when dropdown opens
  useEffect(() => {
    if (showProjectDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: isCollapsed ? rect.right + 8 : rect.left,
        width: isCollapsed ? 256 : rect.width,
      });
      setTimeout(() => projectSearchRef.current?.focus(), 50);
    }
  }, [showProjectDropdown, isCollapsed]);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.key?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Auto-expand docs section when documents view is active
  useEffect(() => {
    if (currentView === 'documents') {
      setIsDocsExpanded(true);
    }
  }, [currentView]);

  // --- Project Context Nav Items ---
  const projectNavItems = [
    { id: 'overview' as View, label: 'Overview', icon: LayoutGrid },
    { id: 'documents' as View, label: 'KB / Docs', icon: FileText, expandable: true },
    { id: 'sprints' as View, label: 'Sprints', icon: Zap },
    { id: 'tasks' as View, label: 'Tasks', icon: ListTodo },
    { id: 'boards' as View, label: 'Boards', icon: Layout },
    { id: 'timeline' as View, label: 'Timeline', icon: Calendar },
    { id: 'teams' as View, label: 'Teams', icon: Users },
  ];

  // --- Utility Nav Items ---
  const utilityNavItems = [
    { id: 'settings' as View, label: 'Settings', icon: Settings2 },
    ...(isOrgAdmin ? [
      { id: 'org-admin' as View, label: 'Org Admin', icon: Shield },
      { id: 'users' as View, label: 'Users', icon: UserCog },
    ] : []),
  ];

  const isNavActive = (itemId: View) => {
    if (itemId === 'overview' && (currentView === 'overview' || currentView === 'project' || currentView === 'home')) return true;
    return currentView === itemId;
  };

  return (
    <aside
      className={`${isCollapsed ? 'w-[60px]' : 'w-[220px]'} bg-[#FAFAFA] dark:bg-[#15171E] border-r border-gray-200 dark:border-[#1F2128] flex flex-col h-screen text-gray-600 dark:text-gray-400 font-medium flex-shrink-0 select-none transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] relative shadow-xl z-40`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-full p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-all z-50 shadow-sm hover:shadow-md hover:scale-110"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <PanelLeft size={12} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo Area */}
      <div className={`h-[56px] flex items-center ${isCollapsed ? 'justify-center px-1' : 'px-5'}`}>
        <div
          className={`flex items-center cursor-pointer group transition-all duration-300 ${isCollapsed ? 'justify-center gap-0' : 'gap-2.5'}`}
          onClick={() => onViewChange('overview')}
        >
           <VulcanIcon size={26} className="text-black dark:text-white group-hover:scale-105 transition-transform duration-300 flex-shrink-0" />
           <div className={`flex flex-col justify-center transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
               <span className="font-bold text-[13px] text-gray-900 dark:text-white leading-none tracking-tight">VULCAN</span>
               <span className="text-[9px] text-gray-400 font-bold tracking-[0.2em] leading-none mt-0.5 uppercase">Product Suite</span>
           </div>
        </div>
      </div>

      {/* Divider */}
      <div className={`mx-5 mb-3 border-b border-gray-200 dark:border-[#2D2F36] ${isCollapsed ? 'hidden' : ''}`}></div>

      <div className={`flex-1 overflow-y-auto py-1.5 custom-scrollbar flex flex-col gap-1.5 overflow-x-hidden ${isCollapsed ? 'px-1.5' : 'px-3'}`}>

        {/* Project Dropdown Trigger */}
        <div ref={projectDropdownRef} className={`${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <button
              ref={triggerRef}
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-[#2D2F36] hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
              title={activeProject?.name || 'Select Project'}
            >
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activeProject?.color || 'from-blue-500 to-blue-600'} flex items-center justify-center text-white text-[8px] font-bold`}>
                {activeProject?.key?.substring(0, 2) || <Package size={10} />}
              </div>
            </button>
          ) : (
            <button
              ref={triggerRef}
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B0C0E] border transition-all text-left ${
                showProjectDropdown
                  ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/30'
                  : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-400 dark:hover:border-blue-600'
              }`}
            >
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activeProject?.color || 'from-blue-500 to-blue-600'} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0`}>
                {activeProject?.key?.substring(0, 2) || <Package size={10} />}
              </div>
              <span className="text-xs font-semibold text-[#172B4D] dark:text-white truncate flex-1 leading-tight">
                {activeProject?.name || 'Select Project'}
              </span>
              <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Project Dropdown Menu (fixed position to escape overflow clipping) */}
        {showProjectDropdown && (
          <div
            ref={dropdownMenuRef}
            className="fixed z-[9999] bg-white dark:bg-[#1A1C24] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-2xl overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100 dark:border-[#2D2F36]">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={projectSearchRef}
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                />
              </div>
            </div>

            {/* Project List */}
            <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(p => {
                  const isSelected = p.id === activeProject?.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (onProjectSelect) onProjectSelect(p.id);
                        setShowProjectDropdown(false);
                        setProjectSearch('');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-[#22242E]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.color || 'from-blue-500 to-blue-600'} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 shadow-sm`}>
                        {p.key?.substring(0, 2) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[13px] font-medium truncate block leading-tight ${
                          isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {p.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                          {p.key || 'No key'}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No projects found
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-100 dark:border-[#2D2F36] p-1.5 space-y-0.5">
              <button
                onClick={() => {
                  setShowProjectDropdown(false);
                  setProjectSearch('');
                  onViewChange('create-product');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Plus size={14} />
                Create New Project
              </button>
              <button
                onClick={() => {
                  setShowProjectDropdown(false);
                  setProjectSearch('');
                  onViewChange('project-list');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22242E] transition-colors"
              >
                <FolderOpen size={14} />
                <span className="flex-1 text-left">View All Projects</span>
                <ArrowRight size={12} className="text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full opacity-50"></div>}

        {/* Project Context Nav */}
        <nav className={`space-y-0.5 ${isCollapsed ? '' : 'px-1'}`}>
          {projectNavItems.map((item) => {
            const isActive = isNavActive(item.id);
            const Icon = item.icon;

            if (item.expandable) {
              // KB / Docs with expandable sub-items
              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        onViewChange('documents');
                        return;
                      }
                      // Toggle expansion; if clicking while already on docs, just toggle
                      if (currentView === 'documents') {
                        setIsDocsExpanded(!isDocsExpanded);
                      } else {
                        setIsDocsExpanded(true);
                        onViewChange('documents');
                      }
                    }}
                    className={`flex items-center ${isCollapsed ? 'justify-center w-8 h-8 mx-auto p-0' : 'px-2.5 gap-2.5 py-1.5 w-full'} rounded-lg transition-all duration-200 text-[12px] font-medium group relative border ${
                      isActive
                        ? 'text-gray-900 dark:text-white bg-white dark:bg-[#1F2128] shadow-sm border-gray-200 dark:border-[#2D2F36]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50 border-transparent'
                    }`}
                  >
                    <span className={`relative z-10 transition-transform duration-300 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'}`}>
                      <Icon size={16} />
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                        <span className="text-gray-400 flex-shrink-0">
                          {isDocsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Expandable Doc Sub-Items */}
                  {isDocsExpanded && !isCollapsed && (
                    <div className="ml-4 pl-3 border-l border-gray-200 dark:border-[#2D2F36] mt-0.5 mb-1 space-y-0.5">
                      {DOC_NAV_ITEMS.map((docItem) => {
                        const isDocActive = currentView === 'documents' && activeDocSection === docItem.id;
                        return (
                          <button
                            key={docItem.id}
                            onClick={() => {
                              onDocSectionChange(docItem.id);
                              onViewChange('documents');
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                              isDocActive
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50'
                            }`}
                          >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0"></span>
                            <span className="truncate">{docItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav item
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center ${isCollapsed ? 'justify-center w-8 h-8 mx-auto p-0' : 'px-2.5 gap-2.5 py-1.5 w-full'} rounded-lg transition-all duration-200 text-[12px] font-medium group relative border ${
                  isActive
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-[#1F2128] shadow-sm border-gray-200 dark:border-[#2D2F36]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50 border-transparent'
                }`}
              >
                <span className={`relative z-10 transition-transform duration-300 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'}`}>
                  <Icon size={16} />
                </span>
                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  {item.label}
                </span>
                {isActive && !isCollapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-2 opacity-50"></div>}

        {/* Utility Nav */}
        <nav className={`space-y-0.5 ${isCollapsed ? '' : 'px-1'}`}>
          {utilityNavItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            const isAdminItem = item.id === 'org-admin' || item.id === 'users';

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center ${isCollapsed ? 'justify-center w-8 h-8 mx-auto p-0' : 'px-2.5 gap-2.5 py-1.5 w-full'} rounded-lg transition-all duration-200 text-[12px] font-medium group relative border ${
                  isActive
                    ? `text-gray-900 dark:text-white bg-white dark:bg-[#1F2128] shadow-sm border-gray-200 dark:border-[#2D2F36]`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50 border-transparent'
                }`}
              >
                <span className={`relative z-10 transition-transform duration-300 flex-shrink-0 ${isActive ? (isAdminItem ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400') : 'group-hover:scale-110'}`}>
                  <Icon size={16} />
                </span>
                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  {item.label}
                </span>
                {isActive && !isCollapsed && <div className={`absolute right-3 w-1.5 h-1.5 rounded-full ${isAdminItem ? 'bg-purple-600 dark:bg-purple-400' : 'bg-blue-600 dark:bg-blue-400'}`}></div>}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Sidebar Footer */}
      <div className={`border-t border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#0B0C0E] ${isCollapsed ? 'p-1.5' : 'p-3'}`}>
        {currentUser && (
            <div
                className={`flex items-center rounded-lg transition-all group relative ${isCollapsed ? 'justify-center w-8 h-8 mx-auto' : 'gap-2.5 p-1.5 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] shadow-sm hover:border-blue-300 dark:hover:border-blue-700'}`}
                onClick={() => onViewChange('profile')}
            >
                <div className="relative flex-shrink-0 cursor-pointer">
                    <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-md object-cover shadow-sm ring-2 ring-white dark:ring-[#1F2128]"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-[1.5px] border-white dark:border-[#15171E] rounded-full"></div>
                </div>

                <div className={`flex-1 min-w-0 transition-opacity duration-200 cursor-pointer ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    <div className="text-[11px] font-bold text-gray-900 dark:text-white leading-tight truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{currentUser.role || 'Member'}</div>
                </div>

                {!isCollapsed && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onLogout(); }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Log Out"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
