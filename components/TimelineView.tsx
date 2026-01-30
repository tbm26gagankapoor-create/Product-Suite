
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Filter, 
  Settings, 
  MoreHorizontal, 
  CheckCircle2, 
  Circle, 
  ZoomIn, 
  Palette, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  AlertCircle, 
  ArrowUp 
} from 'lucide-react';
import { Task, User } from '../types';
import { COLUMNS } from '../constants';
import TaskDetailModal from './TaskDetailModal';
import { useProjectData } from '../context/ProjectDataContext';

interface GanttTask {
  id: string;
  title: string;
  columnId: string; // Use columnId directly instead of mapped status
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  assignee?: User;
  dependencies?: string[];
  originalTask?: Task; // Store reference to full task
  isSubtask?: boolean;
}

interface GanttGroup {
  id: string;
  title: string;
  tasks: GanttTask[];
  isOpen: boolean;
}

interface TimelineViewProps {
    tasks: Task[];
    onTaskUpdate: (task: Task) => void;
}

const COL_WIDTH = 56;
const ROW_HEIGHT = 48;
const SIDEBAR_WIDTH = 380;

const getValidDate = (dateStr?: string, defaultOffset = 0): string => {
    if (dateStr) return new Date(dateStr).toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() + defaultOffset);
    return d.toISOString().split('T')[0];
};

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskUpdate }) => {
  const { sprints } = useProjectData();
  const [viewDate] = useState(new Date()); 
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Grouping State
  const [groupBy, setGroupBy] = useState<'sprint' | 'epic'>('sprint');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  // Interaction State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; x: number; y: number; width: number } | null>(null);

  // View state for expanding/collapsing groups
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  // Transform Tasks into Gantt Groups based on GroupBy setting
  const data: GanttGroup[] = useMemo(() => {
      const groups: GanttGroup[] = [];
      
      if (groupBy === 'sprint') {
          // Group 1: Sprints
          sprints.forEach(sprint => {
              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
              if (sprintTasks.length > 0) {
                  groups.push({
                      id: sprint.id,
                      title: sprint.name,
                      isOpen: true,
                      tasks: sprintTasks.map(t => ({
                          id: t.id,
                          title: t.title,
                          columnId: t.columnId,
                          startDate: getValidDate(t.startDate), 
                          endDate: getValidDate(t.dueDate, 5), 
                          assignee: t.assignee,
                          originalTask: t
                      }))
                  });
              }
          });

          // Group 2: Backlog / Unscheduled
          const backlogTasks = tasks.filter(t => !t.sprintId);
          if (backlogTasks.length > 0) {
              groups.push({
                  id: 'backlog',
                  title: 'Backlog & Unscheduled',
                  isOpen: true,
                  tasks: backlogTasks.map(t => ({
                      id: t.id,
                      title: t.title,
                      columnId: t.columnId,
                      startDate: getValidDate(t.startDate, 7), 
                      endDate: getValidDate(t.dueDate, 12),
                      assignee: t.assignee,
                      originalTask: t
                  }))
              });
          }
      } else {
          // Group by Epic (Feature)
          const features = tasks.filter(t => t.type === 'feature' || t.type === 'epic');
          // Find orphans
          const featureIds = new Set(features.map(f => f.id));
          const orphans = tasks.filter(t => 
              t.type !== 'feature' && 
              t.type !== 'epic' && 
              (!t.parentEpicId || !featureIds.has(t.parentEpicId))
          );

          features.forEach(feature => {
              const subtasks = tasks.filter(t => t.parentEpicId === feature.id);
              const ganttSubtasks: GanttTask[] = subtasks.map((st, idx) => {
                  const parentStart = new Date(getValidDate(feature.startDate));
                  const start = st.startDate ? new Date(st.startDate) : new Date(parentStart);
                  if (!st.startDate) start.setDate(parentStart.getDate() + (idx * 2));
                  
                  const end = st.dueDate ? new Date(st.dueDate) : new Date(start);
                  if (!st.dueDate) end.setDate(start.getDate() + 3);

                  return {
                      id: st.id,
                      title: st.title,
                      columnId: st.columnId,
                      startDate: start.toISOString().split('T')[0],
                      endDate: end.toISOString().split('T')[0],
                      assignee: st.assignee,
                      isSubtask: true,
                      originalTask: st
                  };
              });

              const featureTask: GanttTask = {
                  id: feature.id,
                  title: feature.title,
                  columnId: feature.columnId,
                  startDate: getValidDate(feature.startDate),
                  endDate: getValidDate(feature.dueDate, 14),
                  assignee: feature.assignee,
                  originalTask: feature
              };

              groups.push({
                  id: feature.id,
                  title: feature.title,
                  isOpen: true,
                  tasks: [featureTask, ...ganttSubtasks]
              });
          });

          if (orphans.length > 0) {
               groups.push({
                  id: 'other',
                  title: 'Other Tasks',
                  isOpen: true,
                  tasks: orphans.map(t => ({
                      id: t.id,
                      title: t.title,
                      columnId: t.columnId,
                      startDate: getValidDate(t.startDate, 3), 
                      endDate: getValidDate(t.dueDate, 8), 
                      assignee: t.assignee,
                      originalTask: t
                  }))
              });
          }
      }

      return groups;
  }, [tasks, groupBy, sprints]);

  // Generate Date Range for the View
  const dates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 5); 
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const getStatusColor = (columnId: string, type: 'bg' | 'text' | 'border') => {
    switch (columnId) {
      case 'done': // Green
        return type === 'bg' ? 'bg-emerald-500' : type === 'text' ? 'text-emerald-600' : 'border-emerald-600';
      case 'testing': // Orange/Yellow
        return type === 'bg' ? 'bg-amber-500' : type === 'text' ? 'text-amber-600' : 'border-amber-600';
      case 'inprogress': // Blue
        return type === 'bg' ? 'bg-blue-600' : type === 'text' ? 'text-blue-600' : 'border-blue-600';
      case 'blocked': // Red
        return type === 'bg' ? 'bg-red-500' : type === 'text' ? 'text-red-600' : 'border-red-600';
      case 'idea': // Purple
        return type === 'bg' ? 'bg-purple-500' : type === 'text' ? 'text-purple-600' : 'border-purple-600';
      case 'todo': // Slate
      default: 
        return type === 'bg' ? 'bg-slate-400' : type === 'text' ? 'text-slate-500' : 'border-slate-500';
    }
  };

  const getStatusBadgeStyles = (id: string) => {
      switch(id) {
          case 'idea': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
          case 'todo': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
          case 'inprogress': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
          case 'blocked': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
          case 'testing': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
          case 'done': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
          default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      }
  };

  const calculateBarPosition = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const viewStart = dates[0];
    
    const diffTimeStart = startDate.getTime() - viewStart.getTime();
    const startOffsetDays = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    const durationTime = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationTime / (1000 * 60 * 60 * 24)) + 1); 

    return {
      left: startOffsetDays * COL_WIDTH,
      width: durationDays * COL_WIDTH
    };
  };

  const handleMouseEnter = (e: React.MouseEvent, task: Task, width: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTask({
          task,
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width
      });
  };

  const handleMouseLeave = () => {
      setHoveredTask(null);
  };

  const visibleRows: { type: 'group' | 'task', data: any, index: number }[] = [];
  data.forEach(group => {
    visibleRows.push({ type: 'group', data: group, index: visibleRows.length });
    if (!collapsedGroups.includes(group.id)) {
      group.tasks.forEach(task => {
        visibleRows.push({ type: 'task', data: task, index: visibleRows.length });
      });
      visibleRows.push({ type: 'task', data: { id: `add-${group.id}`, title: '+ Add task', isPlaceholder: true }, index: visibleRows.length });
    }
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200 text-[#172B4D] dark:text-gray-100 relative">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128]">
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors">
          <Plus size={16} strokeWidth={3} /> Add work
        </button>

        <div className="flex items-center gap-3 text-sm">
          <button className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-500 font-medium transition-colors">Today</button>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          
          <div className="relative">
              <button 
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-600 dark:text-gray-300 font-medium transition-colors"
              >
                <Layers size={16} /> Group by: {groupBy === 'sprint' ? 'Sprint' : 'Epic'} <ChevronDown size={14} />
              </button>
              {isGroupDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-xl z-50 overflow-hidden">
                      <button onClick={() => { setGroupBy('sprint'); setIsGroupDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1F2128]">Sprint</button>
                      <button onClick={() => { setGroupBy('epic'); setIsGroupDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1F2128]">Epic</button>
                  </div>
              )}
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-600 dark:text-gray-300 font-medium transition-colors">
            <Filter size={16} /> Filter
          </button>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-600 dark:text-gray-300 font-medium transition-colors">
            <ZoomIn size={16} /> Scale: Days
          </button>
        </div>
      </div>

      {/* Gantt Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        <div className="flex-1 overflow-auto relative custom-scrollbar flex" ref={scrollContainerRef}>
          
          {/* Sidebar (Fixed Left) */}
          <div className="sticky left-0 z-20 bg-white dark:bg-[#0B0C0E] border-r border-gray-200 dark:border-[#1F2128] flex-shrink-0" style={{ width: SIDEBAR_WIDTH }}>
             <div className="sticky top-0 z-30 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128] h-[60px] flex items-center px-4 shadow-sm">
                <div className="flex w-full text-xs font-bold text-gray-400 uppercase tracking-wider">
                   <div className="flex-1">Task Name</div>
                   <div className="w-28 text-center">Status</div>
                </div>
             </div>

             <div className="relative">
                {visibleRows.map((row, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center px-4 border-b border-gray-100 dark:border-[#1F2128]/50 hover:bg-gray-50 dark:hover:bg-[#1F2128]/30 transition-colors group ${row.type === 'group' ? 'bg-gray-50/50 dark:bg-[#15171E]/50' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {row.type === 'group' ? (
                      <>
                        <div className="flex-1 flex items-center gap-2 font-bold text-sm text-[#172B4D] dark:text-white cursor-pointer select-none" onClick={() => toggleGroup(row.data.id)}>
                           <div className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-transform ${!collapsedGroups.includes(row.data.id) ? 'rotate-90' : ''}`}>
                              <ChevronRight size={14} />
                           </div>
                           {row.data.title}
                        </div>
                        <div className="w-28"></div>
                      </>
                    ) : row.data.isPlaceholder ? (
                      <div className="flex-1 pl-8 text-gray-400 text-sm hover:text-indigo-600 cursor-pointer flex items-center gap-2">
                         <Plus size={14} /> Add task
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-3 pl-8 min-w-0 pr-4">
                           {row.data.isSubtask && <div className="w-3 h-px bg-gray-300 dark:bg-gray-600 mr-1 flex-shrink-0"></div>}
                           <div className={`w-2 h-2 rounded-full ${getStatusColor(row.data.columnId, 'bg')}`}></div>
                           <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.data.title}</span>
                        </div>
                        <div className="w-28 flex-shrink-0 flex justify-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getStatusBadgeStyles(row.data.columnId)}`}>
                                {COLUMNS.find(c => c.id === row.data.columnId)?.title || row.data.columnId}
                            </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
             </div>
          </div>

          {/* Timeline (Right) */}
          <div className="flex-1 min-w-[1200px] relative">
             <div className="sticky top-0 z-20 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128] h-[60px] flex">
                {dates.map((date, i) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = date.toDateString() === viewDate.toDateString();
                    return (
                      <div 
                        key={i} 
                        className={`flex-shrink-0 border-r border-gray-100 dark:border-[#1F2128] flex flex-col items-center justify-center text-xs ${isWeekend ? 'bg-gray-50/50 dark:bg-[#15171E]/50' : ''} ${isToday ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                        style={{ width: COL_WIDTH }}
                      >
                         <span className={`font-bold ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-[#172B4D] dark:text-white'}`}>{date.getDate()}</span>
                         <span className={`text-[9px] uppercase ${isToday ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400'}`}>{date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                      </div>
                   );
                })}
             </div>

             {/* Grid & Bars */}
             <div className="relative">
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                   {dates.map((d, i) => (
                      <div 
                        key={i} 
                        className={`flex-shrink-0 border-r border-gray-100 dark:border-[#1F2128]/50 h-full ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/80 dark:bg-[#15171E]/50' : ''}`}
                        style={{ width: COL_WIDTH }}
                      ></div>
                   ))}
                </div>

                {/* Today Line */}
                <div 
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-purple-500 z-10 pointer-events-none opacity-60"
                    style={{ left: (dates.findIndex(d => d.toDateString() === viewDate.toDateString()) * COL_WIDTH) + (COL_WIDTH / 2), height: visibleRows.length * ROW_HEIGHT }}
                >
                    <div className="absolute -top-1.5 -left-[5px] w-2 h-2 rounded-full bg-purple-500"></div>
                </div>

                {/* Task Bars */}
                <div className="relative z-10 py-0">
                   {visibleRows.map((row, idx) => (
                      <div key={idx} className="relative w-full border-b border-transparent" style={{ height: ROW_HEIGHT }}>
                         {row.type === 'task' && !row.data.isPlaceholder && (
                            (() => {
                               const { left, width } = calculateBarPosition(row.data.startDate, row.data.endDate);
                               const statusColorBg = getStatusColor(row.data.columnId, 'bg');
                               const statusColorBorder = getStatusColor(row.data.columnId, 'border');
                               
                               return (
                                   <div 
                                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm border ${statusColorBorder} border-opacity-50 hover:brightness-110 transition-all cursor-pointer group flex items-center`}
                                      style={{ 
                                          left, 
                                          width,
                                          backgroundColor: row.data.columnId === 'inprogress' ? 'transparent' : undefined,
                                      }}
                                      onClick={() => setSelectedTask(row.data.originalTask)}
                                      onMouseEnter={(e) => handleMouseEnter(e, row.data.originalTask, width)}
                                      onMouseLeave={handleMouseLeave}
                                   >
                                      {/* Background for "In Progress" to simulate % fill */}
                                      {row.data.columnId === 'inprogress' ? (
                                          <div className="absolute inset-0 rounded-md overflow-hidden bg-blue-100 dark:bg-blue-900/20">
                                              <div className="h-full bg-blue-500 dark:bg-blue-600 w-2/3 opacity-80"></div>
                                          </div>
                                      ) : (
                                          <div className={`absolute inset-0 rounded-md opacity-90 ${statusColorBg}`}></div>
                                      )}

                                      {/* Content Overlay */}
                                      <div className="relative z-10 px-2 flex items-center justify-between w-full">
                                          {width > 60 && <span className="text-[10px] font-bold text-white whitespace-nowrap truncate drop-shadow-sm">{row.data.title}</span>}
                                          {/* Assignee Avatar at end of bar */}
                                          {row.data.assignee && (
                                              <img 
                                                src={row.data.assignee.avatarUrl} 
                                                className="w-5 h-5 rounded-full border border-white dark:border-[#15171E] shadow-sm ml-auto"
                                                alt="Assignee" 
                                              />
                                          )}
                                      </div>
                                   </div>
                               );
                            })()
                         )}
                         {row.type === 'group' && (
                             <div className="absolute top-0 bottom-0 left-0 w-full bg-gray-50/30 dark:bg-[#15171E]/30 border-b border-gray-100 dark:border-[#1F2128]/50 pointer-events-none"></div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Task Hover Preview Card (Rich Tooltip) */}
      {hoveredTask && (
          <div 
            className="fixed z-50 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-2xl p-4 w-80 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                left: Math.min(window.innerWidth - 340, hoveredTask.x + (hoveredTask.width / 2) - 160),
                top: hoveredTask.y - 140 
            }}
          >
              <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${hoveredTask.task.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {hoveredTask.task.priority === 'HIGH' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-[#172B4D] dark:text-white leading-snug">{hoveredTask.task.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{hoveredTask.task.description ? hoveredTask.task.description.replace(/<[^>]*>/g, '') : "No description provided."}</p>
                  </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#2D2F36]">
                  <div className="flex items-center gap-2">
                      <CalendarIcon size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{hoveredTask.task.dueDate ? new Date(hoveredTask.task.dueDate).toLocaleDateString() : 'No due date'}</span>
                  </div>
                  {hoveredTask.task.assignee && (
                      <div className="flex items-center gap-2">
                          <img src={hoveredTask.task.assignee.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{hoveredTask.task.assignee.name}</span>
                      </div>
                  )}
              </div>
          </div>
      )}

      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            isOpen={!!selectedTask} 
            onClose={() => setSelectedTask(null)}
            onUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
};

export default TimelineView;
