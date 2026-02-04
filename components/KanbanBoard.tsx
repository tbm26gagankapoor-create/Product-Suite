
import React, { useState, useMemo } from 'react';
import { Plus, Search, ListFilter, MoreHorizontal, X, Trash2, AlertCircle, Circle, PlayCircle, PauseCircle, CheckCircle2, Lightbulb, Check, SignalHigh, SignalMedium, SignalLow, User, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { Task } from '../types';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import { useProjectData } from '../context/ProjectDataContext';
import { useConfig } from '../context/ConfigContext';

// Helper to get icon component by name
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || Circle;
};

interface KanbanBoardProps {
  sprintId: string;
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
  title?: string;
  projectId?: string;
}

type GroupBy = 'none' | 'priority' | 'assignee' | 'epic';

const KanbanBoard: React.FC<KanbanBoardProps> = ({ sprintId, tasks, onTaskUpdate, title = "Product roadmap", projectId }) => {
  const { tasks: allTasks, organizationUsers: users, deleteTask } = useProjectData();
  const { statuses, getStatusConfig } = useConfig();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  
  // View State
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  
  // Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // State for Task Detail Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Derive the fresh task object from props to avoid stale state in modal
  const activeTask = useMemo(() => 
    tasks.find(t => t.id === selectedTask?.id) || selectedTask,
  [tasks, selectedTask]);

  // State for Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState('todo');

  // Filter Tasks based on search and exclude Epics (Jira style)
  const filteredTasks = tasks.filter(t => 
    t.type !== 'epic' &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- Grouping Logic (Swimlanes) ---
  const swimlaneGroups = useMemo(() => {
      if (groupBy === 'none') return [{ id: 'all', title: '', tasks: filteredTasks }];

      if (groupBy === 'priority') {
          return ['HIGH', 'MEDIUM', 'LOW'].map(p => ({
              id: p,
              title: `${p.charAt(0) + p.slice(1).toLowerCase()} Priority`,
              tasks: filteredTasks.filter(t => t.priority === p)
          }));
      }

      if (groupBy === 'assignee') {
          const assignees = Array.from(new Set(filteredTasks.map(t => t.assignee?.id).filter(Boolean)));
          const groups = assignees.map(uid => {
              const user = users.find(u => u.id === uid);
              return {
                  id: uid,
                  title: user?.name || 'Unknown',
                  tasks: filteredTasks.filter(t => t.assignee?.id === uid)
              };
          });
          // Add unassigned if any
          const unassigned = filteredTasks.filter(t => !t.assignee);
          if (unassigned.length > 0) {
              groups.push({ id: 'unassigned', title: 'Unassigned', tasks: unassigned });
          }
          return groups;
      }

      if (groupBy === 'epic') {
          // Find unique parent epic IDs
          const epicIds = Array.from(new Set(filteredTasks.map(t => t.parentEpicId).filter(Boolean)));
          const groups = epicIds.map(eid => {
              const epic = allTasks.find(t => t.id === eid);
              return {
                  id: eid as string,
                  title: epic?.title || 'Unknown Epic',
                  tasks: filteredTasks.filter(t => t.parentEpicId === eid)
              };
          });
          // Tasks without epic
          const noEpic = filteredTasks.filter(t => !t.parentEpicId);
          if (noEpic.length > 0) {
              groups.push({ id: 'no-epic', title: 'Issues without Epic', tasks: noEpic });
          }
          return groups;
      }

      return [{ id: 'all', title: '', tasks: filteredTasks }];
  }, [filteredTasks, groupBy, allTasks, users]);

  // --- Drag & Drop ---

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId); // Required for Firefox and some browsers
    if (e.currentTarget instanceof HTMLElement) {
       e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
       e.currentTarget.style.opacity = '1';
    }
    setDraggingTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string, targetGroupId?: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling
    
    // Fallback if state is null (sometimes happens with rapid dnd), try getting from dataTransfer
    const droppedTaskId = draggingTaskId || e.dataTransfer.getData('text/plain');
    
    if (!droppedTaskId) return;

    const taskToMove = tasks.find(t => t.id === droppedTaskId);
    if (taskToMove) {
        // Optimistic Update Object
        const updates: Partial<Task> = { columnId: targetColumnId };
        
        // Apply grouping updates if dropping into a swimlane
        if (targetGroupId && targetGroupId !== 'all') {
            if (groupBy === 'priority') updates.priority = targetGroupId as any;
            if (groupBy === 'assignee' && targetGroupId !== 'unassigned') {
                const user = users.find(u => u.id === targetGroupId);
                if (user) updates.assignee = user;
            }
            if (groupBy === 'epic' && targetGroupId !== 'no-epic') {
                updates.parentEpicId = targetGroupId;
            }
        }

        onTaskUpdate({ ...taskToMove, ...updates });
    }
    setDraggingTaskId(null);
  };

  // --- Selection & Bulk Ops ---

  const handleToggleSelection = (id: string, multi: boolean) => {
      setSelectedTaskIds(prev => {
          const next = new Set(multi ? prev : []);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const clearSelection = () => setSelectedTaskIds(new Set());

  const handleBulkUpdate = (updates: Partial<Task>) => {
      selectedTaskIds.forEach(id => {
          const task = tasks.find(t => t.id === id);
          if (task) {
              onTaskUpdate({ ...task, ...updates });
          }
      });
      clearSelection();
  };

  const initiateDeleteTask = (task: Task) => {
      setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
      if (taskToDelete) {
          deleteTask(taskToDelete.id);
          setTaskToDelete(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Board Header */}
      <div className="flex flex-col gap-4 px-8 py-6 flex-shrink-0 bg-[#F4F5F7] dark:bg-[#0B0C0E]">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">{title}</h2>
                  <div className="h-6 w-px bg-gray-200 dark:bg-white/10"></div>
                  <span className="text-sm text-gray-500 font-medium">{filteredTasks.length} issues</span>
              </div>
              
              <div className="flex items-center gap-3">
                  {selectedTaskIds.size > 0 ? (
                      <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm animate-in fade-in">
                          <span className="text-xs font-bold">{selectedTaskIds.size} selected</span>
                          <div className="h-4 w-px bg-white/30"></div>
                          <button onClick={() => handleBulkUpdate({ columnId: 'done' })} className="text-xs hover:bg-white/20 px-2 py-1 rounded transition-colors">Complete</button>
                          <button onClick={clearSelection} className="p-1 hover:bg-white/20 rounded"><X size={14} /></button>
                      </div>
                  ) : (
                      <>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter board..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm w-64"
                            />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors shadow-sm"
                            >
                                <ListFilter size={14} /> Group: {groupBy === 'none' ? 'None' : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                            </button>
                            {isGroupDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropdownOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-xl z-50 overflow-hidden py-2">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Group By</div>
                                        {[
                                            { id: 'none', label: 'None', icon: Circle, description: 'Show all tasks together' },
                                            { id: 'priority', label: 'Priority', icon: SignalHigh, description: 'Group by High, Medium, Low' },
                                            { id: 'assignee', label: 'Assignee', icon: User, description: 'Group by team member' },
                                            { id: 'epic', label: 'Epic', icon: Layers, description: 'Group by parent epic' },
                                        ].map(option => {
                                            const OptionIcon = option.icon;
                                            const isSelected = groupBy === option.id;
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => { setGroupBy(option.id as GroupBy); setIsGroupDropdownOpen(false); }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg ${isSelected ? 'bg-blue-500/10' : 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center`}>
                                                        <OptionIcon size={16} className={isSelected ? 'text-blue-500' : 'text-gray-400'} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200">{option.label}</div>
                                                        <div className="text-[10px] text-gray-400">{option.description}</div>
                                                    </div>
                                                    {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                      </>
                  )}
              </div>
          </div>
      </div>

      {/* Board Columns (Horizontal Scroll) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6">
          <div className="flex h-full gap-4 min-w-max">
              {statuses.map((status) => {
                  const ColumnIcon = status.icon ? getIconComponentByName(status.icon) : Circle;
                  const columnTaskCount = tasks.filter(t => t.columnId === status.name).length;

                  return (
                  <div
                    key={status.name}
                    className="w-80 flex-shrink-0 flex flex-col bg-gray-100/50 dark:bg-[#1a1a1f] h-full rounded-2xl border border-gray-200/50 dark:border-white/5"
                  >
                      {/* Column Header */}
                      <div className="flex items-center justify-between sticky top-0 z-10 px-4 py-3 group">
                          <div className="flex items-center gap-2">
                              <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {status.label}
                              </h3>
                              <span className="bg-gray-200/80 dark:bg-[#2a2a30] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md text-[10px] font-bold min-w-[24px] text-center">
                                {columnTaskCount}
                              </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setCreateColumnId(status.name); setIsCreateModalOpen(true); }}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#2D2F36] rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                              >
                                  <Plus size={14} />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#2D2F36] rounded text-gray-400 transition-colors">
                                  <MoreHorizontal size={14} />
                              </button>
                          </div>
                      </div>

                      {/* Column Body / Swimlanes */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-4">
                          {swimlaneGroups.map(group => {
                              const groupTasks = group.tasks.filter(t => t.columnId === status.name);
                              
                              return (
                                  <div 
                                    key={group.id} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status.name, group.id)}
                                    className={`flex flex-col gap-3 min-h-[100px] ${groupBy !== 'none' ? 'border-b border-dashed border-gray-300 dark:border-gray-700 pb-4 mb-2' : ''}`}
                                  >
                                      {/* Swimlane Header if needed */}
                                      {groupBy !== 'none' && (
                                          <div className="text-xs font-bold text-[#172B4D] dark:text-white py-1.5 px-2 bg-gray-200/50 dark:bg-white/5 rounded-lg mb-2">
                                              {group.title}
                                          </div>
                                      )}

                                      {groupTasks.map((task) => (
                                          <div 
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className="group/card relative"
                                          >
                                              <TaskCard 
                                                  task={task} 
                                                  isSelected={selectedTaskIds.has(task.id)}
                                                  onToggleSelection={handleToggleSelection}
                                                  onClick={setSelectedTask}
                                                  onUpdate={onTaskUpdate}
                                              />
                                              {/* Quick Delete for Board */}
                                              <button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      initiateDeleteTask(task);
                                                  }}
                                                  className="absolute top-2 right-2 p-1.5 bg-white dark:bg-[#1E2028] text-gray-400 hover:text-red-500 rounded shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 border border-gray-100 dark:border-[#2D2F36]"
                                              >
                                                  <Trash2 size={12} />
                                              </button>
                                          </div>
                                      ))}
                                      
                                      {/* Ghost Card for Drop Target - Only show if dragging and NOT in this column/group */}
                                      {draggingTaskId && (
                                          <div className="h-24 rounded-xl border-2 border-dashed border-[#0052CC]/30 dark:border-blue-500/30 bg-[#DEEBFF]/30 dark:bg-blue-900/10 flex items-center justify-center text-[10px] font-bold text-[#0052CC] dark:text-blue-400 pointer-events-none animate-pulse">
                                              Drop to move
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )})}
          </div>
      </div>

      {activeTask && (
        <TaskDetailModal 
            task={activeTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={onTaskUpdate}
        />
      )}

      <CreateTaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialStatus={createColumnId}
        initialProjectId={projectId}
      />

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setTaskToDelete(null)}>
            <div className="bg-white dark:bg-[#15171E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <AlertCircle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">Delete {taskToDelete.type === 'epic' ? 'Epic' : 'Task'}?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Are you sure you want to delete <strong>{taskToDelete.title}</strong>? This action will soft-delete the item.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setTaskToDelete(null)}
                            className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteTask}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default KanbanBoard;
