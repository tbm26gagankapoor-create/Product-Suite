
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Folder, ChevronsRight, FileText, Calendar, Search, Bell, HelpCircle, Sun, Moon,
  PanelLeft, LogOut, LayoutGrid, Lightbulb, ListTodo, Settings2, Briefcase, Sparkles, X, Maximize2, Zap,
  CheckSquare, Users, Package, ArrowRight, UserCog
} from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { View } from '../App';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../context/ProjectDataContext';
import { CopilotModal } from './CopilotModal';
import { Project, Task, Sprint, User } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  activeProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
}

interface SearchResult {
  type: 'project' | 'task' | 'sprint' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data: Project | Task | Sprint | User;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout, activeProjectId, onProjectSelect }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currentUser, projects, tasks, sprints, users, isOrgAdmin } = useProjectData();

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Dropdown visibility
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Copilot Modal State
  const [isCopilotModalOpen, setIsCopilotModalOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState('');

  // Global Search Results
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    const maxPerCategory = 3;

    // Search Projects
    const matchingProjects = projects
      .filter(p => p.name.toLowerCase().includes(query) || p.key?.toLowerCase().includes(query))
      .slice(0, maxPerCategory);

    matchingProjects.forEach(p => {
      results.push({
        type: 'project',
        id: p.id,
        title: p.name,
        subtitle: p.key,
        icon: <Package size={14} className="text-blue-500" />,
        data: p
      });
    });

    // Search Tasks
    const matchingTasks = tasks
      .filter(t => t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query))
      .slice(0, maxPerCategory);

    matchingTasks.forEach(t => {
      results.push({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: t.id,
        icon: <CheckSquare size={14} className="text-green-500" />,
        data: t
      });
    });

    // Search Sprints
    const matchingSprints = sprints
      .filter(s => s.name.toLowerCase().includes(query))
      .slice(0, maxPerCategory);

    matchingSprints.forEach(s => {
      results.push({
        type: 'sprint',
        id: s.id,
        title: s.name,
        subtitle: s.status,
        icon: <Zap size={14} className="text-purple-500" />,
        data: s
      });
    });

    // Search Users
    const matchingUsers = users
      .filter(u => u.name.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query))
      .slice(0, maxPerCategory);

    matchingUsers.forEach(u => {
      results.push({
        type: 'user',
        id: u.id,
        title: u.name,
        subtitle: u.designation || 'Member',
        icon: <Users size={14} className="text-orange-500" />,
        data: u
      });
    });

    return results;
  }, [searchQuery, projects, tasks, sprints, users]);

  const handleSearchResultClick = (result: SearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');

    switch (result.type) {
      case 'project':
        if (onProjectSelect) {
          onProjectSelect(result.id);
        } else {
          onViewChange('project-list');
        }
        break;
      case 'task':
        onViewChange('my-tasks');
        break;
      case 'sprint':
        onViewChange('sprints');
        break;
      case 'user':
        onViewChange('teams');
        break;
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderIcon = (itemName: string, size = 18) => {
    switch (itemName) {
      case 'Home': return <LayoutGrid size={size} strokeWidth={2} />;
      case 'Products': return <Lightbulb size={size} strokeWidth={2} />;
      case 'Sprints': return <Zap size={size} strokeWidth={2} />;
      case 'My Tasks': return <ListTodo size={size} strokeWidth={2} />;
      case 'Teams': return <Briefcase size={size} strokeWidth={2} />;
      case 'Settings': return <Settings2 size={size} strokeWidth={2} />;
      case 'Users': return <UserCog size={size} strokeWidth={2} />;
      default: return <Folder size={size} strokeWidth={2} />;
    }
  };

  const handleNavClick = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    if (name === 'Home') onViewChange('home');
    else if (name === 'Products') onViewChange('project-list');
    else if (name === 'Sprints') onViewChange('sprints');
    else if (name === 'Settings') onViewChange('settings');
    else if (name === 'Teams') onViewChange('teams');
    else if (name === 'My Tasks') onViewChange('my-tasks');
    else if (name === 'Users') onViewChange('users');
  };

  const handleCopilotSubmit = (queryOverride?: string) => {
    const query = queryOverride || searchQuery;
    if (!query.trim()) return;

    setCopilotInitialQuery(query);
    setIsCopilotModalOpen(true);
    setIsSearchOpen(false); // Close dropdown
    setSearchQuery(''); // Clear input
  };

  return (
    <>
    <aside
      className={`${isCollapsed ? 'w-[72px]' : 'w-[252px]'} bg-[#FAFAFA] dark:bg-[#15171E] border-r border-gray-200 dark:border-[#1F2128] flex flex-col h-screen text-gray-600 dark:text-gray-400 font-medium flex-shrink-0 select-none transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] relative shadow-xl z-40`}
    >
      {/* Toggle Button - Floating on right edge */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-full p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-all z-50 shadow-sm hover:shadow-md hover:scale-110"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <PanelLeft size={12} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo Area */}
      <div
        className={`h-[70px] flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-6'}`}
      >
        <div
          className={`flex items-center cursor-pointer group transition-all duration-300 ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
          onClick={() => onViewChange('home')}
        >
           <div className="w-9 h-9 bg-white dark:bg-black rounded-xl flex items-center justify-center text-black dark:text-white shadow-sm border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
             <ChevronsRight size={18} strokeWidth={3} />
           </div>

           <div className={`flex flex-col justify-center transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
               <span className="font-bold text-[15px] text-gray-900 dark:text-white leading-none tracking-tight">INFINIA</span>
               <span className="text-[10px] text-gray-400 font-bold tracking-[0.2em] leading-none mt-1 uppercase">Product Suite</span>
           </div>
        </div>
      </div>
      
      {/* Divider */}
      <div className={`mx-6 mb-4 border-b border-gray-200 dark:border-[#2D2F36] ${isCollapsed ? 'hidden' : ''}`}></div>

      <div className={`flex-1 overflow-y-auto py-2 custom-scrollbar flex flex-col gap-2 overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-4'}`}>
        
        {/* Search with Copilot */}
        <div 
            ref={searchRef}
            className={`relative transition-all duration-300 ${isCollapsed ? 'flex justify-center' : 'mb-4'}`}
        >
            {isCollapsed ? (
                <button 
                    onClick={() => { setCopilotInitialQuery(''); setIsCopilotModalOpen(true); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1F2128] border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                    title="Open Copilot"
                >
                    <Sparkles size={18} />
                </button>
            ) : (
                <div className="relative group">
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    <div
                        className="relative bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm flex items-center p-1.5 transition-all group-focus-within:border-blue-500/50 group-focus-within:ring-1 group-focus-within:ring-blue-500/20 cursor-text"
                        onClick={() => { if(inputRef.current) inputRef.current.focus(); }}
                    >
                        <Search className="ml-2 text-gray-400 flex-shrink-0" size={16} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isSearchOpen) setIsSearchOpen(true);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCopilotSubmit()}
                            onFocus={() => setIsSearchOpen(true)}
                            placeholder="Search or ask Copilot..."
                            className="flex-1 min-w-0 bg-transparent text-[#172B4D] dark:text-gray-200 px-2 py-1.5 text-sm focus:outline-none placeholder:text-gray-400 font-medium"
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCopilotSubmit(); }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                            title="Ask Copilot"
                        >
                            <Sparkles size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Copilot & Search Dropdown */}
            {isSearchOpen && !isCollapsed && (
                <div className="absolute z-50 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto">
                    {/* Ask Copilot (Primary) */}
                    <div className="p-2 space-y-1 border-b border-gray-100 dark:border-[#2D2F36]">
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={10} /> Ask Copilot (Press Enter)
                        </div>
                        {searchQuery.trim() ? (
                            <button onClick={() => handleCopilotSubmit()} className="w-full text-left px-3 py-2 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-2 font-medium border border-blue-200 dark:border-blue-800">
                                <Sparkles size={12} /> Ask: "{searchQuery.slice(0, 30)}{searchQuery.length > 30 ? '...' : ''}"
                            </button>
                        ) : (
                            <>
                                <button onClick={() => handleCopilotSubmit("Create a high priority task")} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D2F36] text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Create Task
                                </button>
                                <button onClick={() => handleCopilotSubmit("Summarize project status")} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D2F36] text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Summarize Status
                                </button>
                            </>
                        )}
                    </div>

                    {/* Search Results (Secondary - Navigate) */}
                    {searchResults.length > 0 && (
                        <div className="p-2 space-y-1">
                            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Navigate</div>
                            {searchResults.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSearchResultClick(result)}
                                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D2F36] text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                                >
                                    {result.icon}
                                    <span className="flex-1 truncate font-medium">{result.title}</span>
                                    {result.subtitle && (
                                        <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{result.subtitle}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Main Menu */}
        <nav className={`space-y-1 mt-2 ${isCollapsed ? '' : 'px-2'}`}>
          {NAV_ITEMS.map((item) => {
             const isActive = (item.name === 'Home' && currentView === 'home') ||
                              (item.name === 'Products' && (currentView === 'project' || currentView === 'project-list')) ||
                              (item.name === 'Sprints' && currentView === 'sprints') ||
                              (item.name === 'Settings' && currentView === 'settings') ||
                              (item.name === 'Teams' && currentView === 'teams') ||
                              (item.name === 'My Tasks' && currentView === 'my-tasks');

             return (
              <a
                key={item.name}
                href="#"
                onClick={(e) => handleNavClick(e, item.name)}
                className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 mx-auto p-0' : 'px-3 gap-3 py-2.5 w-full'} rounded-xl transition-all duration-200 text-[14px] font-medium group relative overflow-hidden border ${
                  isActive
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-[#1F2128] shadow-sm border-gray-200 dark:border-[#2D2F36]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50 border-transparent'
                }`}
              >
                <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'}`}>
                    {renderIcon(item.name, 20)}
                </span>

                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    {item.name}
                </span>

                {isActive && !isCollapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>}
              </a>
            );
          })}

          {/* Admin-only: User Management */}
          {isOrgAdmin && (
            <a
              href="#"
              onClick={(e) => handleNavClick(e, 'Users')}
              className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 mx-auto p-0' : 'px-3 gap-3 py-2.5 w-full'} rounded-xl transition-all duration-200 text-[14px] font-medium group relative overflow-hidden border ${
                currentView === 'users'
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-[#1F2128] shadow-sm border-gray-200 dark:border-[#2D2F36]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]/50 border-transparent'
              }`}
            >
              <span className={`relative z-10 transition-transform duration-300 ${currentView === 'users' ? 'text-purple-600 dark:text-purple-400' : 'group-hover:scale-110'}`}>
                  {renderIcon('Users', 20)}
              </span>

              <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  Users
              </span>

              {currentView === 'users' && !isCollapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>}
            </a>
          )}
        </nav>

        {!isCollapsed && <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-4 opacity-50"></div>}

        {/* Workspace Section */}
        <div className={`${isCollapsed ? 'hidden' : 'block'} space-y-1 px-2`}>
           <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
             Workspace
           </div>
           {/* Documents Placeholder */}
           <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium text-gray-400 cursor-not-allowed border border-transparent opacity-60 hover:bg-transparent" title="Coming Soon">
              <FileText size={18} />
              <span>Documents</span>
           </div>
           {/* Calendar Placeholder */}
           <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium text-gray-400 cursor-not-allowed border border-transparent opacity-60 hover:bg-transparent" title="Coming Soon">
              <Calendar size={18} />
              <span>Calendar</span>
           </div>
        </div>

      </div>
      
      {/* Sidebar Footer */}
      <div className={`border-t border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#0B0C0E] ${isCollapsed ? 'p-2' : 'p-4'}`}>
        
        {/* User Profile */}
        {currentUser && (
            <div 
                className={`flex items-center rounded-xl transition-all group relative ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 p-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] shadow-sm hover:border-blue-300 dark:hover:border-blue-700'}`}
                onClick={() => onViewChange('profile')}
            >
                <div className="relative flex-shrink-0 cursor-pointer">
                    <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.name} 
                        className="w-9 h-9 rounded-lg object-cover shadow-sm ring-2 ring-white dark:ring-[#1F2128]"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#15171E] rounded-full"></div>
                </div>
                
                <div className={`flex-1 min-w-0 transition-opacity duration-200 cursor-pointer ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    <div className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{currentUser.designation || 'Member'}</div>
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

    <CopilotModal 
        isOpen={isCopilotModalOpen} 
        onClose={() => setIsCopilotModalOpen(false)} 
        initialQuery={copilotInitialQuery}
    />
    </>
  );
};

export default Sidebar;
