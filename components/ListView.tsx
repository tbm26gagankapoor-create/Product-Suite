
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Task, Priority } from '../types';
import {
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Minus,
  Calendar,
  Plus,
  Filter,
  LayoutGrid,
  X,
  UserPlus
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import BulkActionToolbar from './BulkActionToolbar';
import { useProjectData } from '../context/ProjectDataContext';
import { useConfig } from '../context/ConfigContext';

// Helper to get icon component by name
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || CheckSquare;
};

interface ListViewProps {
  sprintId: string;
  tasks: Task[]; // These are filtered tasks passed from parent (e.g. ProjectView)
  onTaskUpdate: (task: Task) => void;
  mode?: 'planning' | 'sprint';
  projectId?: string;
}

const ListView: React.FC<ListViewProps> = ({ sprintId, tasks, onTaskUpdate, mode = 'planning', projectId }) => {
  const { tasks: allGlobalTasks, sprints, users, updateTask, deleteTask } = useProjectData();
  const { getTaskTypeConfig, getPriorityConfig, getStatusConfig, statuses, priorities } = useConfig();

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

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: 'status' | 'date' | 'assignee' | 'priority' } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setEditingCell(null);
    if (editingCell) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [editingCell]);

  // Get all visible task IDs (for select all functionality)
  const getVisibleTaskIds = useCallback((): string[] => {
    const visibleIds: string[] = [];
    const collectTaskIds = (taskList: Task[]) => {
      taskList.forEach(task => {
        visibleIds.push(task.id);
        if (task.type === 'epic' && expandedEpics.has(task.id)) {
          const children = allGlobalTasks.filter(t => t.parentEpicId === task.id);
          children.forEach(child => visibleIds.push(child.id));
        }
      });
    };

    if (mode === 'sprint') {
      collectTaskIds(getRootTasks(tasks));
    } else {
      if (expandedSections.active) {
        const activeSprint = projectSprints.find(s => s.status === 'active') || projectSprints[0];
        if (activeSprint) {
          collectTaskIds(getRootTasks(tasks.filter(t => t.sprintId === activeSprint.id)));
        }
      }
      if (expandedSections.backlog) {
        collectTaskIds(getRootTasks(tasks.filter(t => !t.sprintId && t.columnId !== 'done')));
      }
    }
    return visibleIds;
  }, [tasks, expandedEpics, expandedSections, mode, allGlobalTasks]);

  // Selection handlers
  const toggleTaskSelection = useCallback((taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (event.shiftKey && lastSelectedIdRef.current) {
      // Shift-click: range selection
      const visibleIds = getVisibleTaskIds();
      const lastIndex = visibleIds.indexOf(lastSelectedIdRef.current);
      const currentIndex = visibleIds.indexOf(taskId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = visibleIds.slice(start, end + 1);

        setSelectedTaskIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      }
    } else {
      // Normal click or Ctrl/Cmd click: toggle individual
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        return next;
      });
      lastSelectedIdRef.current = taskId;
    }
  }, [getVisibleTaskIds]);

  const toggleSelectAll = useCallback(() => {
    const visibleIds = getVisibleTaskIds();
    const allSelected = visibleIds.every(id => selectedTaskIds.has(id));

    if (allSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(visibleIds));
    }
  }, [getVisibleTaskIds, selectedTaskIds]);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // Bulk action handlers
  const handleBulkStatusChange = useCallback(async (status: string) => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    await Promise.all(selectedTasks.map(task =>
      updateTask({ ...task, columnId: status })
    ));
    clearSelection();
  }, [selectedTaskIds, tasks, updateTask, clearSelection]);

  const handleBulkAssigneeChange = useCallback(async (assigneeId: string) => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    const assignee = users.find(u => u.id === assigneeId);
    if (!assignee) return;

    await Promise.all(selectedTasks.map(task =>
      updateTask({ ...task, assignee })
    ));
    clearSelection();
  }, [selectedTaskIds, tasks, users, updateTask, clearSelection]);

  const handleBulkPriorityChange = useCallback(async (priority: Priority) => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    await Promise.all(selectedTasks.map(task =>
      updateTask({ ...task, priority })
    ));
    clearSelection();
  }, [selectedTaskIds, tasks, updateTask, clearSelection]);

  const handleBulkSprintChange = useCallback(async (sprintId: string | null) => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    await Promise.all(selectedTasks.map(task =>
      updateTask({ ...task, sprintId: sprintId || undefined })
    ));
    clearSelection();
  }, [selectedTaskIds, tasks, updateTask, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTaskIds.size} task(s)?`)) return;

    const selectedTasksList = tasks.filter(t => selectedTaskIds.has(t.id));
    await Promise.all(selectedTasksList.map(task =>
      deleteTask(task.uuid || task.id)
    ));
    clearSelection();
  }, [selectedTaskIds, tasks, deleteTask, clearSelection]);

  // Get selected tasks for toolbar
  const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));

  // Filter sprints by current project - moved here before getVisibleTaskIds uses it
  const projectSprints = projectId ? sprints.filter(s => s.projectId === projectId) : sprints;

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
    const config = getTaskTypeConfig(type || 'task');
    if (config) {
      const IconComponent = getIconComponentByName(config.icon);
      return <IconComponent size={14} className={config.color} />;
    }
    return <CheckSquare size={14} className="text-blue-500" />;
  };

  const getPriorityIcon = (priority?: string) => {
    const config = getPriorityConfig(priority || 'MEDIUM');
    if (config) {
      const IconComponent = getIconComponentByName(config.icon);
      return <IconComponent size={14} className={config.color} />;
    }
    return <Minus size={14} className="text-gray-600 dark:text-gray-500" />;
  };

  const calculateProgress = (children: Task[]) => {
      if (children.length === 0) return 0;
      const doneCount = children.filter(c => c.columnId === 'done').length;
      return Math.round((doneCount / children.length) * 100);
  };

  // Structured Grid Columns - includes checkbox column
  const GRID_COLS = "grid grid-cols-[40px_48px_100px_1fr_140px_80px_110px_160px_130px] auto-rows-[44px]";

  const Cell = ({ children, className = '', onClick, style }: any) => (
      <div 
        onClick={onClick} 
        style={style}
        className={`flex items-center h-full px-4 border-r border-gray-100 dark:border-[#2D2F36]/50 last:border-r-0 min-w-0 ${className}`}
      >
          {children}
      </div>
  );

  const renderHeader = () => {
    const visibleIds = getVisibleTaskIds();
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedTaskIds.has(id));
    const someSelected = visibleIds.some(id => selectedTaskIds.has(id));

    return (
      <div className={`${GRID_COLS} border-b border-gray-200 dark:border-[#2D2F36] bg-gray-50/90 dark:bg-[#15171E] text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm shadow-sm`}>
          {/* Select All Checkbox */}
          <Cell className="justify-center">
            <button
              onClick={toggleSelectAll}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-colors"
              title={allSelected ? "Deselect all" : "Select all"}
            >
              {allSelected ? (
                <CheckSquare size={16} className="text-blue-500" />
              ) : someSelected ? (
                <div className="relative">
                  <Square size={16} className="text-gray-400" />
                  <Minus size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                </div>
              ) : (
                <Square size={16} className="text-gray-400" />
              )}
            </button>
          </Cell>
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
  };

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
      const isSelected = selectedTaskIds.has(task.id);

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
                    ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-l-2 border-l-blue-500'
                        : isEpic
                            ? 'bg-white dark:bg-[#0F1115] hover:bg-gray-50 dark:hover:bg-[#1A1D26]'
                            : 'bg-gray-50/30 dark:bg-[#0B0C0E] hover:bg-gray-100 dark:hover:bg-[#15171E]'
                    }
                  `}
              >
                  {/* Checkbox Cell */}
                  <Cell className="justify-center">
                    <button
                      onClick={(e) => toggleTaskSelection(task.id, e)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-colors"
                      title={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-blue-500" />
                      ) : (
                        <Square size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      )}
                    </button>
                  </Cell>

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

                  {/* Status / Progress - Inline Editable */}
                  <Cell>
                      {isEpic && hasChildren ? (
                          <div className="flex items-center gap-2 w-full group/progress">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{progress}%</span>
                          </div>
                      ) : (
                          <div className="relative w-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell(editingCell?.taskId === task.id && editingCell?.field === 'status' ? null : { taskId: task.id, field: 'status' });
                              }}
                              className="flex items-center justify-between gap-1 px-[6px] py-[3px] rounded-[4px] text-[10px] font-bold uppercase tracking-wide w-full max-w-[120px] bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3D404A] transition-colors"
                            >
                              <span className="truncate">{getStatusConfig(task.columnId)?.label || task.columnId}</span>
                              <ChevronDown size={12} className="flex-shrink-0 opacity-50" />
                            </button>
                            {editingCell?.taskId === task.id && editingCell?.field === 'status' && (
                              <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-[#1F2128] rounded-lg shadow-xl border border-gray-200 dark:border-[#2D2F36] z-50 py-1 overflow-hidden">
                                {statuses.map((status) => (
                                  <button
                                    key={status.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateTask({ ...task, columnId: status.name });
                                      setEditingCell(null);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors ${task.columnId === status.name ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {status.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
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

                  {/* Priority - Inline Editable */}
                  <Cell>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell(editingCell?.taskId === task.id && editingCell?.field === 'priority' ? null : { taskId: task.id, field: 'priority' });
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                        >
                          {getPriorityIcon(task.priority)}
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{(task.priority || 'medium').toLowerCase()}</span>
                          <ChevronDown size={10} className="opacity-50" />
                        </button>
                        {editingCell?.taskId === task.id && editingCell?.field === 'priority' && (
                          <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-[#1F2128] rounded-lg shadow-xl border border-gray-200 dark:border-[#2D2F36] z-50 py-1 overflow-hidden">
                            {priorities.map((p) => (
                              <button
                                key={p.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTask({ ...task, priority: p.name as Priority });
                                  setEditingCell(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors flex items-center gap-2 ${task.priority === p.name ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${p.name === 'HIGH' ? 'bg-red-500' : p.name === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                <span className={p.name === 'HIGH' ? 'text-red-600 dark:text-red-400' : p.name === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                                  {p.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                  </Cell>

                  {/* Assignee - Inline Editable */}
                  <Cell>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell(editingCell?.taskId === task.id && editingCell?.field === 'assignee' ? null : { taskId: task.id, field: 'assignee' });
                          }}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                        >
                          {task.assignee ? (
                            <>
                              <img src={task.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700" />
                              <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[70px]">{task.assignee.name.split(' ')[0]}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} className="text-gray-400" />
                              <span className="text-xs text-gray-400 italic">Assign</span>
                            </>
                          )}
                          <ChevronDown size={10} className="opacity-50 flex-shrink-0" />
                        </button>
                        {editingCell?.taskId === task.id && editingCell?.field === 'assignee' && (
                          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#1F2128] rounded-lg shadow-xl border border-gray-200 dark:border-[#2D2F36] z-50 py-1 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTask({ ...task, assignee: undefined as any });
                                setEditingCell(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                            >
                              Unassigned
                            </button>
                            <div className="h-px bg-gray-200 dark:bg-[#2D2F36] my-1" />
                            {users.map((user) => (
                              <button
                                key={user.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTask({ ...task, assignee: user });
                                  setEditingCell(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors flex items-center gap-2 ${task.assignee?.id === user.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                              >
                                <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                <span className="text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                  </Cell>

                  {/* Due Date - Inline Editable */}
                  <Cell className="justify-end">
                      <div className="relative">
                        {editingCell?.taskId === task.id && editingCell?.field === 'date' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newDate = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                                updateTask({ ...task, dueDate: newDate });
                                setEditingCell(null);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="w-28 px-2 py-1 text-xs bg-white dark:bg-[#1F2128] border border-blue-500 rounded text-gray-700 dark:text-gray-300 focus:outline-none"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTask({ ...task, dueDate: undefined });
                                setEditingCell(null);
                              }}
                              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                              title="Clear date"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCell({ taskId: task.id, field: 'date' });
                            }}
                            className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors ${task.dueDate && new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                          >
                            <Calendar size={12} className="opacity-50" />
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : <span className="text-gray-300 italic">Set date</span>}
                          </button>
                        )}
                      </div>
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

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedTasks={selectedTasks}
        onClearSelection={clearSelection}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkAssigneeChange={handleBulkAssigneeChange}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkSprintChange={handleBulkSprintChange}
        onBulkDelete={handleBulkDelete}
        sprints={projectSprints}
        users={users}
      />
    </div>
  );
};

export default ListView;
