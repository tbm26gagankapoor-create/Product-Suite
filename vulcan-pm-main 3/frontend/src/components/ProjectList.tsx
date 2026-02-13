
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, MoreHorizontal, Calendar, ArrowUpRight, ChevronsRight, LayoutGrid,
  List as ListIcon, Download, Box, Trash2, Edit3, X, AlertTriangle, Loader2,
  CheckSquare, Hexagon, Clock, Activity, Users, DollarSign, TrendingUp, FileText, Flag,
  ChevronDown, AlignLeft,
} from 'lucide-react';
import { getProductTheme, ICON_SIZES } from '../config/icons';
import { useProjectData } from '../context/ProjectDataContext';
import { Project, Task, User } from '../types';
import { USERS } from '../constants';
import ProductGeneratorModal from './ProductGeneratorModal';
import JiraImportModal from './JiraImportModal';

interface ProjectListProps {
  onProjectSelect: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect }) => {
  const { projects, users, tasks, deleteProject, updateProject } = useProjectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Default to grid for better visual appeal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  
  // Edit & Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});

  // Delete Confirmation State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'All' || 
                          (activeFilter === 'Active' && (project.status === 'In Progress' || project.status === 'Planning')) ||
                          (activeFilter === 'Completed' && project.status === 'Completed') ||
                          (activeFilter === 'Archived' && project.status === 'Archived');
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'In Progress': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
        case 'Planning': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
        case 'On Hold': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#3D3F46]';
        case 'Completed': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
        default: return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#3D3F46]';
    }
  };

  const calculateProgress = (projectId: string) => {
      const projectTasks = tasks.filter(t => t.projectId === projectId);
      if (projectTasks.length === 0) {
          const currentProject = projects.find(p => p.id === projectId);
          return currentProject?.progress || 0;
      }
      const completed = projectTasks.filter(t => t.columnId === 'done').length;
      return Math.round((completed / projectTasks.length) * 100);
  };

  const getProjectStats = (projectId: string) => {
      const projectTasks = tasks.filter(t => t.projectId === projectId);
      const epicsCount = projectTasks.filter(t => t.type === 'epic').length;
      const tasksCount = projectTasks.filter(t => t.type !== 'epic').length;
      const completedCount = projectTasks.filter(t => t.columnId === 'done').length;
      return { total: projectTasks.length, epics: epicsCount, tasks: tasksCount, completed: completedCount };
  };

  const formatShortDate = (dateString?: string) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const toggleDropdown = (e: React.MouseEvent, projectId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropdown(prev => prev === projectId ? null : projectId);
  };

  const initiateDeleteProject = (e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropdown(null);
      setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
      if (projectToDelete) {
          setIsDeleting(true);
          try {
            await deleteProject(projectToDelete.id);
          } catch (error) {
            console.error("Failed to delete project:", error);
          } finally {
            setIsDeleting(false);
            setProjectToDelete(null);
          }
      }
  };

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropdown(null);
      setProjectToEdit(project);
      setEditFormData({
          name: project.name,
          description: project.description,
          status: project.status,
          dueDate: project.dueDate,
          healthStatus: project.healthStatus,
          lifecycleStage: project.lifecycleStage,
          category: project.category,
          budget: project.budget,
          spentBudget: project.spentBudget,
          customerCount: project.customerCount,
          targetAudience: project.targetAudience
      });
  };

  const saveProjectChanges = () => {
      if (projectToEdit) {
          updateProject({ ...projectToEdit, ...editFormData });
          setProjectToEdit(null);
      }
  };

  // When generator is open, render it inline instead of the project list
  if (isGeneratorOpen) {
    return (
      <ProductGeneratorModal
        isOpen={true}
        onClose={() => setIsGeneratorOpen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200" onClick={() => setActiveDropdown(null)}>

      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Products</h1>
               <p className="text-[#5E6C84] dark:text-gray-400 text-sm">Manage your ongoing initiatives and track progress.</p>
            </div>
            
            <div className="flex items-center gap-3">
                 {/* Search */}
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
                    />
                 </div>
                 
                 <div className="h-8 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>

                 <button 
                    onClick={() => setIsJiraModalOpen(true)}
                    className="flex items-center gap-2 bg-white dark:bg-[#15171E] hover:bg-gray-50 dark:hover:bg-[#1F2128] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-bold transition-all shadow-sm text-sm"
                 >
                    <Download size={16} strokeWidth={2.5} />
                    <span>Import</span>
                 </button>

                 <button 
                    onClick={() => setIsGeneratorOpen(true)}
                    className="flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black hover:opacity-90 px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl text-sm"
                 >
                    <Plus size={16} strokeWidth={3} />
                    <span>New Product</span>
                 </button>
            </div>
        </div>
      </div>

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 px-8 py-4 flex items-center justify-between bg-[#F4F5F7] dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">Filter By:</span>
                  <div className="flex gap-1">
                     {['All', 'Active', 'Completed', 'Archived'].map(filter => (
                         <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeFilter === filter
                                ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                            }`}
                         >
                            {filter}
                         </button>
                     ))}
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">View:</span>
              <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                  >
                      <ListIcon size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                  >
                      <LayoutGrid size={16} />
                  </button>
              </div>
          </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
          {viewMode === 'list' ? (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300 min-h-[400px]">
                 {/* List Header */}
                 <div className="grid grid-cols-[minmax(280px,2fr)_100px_100px_80px_80px_140px_70px_44px] gap-4 px-6 py-4 bg-gray-50/80 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="pl-2">Product</div>
                    <div>Status</div>
                    <div>Start</div>
                    <div>Due</div>
                    <div className="text-center">Tasks</div>
                    <div>Progress</div>
                    <div>Team</div>
                    <div></div>
                 </div>

                 {/* List Rows */}
                 <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredProjects.map(project => {
                        const progress = calculateProgress(project.id);
                        const stats = getProjectStats(project.id);
                        return (
                            <div
                                key={project.id}
                                onClick={() => onProjectSelect(project.id)}
                                className="grid grid-cols-[minmax(280px,2fr)_100px_100px_80px_80px_140px_70px_44px] gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group"
                            >
                                {/* Product Column */}
                                <div className="flex items-center gap-4">
                                    {(() => {
                                        const { Icon, gradient } = getProductTheme(project.id);
                                        return (
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                                                <Icon size={ICON_SIZES.lg} strokeWidth={1.5} />
                                            </div>
                                        );
                                    })()}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-sm font-bold text-[#172B4D] dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {project.name}
                                            </h3>
                                            <ArrowUpRight size={ICON_SIZES.sm} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 flex-shrink-0" />
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
                                            <Activity size={ICON_SIZES.xs} strokeWidth={1.5} />
                                            <span className="capitalize">{project.healthStatus.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Start Date Column */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Calendar size={ICON_SIZES.xs} className="opacity-50 flex-shrink-0" />
                                    <span className="truncate">{formatShortDate(project.startDate)}</span>
                                </div>

                                {/* Due Date Column */}
                                <div className={`flex items-center gap-1.5 text-xs ${project.dueDate && new Date(project.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                    <Clock size={ICON_SIZES.xs} className="opacity-50 flex-shrink-0" />
                                    <span className="truncate">{formatShortDate(project.dueDate)}</span>
                                </div>

                                {/* Tasks Count Column */}
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title={`${stats.epics} epics, ${stats.tasks} tasks`}>
                                        <CheckSquare size={ICON_SIZES.xs} strokeWidth={1.5} />
                                        <span className="font-medium">{stats.total}</span>
                                    </div>
                                    {stats.epics > 0 && (
                                        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400" title={`${stats.epics} epics`}>
                                            <Hexagon size={ICON_SIZES.xs} strokeWidth={1.5} />
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
                                        onClick={(e) => toggleDropdown(e, project.id)}
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
                                                onClick={(e) => handleEditProject(e, project)}
                                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium"
                                            >
                                                <Edit3 size={14} /> Edit Project
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-[#2D2F36]"></div>
                                            <button
                                                onClick={(e) => initiateDeleteProject(e, project)}
                                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 font-medium"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredProjects.length === 0 && (
                         <div className="p-16 text-center">
                             <div className="w-16 h-16 bg-gray-100 dark:bg-[#1F2128] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                 <LayoutGrid size={24} />
                             </div>
                             <h3 className="text-gray-900 dark:text-gray-900 dark:text-white font-bold mb-1">No products found</h3>
                             <p className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your filters or search.</p>
                         </div>
                    )}
                 </div>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-in fade-in duration-300 pb-12">
                {filteredProjects.map((project) => {
                    const progress = calculateProgress(project.id);
                    const stats = getProjectStats(project.id);
                    const { Icon, gradient } = getProductTheme(project.id);
                    return (
                        <div
                            key={project.id}
                            onClick={() => onProjectSelect(project.id)}
                            className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-white/5 p-6 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                        >
                            {/* Decorative Background Blob - matches product theme */}
                            <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>

                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-5 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={ICON_SIZES['3xl']} strokeWidth={1.5} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(project.status)}`}>
                                        {project.status}
                                    </div>
                                    <button 
                                        onClick={(e) => toggleDropdown(e, project.id)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                                    >
                                        <MoreHorizontal size={ICON_SIZES.xl} />
                                    </button>
                                    {activeDropdown === project.id && (
                                        <div 
                                            className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        >
                                            <button 
                                                onClick={(e) => handleEditProject(e, project)}
                                                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            >
                                                <Edit3 size={ICON_SIZES.xs} /> Edit
                                            </button>
                                            <button 
                                                onClick={(e) => initiateDeleteProject(e, project)}
                                                className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
                                            >
                                                <Trash2 size={ICON_SIZES.xs} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 relative z-10">
                                {project.name}
                                <ArrowUpRight size={ICON_SIZES.lg} className="opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0 text-blue-500" />
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[40px] relative z-10">
                                {project.description}
                            </p>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-2 mb-4 relative z-10">
                                {/* Health Status Indicator */}
                                {project.healthStatus && (
                                    <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300" title={`Health: ${project.healthStatus.replace('_', ' ')}`}>
                                        <Activity size={ICON_SIZES.xs} strokeWidth={1.5} />
                                        <span className="capitalize">{project.healthStatus.replace('_', ' ')}</span>
                                    </div>
                                )}

                                {/* Lifecycle Stage */}
                                {project.lifecycleStage && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md font-medium capitalize" title="Lifecycle Stage">
                                        <TrendingUp size={ICON_SIZES.xs} strokeWidth={1.5} />
                                        <span>{project.lifecycleStage}</span>
                                    </div>
                                )}

                                {/* Tasks Count */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md" title={`${stats.epics} epics, ${stats.tasks} tasks`}>
                                    <CheckSquare size={ICON_SIZES.xs} strokeWidth={1.5} />
                                    <span className="font-medium">{stats.total} tasks</span>
                                </div>
                                {stats.epics > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md">
                                        <Hexagon size={ICON_SIZES.xs} strokeWidth={1.5} />
                                        <span className="font-medium">{stats.epics} epics</span>
                                    </div>
                                )}
                                {/* Completed indicator */}
                                {stats.completed > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md">
                                        <span className="font-medium">{stats.completed} done</span>
                                    </div>
                                )}
                            </div>

                            {/* Additional Metadata Row */}
                            {(project.category || project.customerCount || project.budget) && (
                                <div className="flex flex-wrap items-center gap-2 mb-4 relative z-10">
                                    {/* Category */}
                                    {project.category && (
                                        <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md">
                                            {project.category}
                                        </div>
                                    )}

                                    {/* Customer Count */}
                                    {project.customerCount && project.customerCount > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md" title="Customers">
                                            <Users size={11} strokeWidth={1.5} />
                                            <span className="font-medium">{project.customerCount.toLocaleString()}</span>
                                        </div>
                                    )}

                                    {/* Budget */}
                                    {project.budget && project.budget > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-md" title={`Budget: $${project.budget.toLocaleString()}${project.spentBudget ? ` | Spent: $${project.spentBudget.toLocaleString()}` : ''}`}>
                                            <DollarSign size={11} strokeWidth={1.5} />
                                            <span className="font-medium">${(project.budget / 1000).toFixed(0)}k</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Date Range */}
                            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400 relative z-10">
                                {project.startDate && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} className="opacity-60" />
                                        <span>Start: {formatShortDate(project.startDate)}</span>
                                    </div>
                                )}
                                {project.dueDate && (
                                    <div className={`flex items-center gap-1.5 ${project.dueDate && new Date(project.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                                        <Clock size={12} className="opacity-60" />
                                        <span>Due: {formatShortDate(project.dueDate)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto relative z-10">
                                {/* Progress Bar */}
                                <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
                                    <span>Progress</span>
                                    <span className={progress === 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden mb-5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                            progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'
                                        }`}
                                        style={{ width: `${progress || 0}%` }}
                                    ></div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                     <div className="flex items-center -space-x-2">
                                         {project.members.slice(0, 4).map((userId, i) => {
                                             const user = users.find(u => u.id === userId);
                                             return user ? (
                                                 <img key={i} src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#15171E] object-cover" />
                                             ) : null;
                                         })}
                                         {project.members.length > 4 && (
                                             <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#15171E] bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                                 +{project.members.length - 4}
                                             </div>
                                         )}
                                     </div>
                                     {/* Tags if available */}
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
                })}
                 
                 {/* New Product Card */}
                 <button 
                    onClick={() => setIsGeneratorOpen(true)}
                    className="border-2 border-dashed border-gray-200 dark:border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#15171E]/50 transition-all group min-h-[300px]"
                 >
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold text-lg">Create New Product</span>
                </button>
              </div>
          )}
      </div>

      {/* Edit Project Modal */}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[#15171E] w-full max-w-[900px] max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const theme = getProductTheme(projectToEdit.id);
                            const Icon = theme.Icon;
                            return (
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white`}>
                                    <Icon size={16} />
                                </div>
                            );
                        })()}
                        <div>
                            <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit Product</h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{projectToEdit.key}</span>
                        </div>
                    </div>
                    <button onClick={() => setProjectToEdit(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Two Panel Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Main Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {/* Product Name */}
                        <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            className="w-full text-2xl font-bold bg-transparent border-none text-[#172B4D] dark:text-white focus:outline-none focus:ring-0 p-0 mb-6 placeholder:text-gray-400"
                            placeholder="Product Name"
                        />

                        {/* Primary Properties Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-[#2D2F36]">
                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                                <div className="relative">
                                    <select
                                        value={editFormData.status}
                                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none pr-8"
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Health Status */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Health</label>
                                <div className="relative">
                                    <select
                                        value={editFormData.healthStatus || ''}
                                        onChange={(e) => setEditFormData({...editFormData, healthStatus: e.target.value as any || undefined})}
                                        className={`w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer appearance-none pr-8 ${
                                            editFormData.healthStatus === 'on_track' ? 'text-emerald-600' :
                                            editFormData.healthStatus === 'at_risk' ? 'text-amber-600' :
                                            editFormData.healthStatus === 'off_track' ? 'text-red-600' :
                                            'text-[#172B4D] dark:text-gray-200'
                                        }`}
                                    >
                                        <option value="">Not set</option>
                                        <option value="on_track">On Track</option>
                                        <option value="at_risk">At Risk</option>
                                        <option value="off_track">Off Track</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Lifecycle Stage */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stage</label>
                                <div className="relative">
                                    <select
                                        value={editFormData.lifecycleStage || ''}
                                        onChange={(e) => setEditFormData({...editFormData, lifecycleStage: e.target.value as any || undefined})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 cursor-pointer appearance-none pr-8"
                                    >
                                        <option value="">Not set</option>
                                        <option value="discovery">Discovery</option>
                                        <option value="alpha">Alpha</option>
                                        <option value="beta">Beta</option>
                                        <option value="ga">GA</option>
                                        <option value="sunset">Sunset</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <AlignLeft size={14} /> Description
                                </label>
                            </div>
                            <textarea
                                rows={6}
                                value={editFormData.description || ''}
                                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                className="w-full bg-gray-50/50 dark:bg-[#1F2128]/30 border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1F2128]/50 resize-none leading-relaxed placeholder:text-gray-400 transition-colors"
                                placeholder="Describe the product vision, goals, and scope..."
                            />
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>

                        {/* Market & Category Section */}
                        <div className="mb-6">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Target size={12} /> Market & Category
                            </h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SaaS, Mobile App, Platform"
                                        value={editFormData.category || ''}
                                        onChange={(e) => setEditFormData({...editFormData, category: e.target.value || undefined})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Audience</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Enterprise IT teams"
                                        value={editFormData.targetAudience || ''}
                                        onChange={(e) => setEditFormData({...editFormData, targetAudience: e.target.value || undefined})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Sidebar */}
                    <div className="w-[300px] bg-[#FAFBFC] dark:bg-[#0B0C0E] border-l border-gray-200 dark:border-[#1F2128] p-6 overflow-y-auto flex flex-col gap-6 flex-shrink-0">

                        {/* Timeline Section */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={12} /> Timeline
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                    <input
                                        type="date"
                                        value={projectToEdit.startDate ? new Date(projectToEdit.startDate).toISOString().split('T')[0] : ''}
                                        className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        readOnly
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Flag size={10} /> Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editFormData.dueDate || ''}
                                        onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

                        {/* Budget Section */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={12} /> Budget
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Budget ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={editFormData.budget || ''}
                                        onChange={(e) => setEditFormData({...editFormData, budget: e.target.value ? parseInt(e.target.value) : undefined})}
                                        className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Spent ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={editFormData.spentBudget || ''}
                                        onChange={(e) => setEditFormData({...editFormData, spentBudget: e.target.value ? parseInt(e.target.value) : undefined})}
                                        className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                {editFormData.budget && editFormData.budget > 0 && (
                                    <div className="pt-1">
                                        <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
                                            <span>Budget Used</span>
                                            <span className={editFormData.spentBudget && editFormData.spentBudget > editFormData.budget ? 'text-red-500' : 'text-emerald-500'}>
                                                {Math.round(((editFormData.spentBudget || 0) / editFormData.budget) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    editFormData.spentBudget && editFormData.spentBudget > editFormData.budget
                                                        ? 'bg-red-500'
                                                        : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(((editFormData.spentBudget || 0) / editFormData.budget) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

                        {/* Metrics Section */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Users size={12} /> Metrics
                            </h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Count</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={editFormData.customerCount || ''}
                                    onChange={(e) => setEditFormData({...editFormData, customerCount: e.target.value ? parseInt(e.target.value) : undefined})}
                                    className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Created Info */}
                        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                            <p className="text-[10px] text-gray-400 font-medium">
                                Created {projectToEdit.createdAt ? new Date(projectToEdit.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1F2128] flex justify-end gap-3 bg-gray-50 dark:bg-[#0B0C0E]/50 flex-shrink-0">
                    <button onClick={() => setProjectToEdit(null)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={saveProjectChanges}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Using Portal to break out of overflow containers */}
      {projectToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setProjectToDelete(null)}>
            <div className="bg-white dark:bg-[#15171E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">Delete Project?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Are you sure you want to delete <strong>{projectToDelete.name}</strong>? This action will soft-delete the project along with all associated tasks, sprints, and epics.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setProjectToDelete(null)}
                            className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteProject}
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
      )}

      {/* Jira Import Modal */}
      <JiraImportModal
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
      />

    </div>
  );
};

export default ProjectList;
