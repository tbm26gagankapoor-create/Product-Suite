
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle, AlertCircle, TrendingUp, MoreHorizontal, Calendar, 
  ChevronsRight, ArrowUpRight, Activity, Zap, GitCommit, MessageSquare, 
  Box, AlertTriangle, ArrowRight, ChevronDown, Layers, Users, CheckSquare, 
  Plus, Hexagon, Lightbulb, Ban, LayoutGrid, BarChart2
} from 'lucide-react';
import { COLUMNS } from '../constants';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import SprintModal from './SprintModal';
import ProductGeneratorModal from './ProductGeneratorModal';
import { Task, Sprint, Team, Project, User } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { View } from '../App';
import { activityService } from '../services/activity.service';

interface HomeProps {
  onViewChange: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ onViewChange }) => {
  const { tasks, projects, sprints, currentUser, users, updateTask, addTask, addSprint, addProject, addEpic } = useProjectData();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskType, setCreateTaskType] = useState<'task' | 'epic'>('task');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Real activity logs
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
      activityService.getFeed({ limit: 5 }).then(res => {
          setRecentUpdates(res.data.map(log => ({
              id: log.id,
              user: log.user || { name: 'System', avatarUrl: '' },
              action: log.action,
              target: 'Entity', 
              project: 'Infinia',
              time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: log.entity_type
          })));
      });
  }, []);

  // Filter tasks for current user
  const myTasks = tasks.filter(t => t.assignee.id === currentUser?.id).slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Calculate Overall Workload Health
  const allActiveTasks = tasks.filter(t => t.columnId !== 'done');
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
          const pTasks = tasks.filter(t => t.projectId === p.id);
          const activeS = sprints.find(s => s.projectId === p.id && s.status === 'active');
          const blockers = pTasks.filter(t => t.columnId === 'blocked').length;
          
          let health = 'Healthy';
          if (blockers > 3) health = 'At Risk';
          
          const completedSprints = sprints.filter(s => s.projectId === p.id && s.status === 'completed');
          const velocity = completedSprints.length * 20 || 0; 

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
              color: p.color
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
      const newSprint: Sprint = {
          id: `s-${Date.now()}`,
          projectId: projects[0]?.id, 
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
      setIsProductModalOpen(false);
      onViewChange('project-list');
  };

  // Calculate blockers across all projects
  const blockerCount = tasks.filter(t => t.columnId === 'blocked').length;

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
      value: myTasks.length.toString(), 
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onViewChange(stat.target)}
            className="bg-white dark:bg-[#15171E] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all cursor-pointer group relative flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div>
                <div className="text-3xl font-bold text-[#172B4D] dark:text-white tracking-tight mb-1">{stat.value}</div>
                <div className="text-[11px] font-bold text-[#5E6C84] dark:text-[#a1a1aa] uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-8">
            
            {/* Product Health Tracker */}
            <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-200 dark:border-[#1F2128] flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Product Health</h2>
                    <button onClick={() => onViewChange('project-list')} className="text-xs font-bold text-[#5E6C84] dark:text-gray-500 hover:text-[#172B4D] dark:hover:text-white transition-colors">View All</button>
                </div>
                
                <div className="grid grid-cols-12 px-8 py-4 text-[10px] font-bold text-[#5E6C84] dark:text-[#a1a1aa] uppercase tracking-wider border-b border-gray-100 dark:border-[#1F2128] bg-gray-50 dark:bg-[#15171E]">
                    <div className="col-span-5">Product</div>
                    <div className="col-span-2">Health</div>
                    <div className="col-span-3">Active Sprint</div>
                    <div className="col-span-2 text-right">Progress</div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {productHealth.map(prod => (
                        <div key={prod.id} onClick={() => onViewChange('project')} className="grid grid-cols-12 px-8 py-5 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                            <div className="col-span-5 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${prod.color || 'from-blue-600 to-blue-700'} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                                    <span className="font-bold text-xs">{prod.key.substring(0, 3)}</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{prod.name}</div>
                                    <div className="text-[10px] text-[#5E6C84] dark:text-gray-500 mt-0.5">Velocity: {prod.velocity} pts</div>
                                </div>
                            </div>
                            <div className="col-span-2">
                                {getHealthBadge(prod.health)}
                            </div>
                            <div className="col-span-3">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-300">{prod.activeSprint}</div>
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-3">
                                <div className="w-20 h-1.5 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${prod.progress > 75 ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`} style={{ width: `${prod.progress}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-[#5E6C84] dark:text-gray-400 w-8 text-right">{prod.progress}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* My Priorities */}
            <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden min-h-[300px]">
                 <div className="px-8 py-6 border-b border-gray-200 dark:border-[#1F2128] flex items-center gap-3">
                    <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">My Priorities</h2>
                    <span className="bg-blue-100 text-blue-700 dark:bg-[#2D2F36] dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">{myTasks.length}</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {myTasks.length > 0 ? myTasks.map((task) => (
                    <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="px-8 py-5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group cursor-pointer"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
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
                                <span className="text-[9px] font-bold bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#3D404A] uppercase tracking-wide">
                                    {task.columnId.replace('inprogress', 'IN PROGRESS').replace('todo', 'TO DO')}
                                </span>
                            </div>
                        </div>

                        {task.dueDate && (
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-[#1F2128] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        )}

                        <button className="text-gray-300 dark:text-gray-600 hover:text-[#172B4D] dark:hover:text-white transition-colors">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    )) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No priority tasks assigned.</div>
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col h-full space-y-8">
           
           {/* Current Workload */}
           <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-2xl p-8 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-xs font-bold text-[#5E6C84] dark:text-[#a1a1aa] uppercase tracking-wider">Current Workload</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        !isBalanced ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
                        'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                        {isBalanced ? 'Balanced' : 'At Risk'}
                    </span>
                </div>
                
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="text-5xl font-bold text-[#172B4D] dark:text-white leading-none mb-1">{allActiveTasks.length}</div>
                        <div className="text-xs text-[#5E6C84] dark:text-gray-500 font-bold uppercase tracking-wider mt-2">Active Tasks</div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-[#172B4D] dark:text-white leading-none mb-1">{pointsAllocated}</div>
                        <div className="text-xs text-[#5E6C84] dark:text-gray-500 font-bold uppercase tracking-wider mt-2">Pts Allocated</div>
                    </div>
                </div>

                <div className="h-3 w-full flex rounded-full overflow-hidden bg-gray-100 dark:bg-[#1F2128] mb-8">
                    <div className="bg-red-500" style={{ width: `${(laggingCount / totalActive) * 100}%` }}></div>
                    <div className="bg-blue-500" style={{ width: `${(onTimeCount / totalActive) * 100}%` }}></div>
                    <div className="bg-gray-300 dark:bg-gray-700" style={{ width: `${(notStartedCount / totalActive) * 100}%` }}></div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <span className="text-[#5E6C84] dark:text-gray-400 font-bold">Lagging</span>
                        </div>
                        <span className="font-bold text-[#172B4D] dark:text-white">{laggingCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-[#5E6C84] dark:text-gray-400 font-bold">On Time</span>
                        </div>
                        <span className="font-bold text-[#172B4D] dark:text-white">{onTimeCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                            <span className="text-[#5E6C84] dark:text-gray-400 font-bold">Not Started</span>
                        </div>
                        <span className="font-bold text-[#172B4D] dark:text-white">{notStartedCount}</span>
                    </div>
                </div>
           </div>

           {/* Live Updates */}
           <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm flex flex-col overflow-hidden h-full min-h-[300px]">
                <div className="px-8 py-6 border-b border-gray-200 dark:border-[#1F2128]">
                    <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Live Updates</h2>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-center">
                    {recentUpdates.length > 0 ? (
                        <div className="w-full space-y-5 px-4">
                            {recentUpdates.map((update, idx) => (
                                <div key={idx} className="flex gap-4 text-left group">
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 w-12 pt-1 font-mono">{update.time}</div>
                                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        <span className="font-bold text-[#172B4D] dark:text-gray-200">{update.user.name.split(' ')[0]}</span> {update.action} <span className="text-blue-600 dark:text-blue-400 font-medium">{update.target}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 dark:text-gray-500 text-xs">No recent updates.</div>
                    )}
                </div>
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
      />
    </div>
  );
};

export default Home;
