
import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  FileText,
  Link as LinkIcon,
  ListTodo,
  User,
  Flag,
  Activity,
  ChevronRight,
  PieChart,
  Edit3,
  X,
  ShieldAlert,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Layers
} from 'lucide-react';
import { Project, Task } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { activityService } from '../services/activity.service';
import ProductIcon from './ProductIcon';

interface OverviewProps {
  onNavigate?: (tab: string) => void;
  activeProject?: Project;
  onProjectUpdate?: (project: Project) => void;
  projectTasks?: Task[]; // Received from parent (filtered from context)
}

const Overview: React.FC<OverviewProps> = ({ onNavigate, activeProject, onProjectUpdate, projectTasks = [] }) => {
  const { users } = useProjectData();
  // Figma Link State
  const [figmaLink, setFigmaLink] = useState<string | null>(null);
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
  const [tempFigmaLink, setTempFigmaLink] = useState('');

  // Description Expand State
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Edit Project State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
      name: '',
      status: '',
      dueDate: '',
      description: '',
      healthStatus: '' as string,
      lifecycleStage: '' as string,
      category: '',
      budget: undefined as number | undefined,
      spentBudget: undefined as number | undefined,
      customerCount: undefined as number | undefined,
      targetAudience: ''
  });

  // Real Activity State
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
      if (activeProject) {
          activityService.getForProject(activeProject.id, { limit: 10 }).then(res => {
              setRecentUpdates(res.data.map(log => ({
                  id: log.id,
                  user: log.user || { name: 'System', avatarUrl: '' },
                  action: log.action,
                  target: log.entity_type === 'task' ? 'a task' : log.entity_type === 'comment' ? 'a comment' : 'the project', 
                  // In a real app we'd fetch the entity title too, simplifed for now
                  detail: log.field_changed ? `Changed ${log.field_changed}` : '',
                  time: new Date(log.created_at).toLocaleDateString() === new Date().toLocaleDateString() ? new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(log.created_at).toLocaleDateString(),
                  type: log.entity_type
              })));
          });
      }
  }, [activeProject]);

  if (!activeProject) {
      return <div className="p-8 text-gray-500">No project selected</div>;
  }
  
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.columnId === 'done').length;
  const inProgressTasks = projectTasks.filter(t => t.columnId === 'inprogress').length;
  const testingTasks = projectTasks.filter(t => t.columnId === 'testing').length;
  const todoTasks = projectTasks.filter(t => t.columnId === 'todo' || t.columnId === 'idea').length;
  
  // Calculate Progress
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (activeProject.progress || 0);

  const fullDescription = (activeProject.description || '') + (activeProject.vision || '');
  const isLongDescription = fullDescription.length > 300;

  const handleActivityClick = (type: string) => {
      if (onNavigate) {
          if (type === 'task') {
              onNavigate('Boards');
          }
      }
  };

  const handleFigmaClick = () => {
    if (figmaLink) {
        window.open(figmaLink, '_blank');
    } else {
        setIsFigmaModalOpen(true);
    }
  };

  const handleSaveFigmaLink = () => {
    if (tempFigmaLink.trim()) {
        setFigmaLink(tempFigmaLink);
        setIsFigmaModalOpen(false);
        setTempFigmaLink('');
    }
  };

  const openEditModal = () => {
      if (activeProject) {
          setEditFormData({
              name: activeProject.name,
              status: activeProject.status,
              dueDate: activeProject.dueDate || '',
              description: activeProject.description,
              healthStatus: activeProject.healthStatus || '',
              lifecycleStage: activeProject.lifecycleStage || '',
              category: activeProject.category || '',
              budget: activeProject.budget,
              spentBudget: activeProject.spentBudget,
              customerCount: activeProject.customerCount,
              targetAudience: activeProject.targetAudience || ''
          });
          setIsEditModalOpen(true);
      }
  };

  const saveProjectChanges = () => {
      if (activeProject && onProjectUpdate) {
          onProjectUpdate({
              ...activeProject,
              name: editFormData.name,
              status: editFormData.status,
              dueDate: editFormData.dueDate,
              description: editFormData.description,
              healthStatus: editFormData.healthStatus as any || undefined,
              lifecycleStage: editFormData.lifecycleStage as any || undefined,
              category: editFormData.category || undefined,
              budget: editFormData.budget,
              spentBudget: editFormData.spentBudget,
              customerCount: editFormData.customerCount,
              targetAudience: editFormData.targetAudience || undefined
          });
          setIsEditModalOpen(false);
      }
  };

  const getStatusColor = (status: string) => {
    return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FC] dark:bg-[#0B0C0E] p-6 lg:p-8 custom-scrollbar h-full transition-colors duration-200">
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN (2/3 width) */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* 1. PERFORMANCE (Moved to top for better at-a-glance value) */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <PieChart size={14} className="text-blue-500" />
                            Performance
                        </h2>
                        <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">View report</button>
                    </div>

                    <div className="p-6">
                        {/* Progress Bar Header */}
                        <div className="flex items-end justify-between mb-4">
                             <div>
                                <div className="text-xs font-bold uppercase text-gray-400 mb-1 tracking-wider">Completion</div>
                                <div className="text-3xl font-bold text-[#172B4D] dark:text-white flex items-baseline gap-2">
                                    {completionPercentage}%
                                </div>
                             </div>
                             {/* Placeholder stat removed as it was hardcoded */}
                        </div>

                        {/* Segmented Progress Bar */}
                        <div className="h-3 w-full flex rounded-full overflow-hidden bg-gray-100 dark:bg-[#1F2128] mb-8">
                            <div className="bg-emerald-500" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }} title="Done"></div>
                            <div className="bg-blue-500" style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%` }} title="In Progress"></div>
                            <div className="bg-orange-500" style={{ width: `${totalTasks > 0 ? (testingTasks / totalTasks) * 100 : 0}%` }} title="Testing"></div>
                            <div className="bg-gray-300 dark:bg-gray-700" style={{ width: `${totalTasks > 0 ? (todoTasks / totalTasks) * 100 : 0}%` }} title="To Do"></div>
                        </div>

                        {/* Stats Cards Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                             <div className="p-4 rounded-xl border border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#1F2128]/50 flex flex-col items-center text-center">
                                <div className="p-2 rounded-full bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 mb-2">
                                    <CheckCircle size={16} />
                                </div>
                                <div className="text-2xl font-bold text-[#172B4D] dark:text-white mb-0.5">{completedTasks}</div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Done</div>
                             </div>

                             <div className="p-4 rounded-xl border border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#1F2128]/50 flex flex-col items-center text-center">
                                <div className="p-2 rounded-full bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 mb-2">
                                    <Activity size={16} />
                                </div>
                                <div className="text-2xl font-bold text-[#172B4D] dark:text-white mb-0.5">{inProgressTasks}</div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Doing</div>
                             </div>

                             <div className="p-4 rounded-xl border border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#1F2128]/50 flex flex-col items-center text-center">
                                <div className="p-2 rounded-full bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 mb-2">
                                    <ListTodo size={16} />
                                </div>
                                <div className="text-2xl font-bold text-[#172B4D] dark:text-white mb-0.5">{todoTasks}</div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">To Do</div>
                             </div>

                             <div className="p-4 rounded-xl border border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#1F2128]/50 flex flex-col items-center text-center">
                                <div className="p-2 rounded-full bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 mb-2">
                                    <Clock size={16} />
                                </div>
                                <div className="text-2xl font-bold text-[#172B4D] dark:text-white mb-0.5">N/A</div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Time Spent</div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* 2. DESCRIPTION / SCOPE */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between">
                         <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                             <FileText size={14} className="text-purple-500" />
                             Project Scope
                         </h2>
                    </div>
                    <div className="p-6">
                        <div className={`prose prose-sm dark:prose-invert max-w-none text-[#5E6C84] dark:text-gray-400 leading-relaxed relative transition-all duration-300 ${!isDescExpanded && isLongDescription ? 'max-h-[160px] overflow-hidden' : ''}`}>
                            <p className="mb-4 whitespace-pre-line">{activeProject.description}</p>
                            {activeProject.vision && <p className="whitespace-pre-line">{activeProject.vision}</p>}
                            
                            {!isDescExpanded && isLongDescription && (
                                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-[#15171E] to-transparent pointer-events-none"></div>
                            )}
                        </div>

                        {isLongDescription && (
                            <button 
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors outline-none"
                            >
                                {isDescExpanded ? (
                                    <>Show Less <ChevronRight size={12} className="-rotate-90" /></>
                                ) : (
                                    <>View All <ChevronRight size={12} className="rotate-90" /></>
                                )}
                            </button>
                        )}
                        
                        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-[#1F2128]">
                            <button className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors group">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded text-blue-600 dark:text-blue-400">
                                    <FileText size={16} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">No Spec Attached</span>
                                    <span className="text-[10px] text-gray-500">Upload PDF</span>
                                </div>
                            </button>
                            <button 
                                onClick={handleFigmaClick}
                                className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors group">
                                <div className="p-1.5 bg-pink-100 dark:bg-pink-500/20 rounded text-pink-600 dark:text-pink-400">
                                    <LinkIcon size={16} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">Figma Prototype</span>
                                    <span className="text-[10px] text-gray-500">
                                        {figmaLink ? 'External Link' : 'Add Link'}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* RIGHT COLUMN (1/3 width) */}
            <div className="space-y-8">
                
                {/* 3. DETAILS / METADATA */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} className="text-amber-500" />
                            Details
                        </h3>
                        <button 
                            onClick={openEditModal}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit Project Details"
                        >
                            <Edit3 size={16} />
                        </button>
                    </div>
                    <div className="p-6">
                        <dl className="space-y-4">
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <User size={14} /> Owner
                                </dt>
                                <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200 flex items-center gap-2">
                                    {activeProject.ownerId && (
                                        <img 
                                            src={users.find(u => u.id === activeProject.ownerId)?.avatarUrl} 
                                            className="w-5 h-5 rounded-full object-cover" 
                                            alt="Owner"
                                        />
                                    )}
                                    {activeProject.ownerId ? (users.find(u => u.id === activeProject.ownerId)?.name || 'Unknown') : 'Unassigned'}
                                </dd>
                            </div>

                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <Flag size={14} /> Status
                                </dt>
                                <dd className={`inline-flex items-center justify-center px-[6px] py-[4px] gap-2 h-[25px] rounded-[4px] text-xs font-medium leading-tight ${getStatusColor(activeProject.status)}`}>
                                    {activeProject.status}
                                </dd>
                            </div>

                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <AlertCircle size={14} /> Priority
                                </dt>
                                <dd className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded flex items-center gap-1.5">
                                    <ArrowUpRight size={14} strokeWidth={2.5} /> High
                                </dd>
                            </div>

                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <Calendar size={14} /> Start Date
                                </dt>
                                <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200">
                                    {activeProject.startDate ? new Date(activeProject.startDate).toLocaleDateString() : 'N/A'}
                                </dd>
                            </div>

                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <Calendar size={14} /> Due Date
                                </dt>
                                <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200">
                                    {activeProject.dueDate}
                                </dd>
                            </div>

                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                    <Clock size={14} /> Created On
                                </dt>
                                <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200">
                                    {activeProject.createdAt ? new Date(activeProject.createdAt).toLocaleDateString() : 'N/A'}
                                </dd>
                            </div>

                            {/* New Metadata Fields */}
                            {activeProject.healthStatus && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <Activity size={14} /> Health
                                    </dt>
                                    <dd className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                                        <span className="capitalize">{activeProject.healthStatus.replace('_', ' ')}</span>
                                    </dd>
                                </div>
                            )}

                            {activeProject.lifecycleStage && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <TrendingUp size={14} /> Lifecycle
                                    </dt>
                                    <dd className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded capitalize">
                                        {activeProject.lifecycleStage}
                                    </dd>
                                </div>
                            )}

                            {activeProject.category && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <Layers size={14} /> Category
                                    </dt>
                                    <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200">
                                        {activeProject.category}
                                    </dd>
                                </div>
                            )}

                            {activeProject.customerCount !== undefined && activeProject.customerCount > 0 && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <Users size={14} /> Customers
                                    </dt>
                                    <dd className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded">
                                        {activeProject.customerCount.toLocaleString()}
                                    </dd>
                                </div>
                            )}

                            {activeProject.budget !== undefined && activeProject.budget > 0 && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <DollarSign size={14} /> Budget
                                    </dt>
                                    <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200">
                                        ${activeProject.budget.toLocaleString()}
                                        {activeProject.spentBudget !== undefined && activeProject.spentBudget > 0 && (
                                            <span className="text-gray-400 ml-1">
                                                (${activeProject.spentBudget.toLocaleString()} spent)
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            )}

                            {activeProject.targetAudience && (
                                <div className="flex justify-between items-center">
                                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                        <Target size={14} /> Audience
                                    </dt>
                                    <dd className="text-xs font-medium text-[#172B4D] dark:text-gray-200 truncate max-w-[150px]" title={activeProject.targetAudience}>
                                        {activeProject.targetAudience}
                                    </dd>
                                </div>
                            )}

                            <div className="pt-4 mt-2 border-t border-dashed border-gray-200 dark:border-[#2D2F36]">
                                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Tags</dt>
                                <dd className="flex flex-wrap gap-2">
                                    {activeProject.tags?.map(tag => (
                                        <span key={tag} className="text-xs font-medium bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-md border border-gray-200 dark:border-[#2D2F36]">
                                            {tag}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* 4. TEAM */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                     <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <User size={14} className="text-green-500" />
                            Team
                        </h3>
                        <span className="text-xs font-bold bg-gray-100 dark:bg-[#1F2128] text-gray-500 px-2 py-0.5 rounded-full">{activeProject.members.length}</span>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                             {activeProject.members.slice(0, 4).map(uid => {
                                 const user = users.find(u => u.id === uid);
                                 if (!user) return null;
                                 return (
                                    <div key={user.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1F2128] -mx-2 p-2 rounded-lg transition-colors">
                                        <div className="relative">
                                            <img src={user.avatarUrl} className="w-9 h-9 rounded-full bg-gray-200 ring-2 ring-transparent group-hover:ring-blue-500 transition-all object-cover" alt={user.name} />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#0F1115] rounded-full"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{user.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{user.role}</div>
                                        </div>
                                    </div>
                                 );
                             })}
                        </div>
                        <button className="w-full mt-4 py-2.5 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#1F2128] rounded-lg transition-colors border border-dashed border-blue-200 dark:border-blue-900/30">
                            + Add Member
                        </button>
                    </div>
                </div>

                {/* 5. RISKS */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                     <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert size={14} className="text-red-500" />
                            Risks
                        </h3>
                    </div>
                    <div className="p-6">
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0 shadow-sm shadow-red-500/50"></div>
                                <div>
                                    <p className="text-[#172B4D] dark:text-gray-300 font-medium leading-snug">API Rate limits approaching max capacity.</p>
                                    <p className="text-xs text-gray-500 mt-1">Reported 2 days ago</p>
                                </div>
                            </li>
                            <li className="flex gap-3 text-sm">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 shadow-sm shadow-yellow-500/50"></div>
                                <div>
                                    <p className="text-[#172B4D] dark:text-gray-300 font-medium leading-snug">External dependency delay.</p>
                                    <p className="text-xs text-gray-500 mt-1">Reported 4 days ago</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
                
                {/* 6. ACTIVITY STREAM (Fetched) */}
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Zap size={14} className="text-blue-500" />
                            Activity
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="relative border-l border-[#EBECF0] dark:border-[#2D2F36] ml-3.5 space-y-6 pl-6 py-1">
                            {recentUpdates.length > 0 ? recentUpdates.map((activity) => (
                                <div key={activity.id} className="relative group">
                                    <span className="absolute -left-[30px] top-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] ring-4 ring-gray-50 dark:ring-[#13151A]"></div>
                                    </span>
                                    <div className="flex items-start gap-3">
                                        <img 
                                            src={activity.user.avatarUrl} 
                                            className="w-8 h-8 rounded-full bg-gray-200 object-cover flex-shrink-0" 
                                            alt={activity.user.name} 
                                        />
                                        <div className="flex-1 pt-0.5">
                                            <p className="text-xs leading-relaxed text-[#172B4D] dark:text-gray-300">
                                                <span className="font-bold text-[#172B4D] dark:text-white">{activity.user.name}</span> <span className="text-[#5E6C84] dark:text-gray-400">{activity.action}</span>{' '}
                                                <span 
                                                    onClick={() => handleActivityClick(activity.type)}
                                                    className="text-[#4C9AFF] dark:text-[#6366F1] font-medium hover:underline cursor-pointer transition-colors"
                                                >
                                                    {activity.target}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-[#6B778C] dark:text-gray-500 mt-0.5">{activity.time}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-xs text-gray-400">No recent activity.</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#15171E] w-full max-w-[900px] max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeProject.color || 'from-blue-500 to-blue-600'} flex items-center justify-center text-white text-xs font-bold`}>
                            {activeProject.key?.substring(0, 2) || 'PR'}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit Product</h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{activeProject.key}</span>
                        </div>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Two Panel Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Main Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Project Name */}
                        <div className="mb-6">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2 block">Product Name</label>
                            <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                className="w-full text-xl font-semibold bg-transparent border-none text-[#172B4D] dark:text-white focus:outline-none focus:ring-0 p-0 placeholder:text-gray-400"
                                placeholder="Enter product name..."
                            />
                        </div>

                        {/* Primary Properties Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-[#2D2F36]">
                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Status</label>
                                <select
                                    value={editFormData.status}
                                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none"
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            {/* Health Status */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                    <Activity size={10} /> Health
                                </label>
                                <select
                                    value={editFormData.healthStatus}
                                    onChange={(e) => setEditFormData({...editFormData, healthStatus: e.target.value})}
                                    className={`w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer appearance-none ${
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
                            </div>

                            {/* Lifecycle Stage */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                    <TrendingUp size={10} /> Stage
                                </label>
                                <select
                                    value={editFormData.lifecycleStage}
                                    onChange={(e) => setEditFormData({...editFormData, lifecycleStage: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 cursor-pointer appearance-none"
                                >
                                    <option value="">Not set</option>
                                    <option value="discovery">Discovery</option>
                                    <option value="alpha">Alpha</option>
                                    <option value="beta">Beta</option>
                                    <option value="ga">GA</option>
                                    <option value="sunset">Sunset</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1">
                                <FileText size={10} /> Description
                            </label>
                            <textarea
                                rows={5}
                                value={editFormData.description}
                                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-[#1F2128]/50 border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed placeholder:text-gray-400"
                                placeholder="Describe the product vision, goals, and scope..."
                            />
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-6"></div>

                        {/* Target & Category Section */}
                        <div className="mb-6">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Target size={12} /> Market & Category
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SaaS, Mobile App, Platform"
                                        value={editFormData.category}
                                        onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Target Audience</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Enterprise IT teams"
                                        value={editFormData.targetAudience}
                                        onChange={(e) => setEditFormData({...editFormData, targetAudience: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Sidebar */}
                    <div className="w-[280px] bg-[#FAFBFC] dark:bg-[#0B0C0E] border-l border-gray-200 dark:border-[#1F2128] p-5 overflow-y-auto flex flex-col gap-6 flex-shrink-0">

                        {/* Timeline Section */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar size={12} /> Timeline
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Start Date</label>
                                    <input
                                        type="date"
                                        value={activeProject.startDate ? new Date(activeProject.startDate).toISOString().split('T')[0] : ''}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                        readOnly
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                        <Flag size={10} /> Due Date
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="MMM DD, YYYY"
                                        value={editFormData.dueDate}
                                        onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

                        {/* Budget Section */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <DollarSign size={12} /> Budget
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Total Budget ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={editFormData.budget || ''}
                                        onChange={(e) => setEditFormData({...editFormData, budget: e.target.value ? parseInt(e.target.value) : undefined})}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Spent ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={editFormData.spentBudget || ''}
                                        onChange={(e) => setEditFormData({...editFormData, spentBudget: e.target.value ? parseInt(e.target.value) : undefined})}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                {editFormData.budget && editFormData.budget > 0 && (
                                    <div className="pt-2">
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                            <span>Budget Used</span>
                                            <span className={editFormData.spentBudget && editFormData.spentBudget > editFormData.budget ? 'text-red-500' : 'text-emerald-500'}>
                                                {Math.round(((editFormData.spentBudget || 0) / editFormData.budget) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
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
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Users size={12} /> Metrics
                            </h4>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Customer Count</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={editFormData.customerCount || ''}
                                    onChange={(e) => setEditFormData({...editFormData, customerCount: e.target.value ? parseInt(e.target.value) : undefined})}
                                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Created Info */}
                        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                            <p className="text-[10px] text-gray-400">
                                Created {activeProject.createdAt ? new Date(activeProject.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1F2128] flex justify-end gap-3 bg-gray-50 dark:bg-[#0B0C0E]/50 flex-shrink-0">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors">
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

      {/* Figma Link Modal */}
      {isFigmaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#15171E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Add Figma Prototype</h3>
                    <button onClick={() => setIsFigmaModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Paste the share link from your Figma project to make it accessible here.
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Figma URL</label>
                        <input 
                            type="url" 
                            placeholder="https://www.figma.com/file/..." 
                            value={tempFigmaLink}
                            onChange={(e) => setTempFigmaLink(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>
                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-[#1F2128] flex justify-end gap-3 bg-gray-50 dark:bg-[#0B0C0E]/50">
                    <button onClick={() => setIsFigmaModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white">Cancel</button>
                    <button 
                        onClick={handleSaveFigmaLink}
                        disabled={!tempFigmaLink}
                        className="px-6 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Link
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
