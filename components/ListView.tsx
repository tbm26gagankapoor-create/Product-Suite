
import React, { useState } from 'react';
import { COLUMNS } from '../constants';
import { Task } from '../types';
import { 
  Rocket, 
  CheckSquare, 
  Bug, 
  Bookmark,
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Calendar, 
  Plus, 
  Filter, 
  LayoutGrid, 
  Hexagon,
  MoreHorizontal
} from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import { useProjectData } from '../context/ProjectDataContext';

interface ListViewProps {
  sprintId: string;
  tasks: Task[]; // These are filtered tasks passed from parent (e.g. ProjectView)
  onTaskUpdate: (task: Task) => void;
  mode?: 'planning' | 'sprint';
  projectId?: string;
}

const ListView: React.FC<ListViewProps> = ({ sprintId, tasks, onTaskUpdate, mode = 'planning', projectId }) => {
  const { tasks: allGlobalTasks, sprints } = useProjectData(); // Needed to find children and active sprint
  
  // Initialize with all epics expanded
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(
      new Set(tasks.filter(t => t.type === 'epic').map(t => t.id))
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      active: true,
      backlog: true,
      sprint: true
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const toggleEpic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (section: string) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTaskClick = (task: Task) => {
      setSelectedTask(task);
  };

  const getIcon = (type?: string) => {
    switch(type) {
      case 'epic': return <Hexagon size={14} className="text-purple-600" fill="currentColor" fillOpacity={0.2} />;
      case 'feature': return <Rocket size={14} className="text-pink-500" />;
      case 'bug': return <Bug size={14} className="text-red-500" />;
      case 'story': return <Bookmark size={14} className="text-emerald-500" />;
      case 'task': default: return <CheckSquare size={14} className="text-blue-500" />;
    }
  };

  const getPriorityIcon = (priority?: string) => {
      switch(priority) {
          case 'HIGH': return <ArrowUp size={14} className="text-red-500" />;
          case 'LOW': return <ArrowDown size={14} className="text-blue-500" />;
          case 'MEDIUM': return <Minus size={14} className="text-amber-500" />;
          default: return <Minus size={14} className="text-gray-600 dark:text-gray-500" />;
      }
  };

  const StatusBadge = ({ status }: { status: string }) => {
      const col = COLUMNS.find(c => c.id === status);
      const label = col ? col.title : status;

      return (
          <div className="flex items-center justify-center px-[6px] py-[3px] rounded-[4px] text-[10px] font-bold uppercase tracking-wide w-full max-w-[100px] text-center bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
              {label}
          </div>
      );
  };

  const calculateProgress = (children: Task[]) => {
      if (children.length === 0) return 0;
      const doneCount = children.filter(c => c.columnId === 'done').length;
      return Math.round((doneCount / children.length) * 100);
  };

  // Structured Grid Columns
  const GRID_COLS = "grid grid-cols-[48px_100px_1fr_140px_80px_110px_160px_130px] auto-rows-[44px]";

  const Cell = ({ children, className = '', onClick, style }: any) => (
      <div 
        onClick={onClick} 
        style={style}
        className={`flex items-center h-full px-4 border-r border-gray-100 dark:border-[#2D2F36]/50 last:border-r-0 min-w-0 ${className}`}
      >
          {children}
      </div>
  );

  const renderHeader = () => (
      <div className={`${GRID_COLS} border-b border-gray-200 dark:border-[#2D2F36] bg-gray-50/90 dark:bg-[#15171E] text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm shadow-sm`}>
          <Cell className="justify-center text-center"><span className="sr-only">Expand</span></Cell>
          <Cell>Key</Cell>
          <Cell>Title</Cell>
          <Cell>Status</Cell>
          <Cell className="justify-center">Points</Cell>
          <Cell>Priority</Cell>
          <Cell>Assignee</Cell>
          <Cell className="justify-end text-right">Due Date</Cell>
      </div>
  );

  const renderSectionHeader = (title: string, count: number, sectionKey: string) => (
      <div 
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-[#1A1D26] border-y border-gray-200 dark:border-[#2D2F36] cursor-pointer hover:bg-gray-200 dark:hover:bg-[#252832] transition-colors group relative z-0 sticky left-0 right-0"
      >
          <div className={`p-0.5 rounded text-gray-500 transition-transform duration-200 ${expandedSections[sectionKey] ? 'rotate-90' : ''}`}>
              <ChevronRight size={14} />
          </div>
          <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200 uppercase tracking-widest">{title}</span>
          <span className="text-[10px] font-bold text-gray-500 bg-white dark:bg-[#0B0C0E] px-2 py-0.5 rounded-full border border-gray-200 dark:border-[#2D2F36]">{count}</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsCreateModalOpen(true); }}
                className="p-1 hover:bg-white dark:hover:bg-[#2D2F36] rounded text-gray-500"
              >
                  <Plus size={14} />
              </button>
          </div>
      </div>
  );

  const renderRow = (task: Task, depth: number = 0) => {
      const isExpanded = expandedEpics.has(task.id);
      const isEpic = task.type === 'epic';
      
      const children = allGlobalTasks.filter(t => t.parentEpicId === task.id);
      const hasChildren = children.length > 0;
      const progress = isEpic ? calculateProgress(children) : 0;

      const paddingLeft = depth > 0 ? `${depth * 24 + 16}px` : '16px';

      return (
          <React.Fragment key={task.id}>
              <div 
                  onClick={() => handleTaskClick(task)}
                  className={`
                    ${GRID_COLS} border-b border-gray-100 dark:border-[#1F2128] transition-colors cursor-pointer group relative
                    ${isEpic 
                        ? 'bg-white dark:bg-[#0F1115] hover:bg-gray-50 dark:hover:bg-[#1A1D26]' 
                        : 'bg-gray-50/30 dark:bg-[#0B0C0E] hover:bg-gray-100 dark:hover:bg-[#15171E]'
                    }
                  `}
              >
                  {/* Expand Cell */}
                  <Cell className="justify-center">
                      {isEpic && hasChildren ? (
                          <button 
                            onClick={(e) => toggleEpic(task.id, e)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2D2F36] text-gray-400 transition-colors"
                          >
                              <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                      ) : (
                          !isEpic && (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                          )
                      )}
                  </Cell>

                  {/* Key */}
                  <Cell>
                      <div className="text-[10px] text-gray-500 font-mono truncate hover:text-blue-600 transition-colors" title={task.id}>
                          {task.id}
                      </div>
                  </Cell>

                  {/* Title with Indentation */}
                  <Cell style={{ paddingLeft }} className="min-w-0">
                      <div className="flex items-center gap-3 min-w-0 w-full">
                          <div className={`flex-shrink-0 ${isEpic ? 'opacity-100' : 'opacity-70'}`}>
                              {getIcon(task.type)}
                          </div>
                          <span className={`text-sm truncate flex-1 ${isEpic ? 'font-semibold text-[#172B4D] dark:text-gray-200' : 'text-gray-700 dark:text-gray-400'} ${task.columnId === 'done' ? 'text-gray-400 line-through' : ''}`}>
                              {task.title}
                          </span>
                      </div>
                  </Cell>

                  {/* Status / Progress */}
                  <Cell>
                      {isEpic && hasChildren ? (
                          <div className="flex items-center gap-2 w-full group/progress">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{progress}%</span>
                          </div>
                      ) : (
                          <StatusBadge status={task.columnId} />
                      )}
                  </Cell>

                  {/* Points */}
                  <Cell className="justify-center">
                      {task.points !== undefined && task.points > 0 ? (
                          <span className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-[#2D2F36] rounded text-[10px] font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#3D404A]">
                              {task.points}
                          </span>
                      ) : <span className="text-gray-300">-</span>}
                  </Cell>

                  {/* Priority */}
                  <Cell>
                      <div className="flex items-center gap-1.5">
                          {getPriorityIcon(task.priority)}
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{(task.priority || 'medium').toLowerCase()}</span>
                      </div>
                  </Cell>

                  {/* Assignee */}
                  <Cell>
                      <div className="flex items-center gap-2">
                          {task.assignee ? (
                              <>
                                  <img src={task.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[90px]">{task.assignee.name.split(' ')[0]}</span>
                              </>
                          ) : (
                              <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                      </div>
                  </Cell>

                  {/* Due Date */}
                  <Cell className="justify-end">
                      {task.dueDate ? (
                          <div className={`flex items-center gap-1.5 text-xs font-mono ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                              <Calendar size={12} className="opacity-50" />
                              {new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </div>
                      ) : (
                          <span className="text-gray-300">-</span>
                      )}
                  </Cell>
              </div>

              {/* Render Children Recursively */}
              {isExpanded && children.map(child => renderRow(child, depth + 1))}
          </React.Fragment>
      );
  };

  const renderGhostRow = (label: string) => (
      <div 
        onClick={() => setIsCreateModalOpen(true)}
        className={`${GRID_COLS} hover:bg-gray-50 dark:hover:bg-[#15171E] transition-colors group cursor-pointer border-b border-transparent`}
      >
          <Cell></Cell>
          <Cell></Cell>
          <Cell>
              <div className="flex items-center gap-2 text-sm text-gray-400 italic group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  <Plus size={14} />
                  {label}
              </div>
          </Cell>
          <Cell></Cell><Cell></Cell><Cell></Cell><Cell></Cell><Cell></Cell>
      </div>
  );

  // Filter sprints by current project to ensure sprint-to-product uniqueness
  const projectSprints = projectId ? sprints.filter(s => s.projectId === projectId) : sprints;
  const activeSprint = projectSprints.find(s => s.status === 'active') || projectSprints[0];
  
  const getRootTasks = (taskList: Task[]) => {
      return taskList.filter(t => !t.parentEpicId);
  };

  const activeTasks = mode === 'sprint' ? tasks : (activeSprint ? tasks.filter(t => t.sprintId === activeSprint.id) : []);
  const backlogTasks = mode === 'sprint' ? [] : tasks.filter(t => !t.sprintId && t.columnId !== 'done');

  const activeRootTasks = getRootTasks(activeTasks);
  const backlogRootTasks = getRootTasks(backlogTasks);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-6 pb-4 flex-shrink-0 bg-[#F4F5F7] dark:bg-[#0B0C0E]">
          <div className="flex items-center gap-4">
              <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Filter by keyword..." 
                    className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-all shadow-sm w-64 placeholder-gray-400"
                  />
              </div>
              <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors shadow-sm">
                      <LayoutGrid size={14} /> Group by: None
                  </button>
              </div>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
              <Plus size={16} /> New Task
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-12">
        <div className="bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            {renderHeader()}

            {/* List Body */}
            {mode === 'sprint' ? (
                <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {activeRootTasks.length > 0 ? (
                        activeRootTasks.map(task => renderRow(task))
                    ) : (
                        <div className="py-20 text-center text-gray-400">No tasks in this sprint.</div>
                    )}
                    {activeRootTasks.length > 0 && renderGhostRow("Create task in Sprint...")}
                </div>
            ) : (
                <>
                    {/* Active Sprint Section */}
                    {activeSprint && (
                        <>
                            {renderSectionHeader(activeSprint.name, activeRootTasks.length, 'active')}
                            {expandedSections.active && (
                                <div className="border-b border-gray-200 dark:border-[#2D2F36]">
                                    {activeRootTasks.map(task => renderRow(task))}
                                    {renderGhostRow(`Create task in ${activeSprint.name}...`)}
                                </div>
                            )}
                        </>
                    )}

                    {/* Backlog Section */}
                    {backlogRootTasks.length > 0 && (
                        <>
                            {renderSectionHeader('Backlog', backlogRootTasks.length, 'backlog')}
                            {expandedSections.backlog && (
                                <div>
                                    {backlogRootTasks.map(task => renderRow(task))}
                                    {renderGhostRow("Create task in Backlog...")}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
            
            {tasks.length === 0 && mode === 'planning' && (
                <div className="py-20 text-center text-gray-400">
                    No tasks available.
                </div>
            )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            isOpen={!!selectedTask} 
            onClose={() => setSelectedTask(null)}
            onUpdate={(updated) => {
                onTaskUpdate(updated);
                setSelectedTask(updated);
            }}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialProjectId={projectId || (tasks.length > 0 ? tasks[0].projectId : undefined)}
      />
    </div>
  );
};

export default ListView;
