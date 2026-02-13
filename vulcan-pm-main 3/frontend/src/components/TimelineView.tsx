
import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Filter,
  ChevronRight,
  ChevronDown,
  Layers,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  ArrowUp
} from 'lucide-react';
import { Task, User } from '../types';
import { COLUMNS } from '../constants';
import TaskDetailModal from './TaskDetailModal';
import { useProjectData } from '../context/ProjectDataContext';

// Import new timeline components
import TimelineHeader from './timeline/TimelineHeader';
import GradientTaskBar from './timeline/GradientTaskBar';
import TodayIndicator from './timeline/TodayIndicator';
import {
  TimeScale,
  TIMELINE_CONSTANTS,
  getColWidth,
  generateDateRange,
  isWeekend,
  getTodayIndex,
  TASK_GRADIENTS
} from '../utils/timelineUtils';

interface GanttTask {
  id: string;
  title: string;
  columnId: string;
  startDate: string;
  endDate: string;
  assignee?: User;
  dependencies?: string[];
  originalTask?: Task;
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

const ROW_HEIGHT = TIMELINE_CONSTANTS.ROW_HEIGHT;
const SIDEBAR_WIDTH = TIMELINE_CONSTANTS.SIDEBAR_WIDTH;

const getValidDate = (dateStr?: string, defaultOffset = 0): string => {
    if (dateStr) return new Date(dateStr).toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() + defaultOffset);
    return d.toISOString().split('T')[0];
};

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskUpdate }) => {
  const { sprints } = useProjectData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scale State
  const [scale, setScale] = useState<TimeScale>('day');
  const colWidth = getColWidth(scale);

  // Grouping State
  const [groupBy, setGroupBy] = useState<'sprint' | 'epic'>('sprint');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState(false);

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
          const features = tasks.filter(t => t.type === 'feature' || t.type === 'epic');
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

  // Generate Date Range for the View based on scale
  const dates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const count = scale === 'day' ? 30 : scale === 'week' ? 12 : 6;
    return generateDateRange(start, scale, count);
  }, [scale]);

  const todayIndex = getTodayIndex(dates);

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

  const getStatusDotColor = (columnId: string) => {
    const gradient = TASK_GRADIENTS[columnId] || TASK_GRADIENTS.todo;
    return gradient.from;
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
      left: startOffsetDays * colWidth,
      width: durationDays * colWidth
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

  const scaleLabels: Record<TimeScale, string> = {
    day: 'Days',
    week: 'Weeks',
    month: 'Months'
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200 text-[#172B4D] dark:text-gray-100 relative">

      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128]">
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all">
          <Plus size={16} strokeWidth={3} /> Add work
        </button>

        <div className="flex items-center gap-3 text-sm">
          <button className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-500 font-medium transition-colors">Today</button>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>

          {/* Group By Dropdown */}
          <div className="relative">
              <button
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-600 dark:text-gray-300 font-medium transition-colors"
              >
                <Layers size={16} /> Group: {groupBy === 'sprint' ? 'Sprint' : 'Epic'} <ChevronDown size={14} />
              </button>
              {isGroupDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-xl z-50 overflow-hidden">
                      <button onClick={() => { setGroupBy('sprint'); setIsGroupDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1F2128] ${groupBy === 'sprint' ? 'bg-gray-50 dark:bg-[#1F2128]' : ''}`}>Sprint</button>
                      <button onClick={() => { setGroupBy('epic'); setIsGroupDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1F2128] ${groupBy === 'epic' ? 'bg-gray-50 dark:bg-[#1F2128]' : ''}`}>Epic</button>
                  </div>
              )}
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-md text-gray-600 dark:text-gray-300 font-medium transition-colors">
            <Filter size={16} /> Filter
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>

          {/* Scale Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1F2128] rounded-lg p-1">
            {(['day', 'week', 'month'] as TimeScale[]).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  scale === s
                    ? 'bg-white dark:bg-[#2D2F36] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {scaleLabels[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">

        <div className="flex-1 overflow-auto relative custom-scrollbar flex" ref={scrollContainerRef}>

          {/* Sidebar (Fixed Left) */}
          <div className="sticky left-0 z-20 bg-white dark:bg-[#0B0C0E] border-r border-gray-200 dark:border-[#1F2128] flex-shrink-0" style={{ width: SIDEBAR_WIDTH }}>
             {/* Sidebar Header - matches timeline header height */}
             <div className="sticky top-0 z-30 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128] flex flex-col justify-end shadow-sm" style={{ height: scale === 'day' ? 76 : 60 }}>
                <div className="flex w-full text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pb-2">
                   <div className="flex-1">Task Name</div>
                   <div className="w-24 text-center">Status</div>
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
                           <div className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-transform duration-200 ${!collapsedGroups.includes(row.data.id) ? 'rotate-90' : ''}`}>
                              <ChevronRight size={14} />
                           </div>
                           {row.data.title}
                           <span className="text-[10px] font-normal text-gray-400 ml-1">({row.data.tasks.length})</span>
                        </div>
                        <div className="w-24"></div>
                      </>
                    ) : row.data.isPlaceholder ? (
                      <div className="flex-1 pl-8 text-gray-400 text-sm hover:text-indigo-600 cursor-pointer flex items-center gap-2 transition-colors">
                         <Plus size={14} /> Add task
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-3 pl-6 min-w-0 pr-4">
                           {row.data.isSubtask && <div className="w-3 h-px bg-gray-300 dark:bg-gray-600 mr-1 flex-shrink-0"></div>}
                           <div
                             className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                             style={{ backgroundColor: getStatusDotColor(row.data.columnId) }}
                           />
                           <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.data.title}</span>
                           {row.data.originalTask?.priority === 'HIGH' && (
                             <ArrowUp size={12} className="text-red-500 flex-shrink-0" />
                           )}
                        </div>
                        <div className="w-24 flex-shrink-0 flex justify-center">
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
             {/* Timeline Header */}
             <TimelineHeader dates={dates} colWidth={colWidth} scale={scale} />

             {/* Grid & Bars */}
             <div className="relative">
                {/* Vertical Grid Lines with Weekend Shading */}
                <div className="absolute inset-0 flex pointer-events-none">
                   {dates.map((d, i) => {
                      const weekend = isWeekend(d);
                      return (
                        <div
                          key={i}
                          className={`flex-shrink-0 border-r border-gray-100 dark:border-[#1F2128]/50 h-full transition-colors ${weekend ? 'bg-gray-100/80 dark:bg-[#15171E]/70' : ''}`}
                          style={{ width: colWidth, height: visibleRows.length * ROW_HEIGHT }}
                        />
                      );
                   })}
                </div>

                {/* Today Indicator */}
                {todayIndex !== null && (
                  <TodayIndicator
                    leftPosition={(todayIndex * colWidth) + (colWidth / 2)}
                    height={visibleRows.length * ROW_HEIGHT + 40}
                    showLabel={true}
                  />
                )}

                {/* Task Bars */}
                <div className="relative z-10 py-0">
                   {visibleRows.map((row, idx) => (
                      <div key={idx} className="relative w-full border-b border-transparent" style={{ height: ROW_HEIGHT }}>
                         {row.type === 'task' && !row.data.isPlaceholder && (
                            (() => {
                               const { left, width } = calculateBarPosition(row.data.startDate, row.data.endDate);

                               return (
                                 <GradientTaskBar
                                   task={row.data}
                                   left={left}
                                   width={width}
                                   onClick={() => setSelectedTask(row.data.originalTask)}
                                   onMouseEnter={(e) => handleMouseEnter(e, row.data.originalTask, width)}
                                   onMouseLeave={handleMouseLeave}
                                 />
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
                  <div className={`p-2 rounded-lg ${hoveredTask.task.priority === 'HIGH' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                      {hoveredTask.task.priority === 'HIGH' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[#172B4D] dark:text-white leading-snug">{hoveredTask.task.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{hoveredTask.task.description ? hoveredTask.task.description.replace(/<[^>]*>/g, '') : "No description provided."}</p>
                  </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#2D2F36]">
                  <div className="flex items-center gap-2">
                      <CalendarIcon size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{hoveredTask.task.dueDate ? new Date(hoveredTask.task.dueDate).toLocaleDateString() : 'No due date'}</span>
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
