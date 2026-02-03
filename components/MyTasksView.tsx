
import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  MoreHorizontal, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Search, 
  Layout, 
  Flag, 
  Briefcase 
} from 'lucide-react';
import { COLUMNS } from '../constants';
import { Task } from '../types';
import TaskDetailModal from './TaskDetailModal';
import { useProjectData } from '../context/ProjectDataContext';

const MyTasksView: React.FC = () => {
  const { myTasks: allMyTasks, updateTask, currentUser, projects } = useProjectData();
  // Extended filter state to include specific widget filters
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'completed' | 'overdue' | 'today'>('incomplete');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) {
      return <div className="p-8 text-center text-gray-500">Please log in to view your tasks.</div>;
  }

  // myTasks comes from API (filtered by user_id - assignee OR reporter)
  // Only apply search filter on client side
  const myTasks = allMyTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleTaskUpdate = (updatedTask: Task) => {
    updateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  // Group tasks logic
  const getTaskGroup = (task: Task) => {
    if (task.columnId === 'done') return 'Completed';
    if (!task.dueDate) return 'No Date';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'Overdue';
    if (dueDate.getTime() === today.getTime()) return 'Today';
    return 'Upcoming';
  };

  const groupedTasks = myTasks.reduce((acc, task) => {
    const group = getTaskGroup(task);
    
    // Updated Filtering Logic
    if (filter === 'incomplete' && group === 'Completed') return acc;
    if (filter === 'completed' && group !== 'Completed') return acc;
    if (filter === 'overdue' && group !== 'Overdue') return acc;
    if (filter === 'today' && group !== 'Today') return acc;
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const groupOrder = ['Overdue', 'Today', 'Upcoming', 'No Date', 'Completed'];

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
      case 'LOW': return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusBadgeStyles = (id: string) => {
      switch(id) {
          case 'idea': return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
          case 'todo': return 'bg-[#DFE1E6] text-[#42526E] dark:bg-[#42526E]/40 dark:text-[#DFE1E6]';
          case 'inprogress': return 'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#0747A6]/30 dark:text-[#DEEBFF]';
          case 'blocked': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
          case 'testing': return 'bg-[#FFF0B3] text-[#172B4D] dark:bg-[#FFF0B3]/20 dark:text-[#FFE380]';
          case 'done': return 'bg-[#E3FCEF] text-[#006644] dark:bg-[#006644]/30 dark:text-[#E3FCEF]';
          default: return 'bg-[#DFE1E6] text-[#42526E] dark:bg-[#42526E]/40 dark:text-[#DFE1E6]';
      }
  };

  const getProjectName = (projId: string) => {
      const project = projects.find(p => p.id === projId);
      return project ? project.name : 'Unknown Project';
  };

  const renderDateBadge = (dateString?: string, group?: string) => {
    if (!dateString) return (
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-gray-400">
            <Calendar size={20} />
            <span className="text-[10px] font-bold uppercase mt-1">No Date</span>
        </div>
    );

    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const weekday = date.toLocaleString('default', { weekday: 'short' });

    let bgClass = "bg-white dark:bg-[#1F2128] border-gray-200 dark:border-[#2D2F36] text-gray-700 dark:text-gray-300";
    let accentClass = "text-gray-500 dark:text-gray-400";

    if (group === 'Today') {
        bgClass = "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-500";
        accentClass = "text-amber-600 dark:text-amber-400";
    } else if (group === 'Overdue') {
        bgClass = "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-500";
        accentClass = "text-red-600 dark:text-red-400";
    } else if (group === 'Upcoming') {
        bgClass = "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400";
        accentClass = "text-blue-600 dark:text-blue-400";
    }

    return (
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 ${bgClass} shadow-sm transition-transform group-hover:scale-105`}>
             <span className={`text-[10px] font-bold uppercase leading-none ${accentClass}`}>{month}</span>
             <span className="text-2xl font-black leading-none my-0.5">{day}</span>
             <span className={`text-[10px] font-medium uppercase leading-none ${accentClass}`}>{group === 'Today' ? 'Today' : weekday}</span>
        </div>
    );
  };

  // Helper for widget styling
  const getWidgetStyle = (isActive: boolean) => {
      return `bg-white dark:bg-[#15171E] p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 select-none ${
          isActive 
          ? 'border-blue-500 ring-1 ring-blue-500 shadow-md transform scale-[1.02]' 
          : 'border-gray-200 dark:border-[#1F2128] shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
      }`;
  };

  // Calculate stats for widgets
  const openTasksCount = myTasks.filter(t => t.columnId !== 'done').length;
  // Note: groupedTasks depends on 'filter', so we need raw stats from myTasks for the widgets to be persistent
  // We can re-use the getTaskGroup logic
  const overdueCount = myTasks.filter(t => getTaskGroup(t) === 'Overdue').length;
  const todayCount = myTasks.filter(t => getTaskGroup(t) === 'Today').length;

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">My Tasks</h1>
               <div className="flex items-center gap-2 text-sm text-[#5E6C84] dark:text-gray-400">
                  <span className="font-medium">Good morning, {currentUser.name.split(' ')[0]}!</span>
                  <span>•</span>
                  <span>You have {todayCount} tasks due today.</span>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter tasks..." 
                        className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
                    />
                 </div>
            </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* Stats Widgets as Filters - Changed to grid-cols-3 and added filtering logic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div 
                onClick={() => setFilter('incomplete')}
                className={getWidgetStyle(filter === 'incomplete')}
              >
                  <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Layout size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{openTasksCount}</div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Open Tasks</div>
                  </div>
              </div>
              
              <div 
                onClick={() => setFilter('overdue')}
                className={getWidgetStyle(filter === 'overdue')}
              >
                  <div className="p-3 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                      <AlertCircle size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{overdueCount}</div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overdue</div>
                  </div>
              </div>

              <div 
                onClick={() => setFilter('today')}
                className={getWidgetStyle(filter === 'today')}
              >
                  <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Clock size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{todayCount}</div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Today</div>
                  </div>
              </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden min-h-[500px]">
              
              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-gray-200 dark:border-[#1F2128] flex items-center justify-between bg-gray-50/50 dark:bg-[#1F2128]/50">
                 <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#2D2F36] p-1 rounded-lg">
                     <button 
                        onClick={() => setFilter('incomplete')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'incomplete' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                     >
                        Incomplete
                     </button>
                     <button 
                        onClick={() => setFilter('completed')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'completed' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                     >
                        Completed
                     </button>
                     <button 
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                     >
                        All
                     </button>
                 </div>

                 <div className="flex items-center gap-3">
                     <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#172B4D] dark:hover:text-white transition-colors">
                         <Filter size={14} /> Group by Date
                     </button>
                     <div className="h-4 w-px bg-gray-300 dark:bg-[#2D2F36]"></div>
                     <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#172B4D] dark:hover:text-white transition-colors">
                         <MoreHorizontal size={14} />
                     </button>
                 </div>
              </div>

              {/* Task Lists */}
              <div className="p-4">
                 {groupOrder.map(group => {
                     const tasks = groupedTasks[group];
                     if (!tasks || tasks.length === 0) return null;

                     const groupColor = 
                        group === 'Overdue' ? 'text-red-600' : 
                        group === 'Today' ? 'text-amber-600' :
                        group === 'Upcoming' ? 'text-blue-600' :
                        group === 'Completed' ? 'text-green-600' : 'text-gray-500';

                     return (
                         <div key={group} className="mb-8 last:mb-0">
                             {/* Group Divider / Header */}
                             <div className="flex items-center gap-4 px-2 py-2 mb-3">
                                 <div className={`p-1.5 rounded-lg ${
                                     group === 'Overdue' ? 'bg-red-50 dark:bg-red-500/10' :
                                     group === 'Today' ? 'bg-amber-50 dark:bg-amber-500/10' :
                                     group === 'Upcoming' ? 'bg-blue-50 dark:bg-blue-500/10' :
                                     'bg-gray-100 dark:bg-[#2D2F36]'
                                 }`}>
                                     <Calendar size={14} className={groupColor} />
                                 </div>
                                 <h3 className={`text-sm font-bold uppercase tracking-wider ${groupColor}`}>{group}</h3>
                                 <div className="h-px bg-gray-200 dark:bg-[#2D2F36] flex-1"></div>
                                 <span className="text-xs text-gray-400 font-bold px-2.5 py-1 bg-gray-100 dark:bg-[#2D2F36] rounded-full">{tasks.length} tasks</span>
                             </div>
                             
                             {/* Tasks */}
                             <div className="space-y-3">
                                 {tasks.map(task => {
                                     const isReporter = task.reporter?.id === currentUser.id;
                                     return (
                                     <div 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className="group flex items-center gap-6 p-4 bg-white dark:bg-[#15171E] hover:bg-gray-50 dark:hover:bg-[#1F2128]/80 rounded-2xl transition-all cursor-pointer border border-gray-100 dark:border-[#1F2128] hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md"
                                     >
                                         {/* Checkbox */}
                                         <button 
                                            onClick={(e) => e.stopPropagation()}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                             task.columnId === 'done' 
                                             ? 'bg-green-500 border-green-500 text-white' 
                                             : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 text-transparent'
                                         }`}>
                                             <CheckCircle2 size={14} strokeWidth={3} />
                                         </button>

                                         {/* Main Info */}
                                         <div className="flex-1 min-w-0 flex flex-col justify-center">
                                             <div className="flex items-center gap-2 mb-1.5">
                                                 <span className="text-xs font-bold text-gray-400">{task.id}</span>
                                                 {isReporter && (
                                                     <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">REPORTER</span>
                                                 )}
                                                 <div className={`flex items-center justify-center px-[6px] py-[4px] gap-2 h-[25px] rounded-[4px] text-xs font-medium leading-tight ${getStatusBadgeStyles(task.columnId)}`}>
                                                    {COLUMNS.find(c => c.id === task.columnId)?.title}
                                                 </div>
                                                 {task.points !== undefined && (
                                                    <span className="flex items-center justify-center w-5 h-5 bg-gray-100 dark:bg-[#2D2F36] rounded text-[10px] font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#3D404A]" title="Story Points">
                                                        {task.points}
                                                    </span>
                                                 )}
                                                 {task.priority && (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                 )}
                                             </div>
                                             <div className={`text-base font-bold truncate ${task.columnId === 'done' ? 'text-gray-400 line-through' : 'text-[#172B4D] dark:text-gray-100'}`}>
                                                 {task.title}
                                             </div>
                                             <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                 <Briefcase size={12} />
                                                 <span className="font-medium text-gray-600 dark:text-gray-400">{getProjectName(task.projectId)}</span>
                                             </div>
                                         </div>

                                         {/* Major Element: Date Badge */}
                                         <div className="flex-shrink-0">
                                             {renderDateBadge(task.dueDate, group)}
                                         </div>

                                         {/* Action Trigger */}
                                         <button 
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-gray-300 hover:text-blue-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                                         >
                                             <MoreHorizontal size={20} />
                                         </button>
                                     </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
                 
                 {Object.keys(groupedTasks).length === 0 && (
                     <div className="flex flex-col items-center justify-center py-20 text-center">
                         <div className="w-16 h-16 bg-gray-100 dark:bg-[#1F2128] rounded-full flex items-center justify-center mb-4 text-gray-400">
                             <CheckCircle2 size={32} />
                         </div>
                         <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-1">All caught up!</h3>
                         <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks match your current filter.</p>
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
    </div>
  );
};

export default MyTasksView;
