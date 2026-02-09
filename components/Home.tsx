
import React, { useState, useMemo } from 'react';
import {
  Calendar, ArrowUpRight, Activity, Zap, GitCommit,
  ChevronDown, CheckSquare, Hexagon, Lightbulb, Ban, Sparkles, ArrowRight
} from 'lucide-react';
import ProductIcon from './ProductIcon';
import TaskDetailModal from './task-detail/TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import SprintModal from './SprintModal';
import ProductGeneratorModal from './product-generator/ProductGeneratorModal';
import CopilotModal from './copilot/CopilotModal';
import { Task, Sprint, Team, Project, User } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { View } from '../App';
interface HomeProps {
  onViewChange: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ onViewChange }) => {
  const { tasks, myTasks: allMyTasks, projects, sprints, currentUser, organizationMembers, updateTask, addTask, addSprint, addProject, addEpic, generateNextId, updateProject, currentOrganization } = useProjectData();
  const users = organizationMembers.map(m => m.user);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskType, setCreateTaskType] = useState<'task' | 'epic'>('task');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // myTasks comes from API (filtered by user_id - assignee OR reporter)
  const myTasks = allMyTasks.slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Calculate Overall Workload Health - using API-filtered myTasks (excludes done and epics)
  // Epics are containers, not work items, so exclude them from workload calculations
  const allActiveTasks = allMyTasks.filter(t => t.columnId !== 'done' && t.type !== 'epic');
  const pointsAllocated = allActiveTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  let laggingCount = 0;
  let onTimeCount = 0;
  let notStartedCount = 0;

  allActiveTasks.forEach(t => {
      const isOverdue = t.dueDate ? new Date(t.dueDate) < todayDate : false;
      if (isOverdue) {
          laggingCount++;
      } else if (t.columnId === 'todo' || t.columnId === 'idea') {
          notStartedCount++;
      } else {
          onTimeCount++;
      }
  });

  const totalActive = allActiveTasks.length || 1;
  const isBalanced = laggingCount < (allActiveTasks.length * 0.2);

  // Derived Product Health
  const productHealth = useMemo(() => {
      return projects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id && t.type !== 'epic');
          const activeS = sprints.find(s => s.projectId === p.id && s.status === 'active');
          const blockers = pTasks.filter(t => t.columnId === 'blocked').length;
          
          let health = 'Healthy';
          if (blockers > 3) health = 'At Risk';
          
          const completedSprints = sprints.filter(s => s.projectId === p.id && s.status === 'completed');
          // Calculate velocity from actual completed task points in sprints
          const completedTaskPoints = pTasks.filter(t => t.columnId === 'done').reduce((sum, t) => sum + (t.points || 0), 0);
          const velocity = completedSprints.length > 0 ? Math.round(completedTaskPoints / completedSprints.length) : 0;

          const done = pTasks.filter(t => t.columnId === 'done').length;
          const progress = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

          return {
              id: p.id,
              name: p.name,
              key: p.key,
              health,
              velocity,
              activeSprint: activeS?.name || 'No Active Sprint',
              blocking: blockers,
              progress: progress,
              color: p.color,
              icon: p.icon,
              iconColor: p.iconColor,
              imageUrl: p.imageUrl
          };
      });
  }, [projects, tasks, sprints]);

  const getHealthBadge = (health: string) => {
      if (health === 'Healthy') return <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">Healthy</span>;
      if (health === 'At Risk') return <span className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">At Risk</span>;
      return <span className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">Stable</span>;
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    updateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  const openCreateTaskModal = (type: 'task' | 'epic') => {
      setCreateTaskType(type);
      setIsCreateTaskModalOpen(true);
      setIsDropdownOpen(false);
  };

  const handleSprintSubmit = (data: { name: string; startDate: string; endDate: string; goal: string }) => {
      // Use the first active project, or the first project available
      const targetProject = projects.find(p => p.status === 'In Progress' || p.status === 'Planning') || projects[0];
      if (!targetProject) return;

      const newSprint: Sprint = {
          id: `s-${Date.now()}`,
          projectId: targetProject.id,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          goal: data.goal,
          status: 'planned'
      };
      addSprint(newSprint);
      setIsDropdownOpen(false);
  };

  const handleProductSubmit = async (productData: any) => {
      const tempProjectId = `p-${Date.now()}`;
      const projectKey = productData.name.substring(0, 3).toUpperCase();

      const newProject: Project = {
          id: tempProjectId,
          name: productData.name,
          key: projectKey,
          description: productData.description,
          status: 'Planning',
          progress: 0,
          members: [...(productData.ownerIds || [productData.ownerId]).filter(Boolean), ...productData.team],
          ownerId: productData.ownerIds?.[0] || productData.ownerId,
          ownerIds: productData.ownerIds || (productData.ownerId ? [productData.ownerId] : []),
          startDate: productData.startDate,
          dueDate: productData.dueDate,
          tags: productData.tags || ['Product'],
          color: 'from-indigo-500 to-purple-500',
          imageUrl: productData.imageUrl,
          prd: productData.docs?.prd || '',
          docs: productData.docs,
          vision: productData.vision || ''
      };

      const savedProject = await addProject(newProject);
      const projectId = savedProject?.id || tempProjectId;

      if (productData.epics && Array.isArray(productData.epics)) {
          let localIdCounter = 0;
          for (const epicData of productData.epics) {
              localIdCounter++;
              const epicId = generateNextId(projectId, 'epic');

              const newEpic: Task = {
                  id: epicId,
                  projectId: projectId,
                  title: epicData.title,
                  description: epicData.description,
                  columnId: 'todo',
                  type: 'epic',
                  priority: 'MEDIUM',
                  points: 0,
                  assignee: users.find((u: User) => u.id === (productData.ownerIds?.[0] || productData.ownerId)) || users[0],
                  reporter: users.find((u: User) => u.id === (productData.ownerIds?.[0] || productData.ownerId)) || users[0],
                  tags: [],
                  commentsCount: 0,
                  startDate: new Date().toISOString()
              };

              const savedEpic = await addEpic(newEpic);
              const parentId = savedEpic ? savedEpic.id : epicId;

              if (epicData.tasks && Array.isArray(epicData.tasks)) {
                  for (const taskData of epicData.tasks) {
                      localIdCounter++;
                      const taskId = generateNextId(projectId, 'task');
                      const assignee = users.find((u: User) => u.id === taskData.assigneeId) || users[0];

                      const newTask: Task = {
                          id: taskId,
                          projectId: projectId,
                          title: taskData.title,
                          description: taskData.description,
                          columnId: 'todo',
                          type: taskData.type || 'task',
                          priority: 'MEDIUM',
                          points: taskData.points || 1,
                          assignee: assignee,
                          reporter: users[0],
                          parentEpicId: parentId,
                          tags: [],
                          commentsCount: 0,
                          startDate: new Date().toISOString(),
                          dueDate: taskData.dueDate
                      };
                      await addTask(newTask);
                  }
              }
          }
      }

      setIsProductModalOpen(false);
      onViewChange('project-list');
  };

  const handleSaveDraft = async (draftData: any): Promise<string> => {
      const tempProjectId = draftData.id || `p-${Date.now()}`;
      const projectKey = draftData.name.substring(0, 3).toUpperCase();

      const draftProject: Project = {
          id: tempProjectId,
          name: draftData.name,
          key: projectKey,
          description: draftData.description || '',
          status: 'draft',
          progress: 0,
          members: (draftData.draft_data?.ownerIds || [draftData.draft_data?.ownerId]).filter(Boolean),
          ownerId: draftData.draft_data?.ownerIds?.[0] || draftData.draft_data?.ownerId || currentUser?.id,
          ownerIds: draftData.draft_data?.ownerIds || (draftData.draft_data?.ownerId ? [draftData.draft_data.ownerId] : [currentUser?.id].filter(Boolean)),
          organizationId: currentOrganization?.id,
          startDate: draftData.draft_data?.startDate,
          dueDate: draftData.draft_data?.targetDate,
          tags: draftData.draft_data?.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || ['Draft'],
          color: 'from-gray-500 to-gray-600',
          imageUrl: draftData.draft_data?.productImage,
          prd: draftData.draft_data?.generatedDocs?.prd || '',
          docs: draftData.draft_data?.generatedDocs || {},
          vision: draftData.vision || '',
          draftStep: draftData.draft_step,
          draftData: draftData.draft_data
      };

      let savedProject: Project | null;
      if (draftData.id && projects.some(p => p.id === draftData.id)) {
          savedProject = await updateProject(draftProject);
      } else {
          savedProject = await addProject(draftProject);
      }

      return savedProject?.id || tempProjectId;
  };

  // Calculate blockers across all projects (exclude epics - they are containers)
  const blockerCount = tasks.filter(t => t.columnId === 'blocked' && t.type !== 'epic').length;

  const stats = [
    {
      label: 'Active Sprints',
      value: sprints.filter(s => s.status === 'active').length.toString(),
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-[#1E2330]',
      target: 'sprints' as View
    },
    {
      label: 'My Tasks',
      // Exclude epics from count - they are containers, not work items
      value: allMyTasks.filter(t => t.type !== 'epic').length.toString(),
      icon: GitCommit,
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-[#2A2215]',
      target: 'my-tasks' as View
    },
    {
      label: 'Blockers',
      value: blockerCount.toString(),
      icon: Ban,
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-[#2A1515]',
      target: 'project' as View
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B0C0E] p-6 lg:p-10 custom-scrollbar transition-colors duration-300 font-sans h-full" onClick={() => setIsDropdownOpen(false)}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-gray-100 dark:border-[#1F2128]">
        <div>
          <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-2 tracking-tight">
              Good morning, {currentUser?.name.split(' ')[0] || 'Guest'}
          </h1>
          <p className="text-[#5E6C84] dark:text-[#a1a1aa]">
            Here's what's happening with your products today.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-white dark:bg-[#15171E] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm text-sm font-bold text-[#172B4D] dark:text-gray-300">
                <Calendar size={16} className="text-gray-400" />
                <span>{today}</span>
            </div>
             
             <div className="relative">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                    className="bg-[#172B4D] dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                 >
                     + New Item <ChevronDown size={14} />
                 </button>
                 
                 {isDropdownOpen && (
                     <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                         <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#1F2128]/50">
                             Work Items
                         </div>
                         <button onClick={() => openCreateTaskModal('task')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-3 text-[#172B4D] dark:text-white transition-colors">
                             <CheckSquare size={14} className="text-blue-500" /> Task
                         </button>
                         <button onClick={() => openCreateTaskModal('epic')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-3 text-[#172B4D] dark:text-white transition-colors">
                             <Hexagon size={14} className="text-purple-500" /> Epic
                         </button>
                         
                         <div className="h-px bg-gray-100 dark:bg-[#2D2F36] mx-0"></div>
                         
                         <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#1F2128]/50">
                             Planning
                         </div>
                         <button onClick={() => { setIsSprintModalOpen(true); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-3 text-[#172B4D] dark:text-white transition-colors">
                             <Zap size={14} className="text-yellow-500" /> Sprint
                         </button>
                         <button onClick={() => { setIsProductModalOpen(true); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2D2F36] flex items-center gap-3 text-[#172B4D] dark:text-white transition-colors">
                             <Lightbulb size={14} className="text-pink-500" /> Product
                         </button>
                     </div>
                 )}
             </div>
        </div>
      </div>

      {/* Bento Grid Dashboard - Symmetrical 6-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">

        {/* Row 1: Stats Cards - 3 equal cards */}
        {stats.map((stat, i) => (
          <div
            key={i}
            onClick={() => onViewChange(stat.target)}
            className="xl:col-span-2 bg-white dark:bg-[#15171E] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[120px]"
          >
            <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} />
                </div>
                <ArrowUpRight size={14} className="text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div>
                <div className="text-3xl font-bold text-[#172B4D] dark:text-white tracking-tight">{stat.value}</div>
                <div className="text-[10px] font-bold text-[#5E6C84] dark:text-[#a1a1aa] uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}

        {/* Row 2-3: Copilot CTA (left half) + Workload (right half) */}
        {/* Copilot CTA - Left Half */}
        <div
          onClick={() => setIsCopilotOpen(true)}
          className="xl:col-span-3 md:col-span-1 min-h-[280px] bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-[#0a0a0c] dark:via-[#0f1014] dark:to-[#131620] rounded-2xl border border-gray-800 dark:border-[#1F2128] shadow-xl overflow-hidden relative group cursor-pointer hover:border-purple-500/50 transition-all"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-900/10 to-transparent"></div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
            {/* AI Icon with glow */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 group-hover:scale-105 transition-all duration-300">
                <Sparkles size={28} className="text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">AI Copilot</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-[260px] leading-relaxed">
              Create tasks, summarize projects, and get intelligent suggestions powered by AI.
            </p>

            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-xl transition-all group-hover:shadow-lg group-hover:shadow-white/10">
              <span>Open Copilot</span>
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Workload - Right Half */}
        <div className="xl:col-span-3 md:col-span-1 min-h-[280px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold text-[#172B4D] dark:text-white">Current Workload</span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  !isBalanced ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                  'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                  {isBalanced ? 'Balanced' : 'At Risk'}
              </span>
          </div>

          <div className="flex items-end justify-between mb-6">
              <div>
                  <div className="text-5xl font-bold text-[#172B4D] dark:text-white leading-none">{allActiveTasks.length}</div>
                  <div className="text-xs text-[#5E6C84] dark:text-gray-500 font-bold uppercase tracking-wider mt-2">Active Tasks</div>
              </div>
              <div className="text-right">
                  <div className="text-3xl font-bold text-[#172B4D] dark:text-white leading-none">{pointsAllocated}</div>
                  <div className="text-xs text-[#5E6C84] dark:text-gray-500 font-bold uppercase tracking-wider mt-2">Points</div>
              </div>
          </div>

          <div className="h-3 w-full flex rounded-full overflow-hidden bg-gray-100 dark:bg-[#1F2128] mb-6">
              <div className="bg-red-500" style={{ width: `${(laggingCount / totalActive) * 100}%` }}></div>
              <div className="bg-blue-500" style={{ width: `${(onTimeCount / totalActive) * 100}%` }}></div>
              <div className="bg-gray-300 dark:bg-gray-700" style={{ width: `${(notStartedCount / totalActive) * 100}%` }}></div>
          </div>

          <div className="space-y-3 mt-auto">
              <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <span className="text-[#5E6C84] dark:text-gray-400 font-medium">Lagging</span>
                  </div>
                  <span className="font-bold text-[#172B4D] dark:text-white">{laggingCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-[#5E6C84] dark:text-gray-400 font-medium">On Time</span>
                  </div>
                  <span className="font-bold text-[#172B4D] dark:text-white">{onTimeCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                      <span className="text-[#5E6C84] dark:text-gray-400 font-medium">Not Started</span>
                  </div>
                  <span className="font-bold text-[#172B4D] dark:text-white">{notStartedCount}</span>
              </div>
          </div>
        </div>

        {/* Row 4-5: Product Health (left half) + My Priorities (right half) */}
        {/* Product Health - Left Half */}
        <div className="xl:col-span-3 md:col-span-1 min-h-[280px] bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-bold text-[#172B4D] dark:text-white">Product Health</h2>
                <button onClick={() => onViewChange('project-list')} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">View All</button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {productHealth.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                        {productHealth.map(prod => (
                            <div key={prod.id} onClick={() => onViewChange('project')} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3 mb-2">
                                    <ProductIcon project={prod} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{prod.name}</div>
                                        <div className="text-[10px] text-[#5E6C84] dark:text-gray-500">{prod.activeSprint}</div>
                                    </div>
                                    {getHealthBadge(prod.health)}
                                </div>
                                <div className="flex items-center gap-3 pl-11">
                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${prod.progress > 75 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prod.progress}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-[#5E6C84] dark:text-gray-400 w-10 text-right">{prod.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            {/* Minimal Product Illustration */}
                            <div className="mx-auto mb-5 w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1.5" strokeDasharray="2 2" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">No products yet</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Create your first product to get started</p>
                            <button onClick={() => onViewChange('project-list')} className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-[#1F2128] hover:bg-gray-200 dark:hover:bg-[#2D2F36] px-4 py-2 rounded-lg transition-colors">
                              + New Product
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* My Priorities - Right Half */}
        <div className="xl:col-span-3 md:col-span-1 min-h-[280px] bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#172B4D] dark:text-white">My Priorities</h2>
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">{allMyTasks.length}</span>
                </div>
                <button onClick={() => onViewChange('my-tasks')} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">View All</button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {myTasks.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                        {myTasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group cursor-pointer"
                            >
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    task.columnId === 'done' ? 'bg-emerald-500' :
                                    task.columnId === 'inprogress' ? 'bg-blue-500' :
                                    'bg-gray-300 dark:bg-gray-600'
                                }`}></div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-[#172B4D] dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mb-1">
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{task.id}</span>
                                        <span className="text-[9px] font-bold bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase">
                                            {(task.columnId || 'todo').replace('inprogress', 'IN PROGRESS').replace('todo', 'TO DO')}
                                        </span>
                                    </div>
                                </div>

                                {task.dueDate && (
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-[#1F2128] px-2.5 py-1 rounded-lg">
                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            {/* Minimal checkmark illustration */}
                            <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                                <path d="M7 13l3 3 7-7" className="stroke-emerald-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">All caught up</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">No tasks need your attention</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>

      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            isOpen={!!selectedTask} 
            onClose={() => setSelectedTask(null)}
            onUpdate={handleTaskUpdate}
        />
      )}

      {/* Modals */}
      <CreateTaskModal 
        isOpen={isCreateTaskModalOpen} 
        onClose={() => setIsCreateTaskModalOpen(false)}
        initialType={createTaskType}
      />

      <SprintModal 
        isOpen={isSprintModalOpen} 
        onClose={() => setIsSprintModalOpen(false)}
        onSubmit={handleSprintSubmit}
        nextSprintNumber={sprints.length + 1}
      />

      <ProductGeneratorModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onCreate={handleProductSubmit}
        onSaveDraft={handleSaveDraft}
      />

      <CopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
};

export default Home;
