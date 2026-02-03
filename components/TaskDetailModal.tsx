
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckSquare,
  Flag,
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle2,
  Plus,
  ChevronDown,
  Briefcase,
  Hexagon,
  Bug,
  Rocket,
  Bookmark,
  AlignLeft,
  Clock,
  Trash2,
  AlertCircle,
  Tag,
  User,
  Image as ImageIcon,
  FileText,
  Paperclip,
  UserPlus,
  ArrowRightLeft,
  PenLine,
  ListPlus,
  CheckCircle,
  RotateCcw,
  Activity,
  Circle,
  PlayCircle,
  PauseCircle,
  Check,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  Inbox,
  IterationCw,
  Calendar,
  Link2
} from 'lucide-react';
import { Task, Comment } from '../types';
import { COLUMNS } from '../constants';
import { useProjectData } from '../context/ProjectDataContext';
import { aiClient } from '../lib/ai';
import { activityService } from '../services/activity.service';
import { tasksService, TaskLink, AvailableTask } from '../services/tasks.service';

interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  user_name?: string;
  user_avatar?: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  initialSubtaskId?: string | null;
}

const SidebarSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="space-y-3">
    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { sprints, projects, tasks: allTasks, organizationUsers: users, addTask, updateTask, deleteTask, generateNextId, addComment, currentUser } = useProjectData();

  // Safely get global task with fallbacks for missing properties
  const globalTask = task ? (allTasks.find((t: Task) => t.id === task.id) || task) : null;

  // Ensure globalTask has required properties with defaults
  const safeGlobalTask: Task = globalTask ? {
    ...globalTask,
    type: globalTask.type || 'task',
    priority: globalTask.priority || 'MEDIUM',
    columnId: globalTask.columnId || 'todo',
    tags: globalTask.tags || [],
    commentsCount: globalTask.commentsCount || 0,
  } as Task : {
    id: '',
    projectId: '',
    title: '',
    columnId: 'todo',
    type: 'task',
    priority: 'MEDIUM',
    tags: [],
    commentsCount: 0,
    assignee: { id: '', name: '', avatarUrl: '', email: '' },
    reporter: { id: '', name: '', avatarUrl: '', email: '' },
  } as Task;
  const currentProject = projects.find((p: any) => p.id === safeGlobalTask.projectId);

  const [currentTask, setCurrentTask] = useState<Task>(safeGlobalTask);
  const [descriptionBuffer, setDescriptionBuffer] = useState(safeGlobalTask.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; type: string }[]>((safeGlobalTask as any).attachments || []);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Task links (dependencies) state
  const [blockedByTasks, setBlockedByTasks] = useState<TaskLink[]>([]);
  const [blocksTasks, setBlocksTasks] = useState<TaskLink[]>([]);
  const [showBlockedByDropdown, setShowBlockedByDropdown] = useState(false);
  const [availableTasksForLinking, setAvailableTasksForLinking] = useState<AvailableTask[]>([]);
  const [blockingSearchTerm, setBlockingSearchTerm] = useState('');
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const isEpic = (currentTask.type || 'task') === 'epic';
  const childTasks = allTasks.filter((t: Task) => t.parentEpicId === currentTask.id);

  useEffect(() => {
    if (globalTask) {
      setCurrentTask({
        ...globalTask,
        type: globalTask.type || 'task',
        priority: globalTask.priority || 'MEDIUM',
        columnId: globalTask.columnId || 'todo',
        tags: globalTask.tags || [],
        commentsCount: globalTask.commentsCount || 0,
      } as Task);
      if (!isEditingDescription) {
        setDescriptionBuffer(globalTask.description || '');
      }
    }
  }, [globalTask?.id, isEditingDescription]);

  // Fetch activity logs when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchActivity = async () => {
      setIsLoadingActivity(true);
      try {
        // Use uuid (backend ID) if available, otherwise fall back to id
        const taskId = (globalTask as any)?.uuid || globalTask?.id;
        if (taskId) {
          const activities = await activityService.getForTask(taskId);
          setActivityLogs(Array.isArray(activities) ? activities : []);
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchActivity();
  }, [isOpen, globalTask?.id, (globalTask as any)?.uuid]);

  // Fetch task links when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchLinks = async () => {
      setIsLoadingLinks(true);
      try {
        const taskId = (globalTask as any)?.uuid || globalTask?.id;
        if (taskId) {
          const links = await tasksService.getTaskLinks(taskId);
          setBlockedByTasks(Array.isArray(links?.blockedBy) ? links.blockedBy : []);
          setBlocksTasks(Array.isArray(links?.blocks) ? links.blocks : []);
        }
      } catch (error) {
        console.error('Failed to fetch task links:', error);
      } finally {
        setIsLoadingLinks(false);
      }
    };

    fetchLinks();
  }, [isOpen, globalTask?.id, (globalTask as any)?.uuid]);

  if (!isOpen) return null;

  const handleUpdateCurrentTask = (updates: Partial<Task>) => {
    const updated = { ...currentTask, ...updates };
    setCurrentTask(updated);
    onUpdate(updated);
  };

  const handleConfirmDelete = () => {
    deleteTask(currentTask.id);
    onClose();
  };

  const cleanJson = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
    return cleaned;
  };

  const handleAiBuild = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const prompt = `You are an expert Project Manager. Update the task: "${aiPrompt}"
        Current Task Type: ${currentTask.type || 'task'}
        Generate JSON: { "title": "...", "description": "HTML content", "priority": "HIGH/MEDIUM/LOW", "points": number ${isEpic ? ', "subtasks": ["..."]' : ''} }`;

      const response = await aiClient.models.generateContent({
        model: 'openai/gpt-oss-120b',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      if (response.text) {
        const data = JSON.parse(cleanJson(response.text));
        handleUpdateCurrentTask({ title: data.title, priority: data.priority, points: data.points || 0 });
        setDescriptionBuffer(data.description || '');
        setIsEditingDescription(true);

        if (isEpic && data.subtasks?.length) {
          data.subtasks.forEach((title: string) => {
            addTask({
              id: generateNextId(currentTask.projectId),
              projectId: currentTask.projectId,
              title,
              columnId: 'todo',
              type: 'task',
              priority: 'MEDIUM',
              points: 0,
              assignee: currentTask.assignee,
              reporter: currentTask.reporter,
              tags: [],
              commentsCount: 0,
              parentEpicId: currentTask.id
            });
          });
        }
      }
      setAiPrompt('');
      setShowAiPanel(false);
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      userId: currentUser.id,
      text: newComment,
      timestamp: new Date().toISOString()
    };
    addComment(currentTask.id, comment);
    setNewComment('');
  };

  // Task link handlers
  const loadAvailableTasks = async () => {
    try {
      const taskId = (globalTask as any).uuid || globalTask.id;
      const tasks = await tasksService.getAvailableLinksForTask(taskId);
      setAvailableTasksForLinking(tasks);
    } catch (error) {
      console.error('Failed to load available tasks:', error);
    }
  };

  const handleAddBlockingTask = async (blockingTask: AvailableTask) => {
    const taskId = (globalTask as any).uuid || globalTask.id;
    try {
      const newLink = await tasksService.addBlockingTask(taskId, blockingTask.id);
      setBlockedByTasks(prev => [...prev, {
        ...newLink,
        blocking_task: {
          id: blockingTask.id,
          task_key: blockingTask.task_key,
          title: blockingTask.title,
          type: blockingTask.type,
          priority: blockingTask.priority,
          column_id: '',
        }
      }]);
      setShowBlockedByDropdown(false);
      setBlockingSearchTerm('');
      // Remove from available tasks
      setAvailableTasksForLinking(prev => prev.filter(t => t.id !== blockingTask.id));
    } catch (error) {
      console.error('Failed to add blocking task:', error);
    }
  };

  const handleRemoveBlockingTask = async (linkId: string) => {
    const taskId = (globalTask as any).uuid || globalTask.id;
    try {
      await tasksService.removeTaskLink(taskId, linkId);
      setBlockedByTasks(prev => prev.filter(l => l.id !== linkId));
    } catch (error) {
      console.error('Failed to remove blocking task:', error);
    }
  };

  const filteredAvailableTasks = availableTasksForLinking.filter(t => {
    if (!blockingSearchTerm) return true;
    const term = blockingSearchTerm.toLowerCase();
    return (t.title || '').toLowerCase().includes(term) || (t.task_key || '').toLowerCase().includes(term);
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateCurrentTask({ type: e.target.value as any });

  const handleAddChildTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addTask({
      id: generateNextId(currentTask.projectId),
      projectId: currentTask.projectId,
      title: newSubtaskTitle,
      columnId: 'todo',
      type: 'task',
      priority: 'MEDIUM',
      points: 0,
      assignee: currentTask.assignee,
      reporter: currentTask.reporter,
      tags: [],
      commentsCount: 0,
      parentEpicId: currentTask.id
    });
    setNewSubtaskTitle('');
  };

  const updateChildTaskStatus = (child: Task) => {
    const newStatus = child.columnId === 'done' ? 'todo' : 'done';
    updateTask({ ...child, columnId: newStatus });
  };

  const updateChildTaskDate = (child: Task, date: string) => {
    updateTask({ ...child, dueDate: date });
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const newTags = [...(currentTask.tags || []), { label: newTagInput.trim(), color: 'gray' as const }];
    handleUpdateCurrentTask({ tags: newTags });
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagLabel: string) => {
    const newTags = (currentTask.tags || []).filter(tag => tag.label !== tagLabel);
    handleUpdateCurrentTask({ tags: newTags });
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'epic': return <Hexagon size={14} className="text-purple-600" />;
      case 'bug': return <Bug size={14} className="text-red-500" />;
      case 'story': return <Bookmark size={14} className="text-green-500" />;
      case 'feature': return <Rocket size={14} className="text-pink-500" />;
      default: return <CheckSquare size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15171E] w-full max-w-[1200px] h-[90vh] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Type Selector */}
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                {getTypeIcon(currentTask.type)}
              </div>
              <select
                value={currentTask.type || 'task'}
                onChange={handleTypeChange}
                className="bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg pl-8 pr-3 py-1 text-xs font-medium text-[#172B4D] dark:text-white outline-none focus:border-blue-500 shadow-sm capitalize appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2D2F36]/80 transition-colors"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="feature">Feature</option>
                <option value="epic">Epic</option>
              </select>
            </div>

            {/* Task ID */}
            <span className="text-xs font-mono text-gray-500 bg-gray-50 dark:bg-[#1F2128] px-2 py-1 rounded border border-gray-200 dark:border-[#2D2F36]">
              {currentTask.id}
            </span>

            {/* Project */}
            {currentProject && (
              <>
                <div className="h-4 w-px bg-gray-300 dark:bg-[#2D2F36]"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Briefcase size={14} />
                  {currentProject.name}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* AI Assist Button */}
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showAiPanel ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'}`}
            >
              <Sparkles size={14} fill={showAiPanel ? "currentColor" : "none"} />
              AI Assist
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-[#2D2F36] mx-1"></div>
            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
              title="Delete Task"
            >
              <Trash2 size={18} />
            </button>
            {/* Close */}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 bg-purple-100 dark:bg-purple-800 rounded-md text-purple-600 dark:text-purple-300">
                <Wand2 size={16} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-2">Build with AI</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={isEpic ? "e.g. Detailed subtasks for mobile app MVP with user flows..." : "e.g. Write a comprehensive technical spec for this bug fix..."}
                  className="w-full bg-white dark:bg-[#0B0C0E] border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20 mb-3 placeholder:text-gray-400"
                  autoFocus
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAiBuild}
                    disabled={!aiPrompt.trim() || isAiGenerating}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content (Left) */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

            {/* Title */}
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => handleUpdateCurrentTask({ title: e.target.value })}
              className="w-full text-2xl font-bold text-[#172B4D] dark:text-white bg-transparent border-none focus:ring-0 p-0 mb-6 placeholder:text-gray-400 focus:outline-none"
              placeholder="Task Title"
            />

            {/* Primary Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 border-b border-gray-200 dark:border-[#2D2F36] pb-6">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                  >
                    {(() => {
                      const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
                        'backlog': { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
                        'todo': { icon: Circle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                        'inprogress': { icon: PlayCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                        'blocked': { icon: PauseCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
                        'done': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                      };
                      const config = statusConfig[currentTask.columnId] || statusConfig['backlog'];
                      const StatusIcon = config.icon;
                      return <StatusIcon size={16} className={config.color} />;
                    })()}
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate flex-1 text-left">
                      {COLUMNS.find(c => c.id === currentTask.columnId)?.title || 'Backlog'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showStatusDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                        {COLUMNS.map((col) => {
                          const statusConfig: Record<string, { icon: any; color: string; bg: string; description: string }> = {
                            'backlog': { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', description: 'Not yet started' },
                            'todo': { icon: Circle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', description: 'Ready to work on' },
                            'inprogress': { icon: PlayCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', description: 'Currently working' },
                            'blocked': { icon: PauseCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', description: 'Waiting on something' },
                            'done': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', description: 'Completed' },
                          };
                          const config = statusConfig[col.id] || statusConfig['backlog'];
                          const StatusIcon = config.icon;
                          const isSelected = currentTask.columnId === col.id;
                          return (
                            <button
                              key={col.id}
                              onClick={() => {
                                handleUpdateCurrentTask({ columnId: col.id });
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                                <StatusIcon size={16} className={config.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200">{col.title}</div>
                                <div className="text-[10px] text-gray-400">{config.description}</div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                <div className="relative">
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                  >
                    {(() => {
                      const priorityConfig: Record<string, { icon: any; color: string }> = {
                        'HIGH': { icon: SignalHigh, color: 'text-red-500' },
                        'MEDIUM': { icon: SignalMedium, color: 'text-amber-500' },
                        'LOW': { icon: SignalLow, color: 'text-blue-500' },
                      };
                      const config = priorityConfig[currentTask.priority] || priorityConfig['MEDIUM'];
                      const PriorityIcon = config.icon;
                      return <PriorityIcon size={16} className={config.color} />;
                    })()}
                    <span className={`text-sm font-semibold truncate flex-1 text-left ${
                      currentTask.priority === 'HIGH' ? 'text-red-600' :
                      currentTask.priority === 'LOW' ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {currentTask.priority === 'HIGH' ? 'High' : currentTask.priority === 'LOW' ? 'Low' : 'Medium'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showPriorityDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority Level</div>
                        {[
                          { value: 'HIGH', label: 'High', icon: SignalHigh, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', description: 'Critical, needs immediate attention' },
                          { value: 'MEDIUM', label: 'Medium', icon: SignalMedium, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', description: 'Important, but not urgent' },
                          { value: 'LOW', label: 'Low', icon: SignalLow, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', description: 'Can be done when time permits' },
                        ].map((priority) => {
                          const PriorityIcon = priority.icon;
                          const isSelected = currentTask.priority === priority.value;
                          return (
                            <button
                              key={priority.value}
                              onClick={() => {
                                handleUpdateCurrentTask({ priority: priority.value as 'HIGH' | 'MEDIUM' | 'LOW' });
                                setShowPriorityDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${priority.bg} flex items-center justify-center`}>
                                <PriorityIcon size={16} className={priority.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${priority.color}`}>{priority.label}</div>
                                <div className="text-[10px] text-gray-400">{priority.description}</div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                <div className="relative">
                  <button
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                  >
                    {currentTask.assignee?.avatarUrl ? (
                      <img src={currentTask.assignee.avatarUrl} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-600 shadow-sm" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Minus size={12} className="text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate flex-1 text-left">
                      {currentTask.assignee?.name || 'Unassigned'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showAssigneeDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden max-h-72 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team Members</div>

                        {/* Unassigned Option */}
                        <button
                          onClick={() => {
                            handleUpdateCurrentTask({ assignee: undefined });
                            setShowAssigneeDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                            !currentTask.assignee ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Minus size={16} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Unassigned</div>
                            <div className="text-[10px] text-gray-400">Remove assignee</div>
                          </div>
                          {!currentTask.assignee && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                        </button>

                        {/* Divider */}
                        <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />

                        {/* Team Members */}
                        {users.map((user: any) => {
                          const isSelected = currentTask.assignee?.id === user.id;
                          return (
                            <button
                              key={user.id}
                              onClick={() => {
                                handleUpdateCurrentTask({ assignee: user });
                                setShowAssigneeDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <img src={user.avatarUrl} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 object-cover" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200">{user.name}</div>
                                <div className="text-[10px] text-gray-400">{user.designation || 'Team Member'}</div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Points</label>
                <input
                  type="number"
                  value={currentTask.points || 0}
                  onChange={(e) => handleUpdateCurrentTask({ points: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-mono text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <AlignLeft size={14} /> Description
                </label>
                {!isEditingDescription && currentTask.description && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="border border-blue-500/50 dark:border-blue-500/30 rounded-xl overflow-hidden bg-white dark:bg-[#0B0C0E] shadow-sm shadow-blue-500/10">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#2D2F36]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Editing description</span>
                      {/* Image Upload Button */}
                      <label className="flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-[10px] font-medium cursor-pointer transition-colors ml-2">
                        <ImageIcon size={12} />
                        <span>Add Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              for (let i = 0; i < files.length; i++) {
                                const file = files[i];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const newAttachment = {
                                    id: `att-${Date.now()}-${i}`,
                                    name: file.name,
                                    url: event.target?.result as string,
                                    type: file.type
                                  };
                                  setAttachments((prev: { id: string; name: string; url: string; type: string }[]) => [...prev, newAttachment]);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDescriptionBuffer(currentTask.description || '');
                          setAttachments((globalTask as any).attachments || []);
                          setIsEditingDescription(false);
                        }}
                        className="px-3 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-medium rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateCurrentTask({ description: descriptionBuffer, attachments } as any);
                          setIsEditingDescription(false);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  {/* Textarea */}
                  <textarea
                    value={descriptionBuffer.replace(/<[^>]*>/g, '')}
                    onChange={(e) => setDescriptionBuffer(e.target.value)}
                    className="w-full min-h-[200px] max-h-[400px] p-4 bg-white dark:bg-[#0B0C0E] border-none text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none resize-y leading-relaxed placeholder:text-gray-400"
                    placeholder="Add a detailed description...

Tips:
• Describe the task requirements
• List acceptance criteria
• Include technical details if needed"
                    autoFocus
                  />
                  {/* Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={12} className="text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attachments ({attachments.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {attachments.map((att: { id: string; name: string; url: string; type: string }) => (
                          <div key={att.id} className="relative group">
                            {att.type.startsWith('image/') ? (
                              <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2D2F36] bg-gray-100 dark:bg-[#1F2128]">
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-[#1F2128] rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                                <FileText size={20} className="text-gray-400" />
                              </div>
                            )}
                            <button
                              onClick={() => setAttachments((prev: { id: string; name: string; url: string; type: string }[]) => prev.filter((a: { id: string }) => a.id !== att.id))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-xs"
                            >
                              <X size={10} />
                            </button>
                            <span className="absolute bottom-1 left-1 right-1 text-[8px] text-white bg-black/60 px-1 py-0.5 rounded truncate">
                              {att.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="group min-h-[120px] p-4 rounded-xl border border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 hover:border-gray-300 dark:hover:border-[#3D3F46] cursor-text transition-all text-sm text-[#172B4D] dark:text-gray-300 leading-relaxed"
                  >
                    {currentTask.description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {currentTask.description.replace(/<[^>]*>/g, '').split('\n').map((line: string, i: number) => (
                          <p key={i} className="mb-2 last:mb-0">{line || '\u00A0'}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[80px] text-gray-400">
                        <AlignLeft size={20} className="mb-2 opacity-50" />
                        <p className="text-sm">Click to add a description...</p>
                      </div>
                    )}
                  </div>

                  {/* Attachments Display (View Mode) */}
                  {attachments.length > 0 && (
                    <div className="rounded-xl border border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Paperclip size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attachments</span>
                        <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-[#2D2F36] px-1.5 py-0.5 rounded-full">{attachments.length}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {attachments.map((att: { id: string; name: string; url: string; type: string }) => (
                          <div key={att.id} className="group relative">
                            {att.type.startsWith('image/') ? (
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2D2F36] bg-gray-100 dark:bg-[#1F2128] hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                </div>
                              </a>
                            ) : (
                              <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-[#1F2128] rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                                <FileText size={24} className="text-gray-400" />
                              </div>
                            )}
                            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">{att.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>

            {/* Child Issues (for Epics) */}
            {isEpic && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={14} /> Child Issues
                  </label>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[#1F2128] px-2 py-0.5 rounded-full">{childTasks.length}</span>
                </div>

                <div className="border border-gray-200 dark:border-[#2D2F36] rounded-xl overflow-hidden bg-white dark:bg-[#15171E] shadow-sm">
                  {/* List Header */}
                  <div className="grid grid-cols-[32px_1fr_100px_100px_120px] gap-4 px-4 py-2 bg-gray-50/80 dark:bg-[#1F2128]/80 border-b border-gray-200 dark:border-[#2D2F36] text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                    <div></div>
                    <div>Title</div>
                    <div>Due Date</div>
                    <div>Status</div>
                    <div>Assignee</div>
                  </div>

                  {/* List Body */}
                  <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {childTasks.map((st: Task) => (
                      <div key={st.id} className="grid grid-cols-[32px_1fr_100px_100px_120px] gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group">
                        {/* Icon */}
                        <div className="flex justify-center text-gray-400">
                          {st.type === 'bug' ? <Bug size={14} className="text-red-500" /> :
                           st.type === 'feature' ? <Rocket size={14} className="text-pink-500" /> :
                           <CheckSquare size={14} className="text-blue-500" />}
                        </div>

                        {/* Title */}
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${st.columnId === 'done' ? 'text-gray-400 line-through' : 'text-[#172B4D] dark:text-gray-200'}`}>
                            {st.title}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono truncate">{st.id}</div>
                        </div>

                        {/* Due Date */}
                        <div>
                          <input
                            type="date"
                            value={st.dueDate || ''}
                            onChange={(e) => updateChildTaskDate(st, e.target.value)}
                            className="bg-transparent text-xs text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded px-1 py-0.5 focus:border-blue-500 focus:outline-none transition-colors w-full"
                          />
                        </div>

                        {/* Status */}
                        <div>
                          <button
                            onClick={() => updateChildTaskStatus(st)}
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase w-full transition-colors ${
                              st.columnId === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                              st.columnId === 'inprogress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                            }`}
                          >
                            {st.columnId === 'inprogress' ? 'In Progress' : st.columnId}
                          </button>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center gap-2">
                          <img src={st.assignee?.avatarUrl || currentTask.assignee?.avatarUrl} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700" />
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{st.assignee?.name || currentTask.assignee?.name?.split(' ')[0]}</span>
                        </div>
                      </div>
                    ))}

                    {/* Add Row */}
                    <form onSubmit={handleAddChildTask} className="flex items-center gap-4 px-4 py-2 bg-gray-50/30 dark:bg-[#1F2128]/30">
                      <div className="w-8 flex justify-center text-gray-400"><Plus size={16} /></div>
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Add a child issue..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 placeholder:text-gray-400 text-[#172B4D] dark:text-gray-200 focus:outline-none"
                      />
                      <button type="submit" disabled={!newSubtaskTitle.trim()} className="text-xs font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50">Add</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {isEpic && <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>}

            {/* Comments / Activity */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare size={14} /> Activity
              </label>
              <div className="flex gap-4 mb-8 mt-4">
                {currentUser && (
                  <img src={currentUser.avatarUrl} className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2D2F36]" />
                )}
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none pr-12 text-[#172B4D] dark:text-white shadow-sm"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pl-2">
                {isLoadingActivity ? (
                  <div className="text-center py-8 text-gray-400">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                    <p className="text-xs">Loading activity...</p>
                  </div>
                ) : (
                  <>
                    {/* Combine and sort activity logs and comments by timestamp */}
                    {(() => {
                      const combinedActivity: Array<{ type: 'comment' | 'activity'; data: any; timestamp: string }> = [];

                      // Add comments
                      (currentTask.comments || []).forEach((comment: any) => {
                        combinedActivity.push({
                          type: 'comment',
                          data: comment,
                          timestamp: comment.timestamp
                        });
                      });

                      // Add activity logs (ensure it's an array)
                      (Array.isArray(activityLogs) ? activityLogs : []).forEach((activity) => {
                        combinedActivity.push({
                          type: 'activity',
                          data: activity,
                          timestamp: activity.created_at
                        });
                      });

                      // Sort by timestamp descending (newest first)
                      combinedActivity.sort((a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      );

                      if (combinedActivity.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-400">
                            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No activity yet</p>
                          </div>
                        );
                      }

                      return combinedActivity.map((item) => {
                        if (item.type === 'comment') {
                          const comment = item.data;
                          const user = users.find((u: any) => u.id === comment.userId);
                          return (
                            <div key={`comment-${comment.id}`} className="flex gap-4 group">
                              <img src={user?.avatarUrl} className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#2D2F36] mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-[#172B4D] dark:text-white">{user?.name}</span>
                                  <span className="text-xs text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1F2128] p-3 rounded-r-xl rounded-bl-xl border border-gray-100 dark:border-[#2D2F36]">
                                  {comment.text}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          const activity = item.data as ActivityLog;
                          const user = users.find((u: any) => u.id === activity.user_id);

                          // Format activity action text
                          const getActionText = () => {
                            switch (activity.action) {
                              case 'created':
                                return 'created this task';
                              case 'updated':
                                if (activity.field_changed) {
                                  return `updated ${activity.field_changed}${activity.old_value && activity.new_value ? ` from "${activity.old_value}" to "${activity.new_value}"` : ''}`;
                                }
                                return 'updated this task';
                              case 'moved':
                                return `moved to ${activity.new_value || 'a new column'}`;
                              case 'assigned':
                                const assignee = users.find((u: any) => u.id === activity.new_value);
                                return `assigned to ${assignee?.name || activity.new_value || 'someone'}`;
                              case 'commented':
                                return `commented: "${activity.new_value?.substring(0, 50)}${(activity.new_value?.length || 0) > 50 ? '...' : ''}"`;
                              case 'added_to_sprint':
                                return `added to sprint`;
                              case 'removed_from_sprint':
                                return `removed from sprint`;
                              case 'added_subtask':
                                return `added subtask: ${activity.new_value}`;
                              case 'completed_subtask':
                                return `completed subtask: ${activity.new_value}`;
                              case 'reopened_subtask':
                                return `reopened subtask: ${activity.new_value}`;
                              case 'deleted_subtask':
                                return `deleted subtask`;
                              case 'deleted':
                                return 'deleted this task';
                              default:
                                return activity.action;
                            }
                          };

                          // Get icon and color based on action type
                          const getActionIcon = () => {
                            switch (activity.action) {
                              case 'created':
                                return { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
                              case 'assigned':
                                return { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' };
                              case 'moved':
                                return { icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' };
                              case 'updated':
                                return { icon: PenLine, color: 'text-amber-500', bg: 'bg-amber-500/10' };
                              case 'added_subtask':
                                return { icon: ListPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
                              case 'completed_subtask':
                                return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
                              case 'reopened_subtask':
                                return { icon: RotateCcw, color: 'text-orange-500', bg: 'bg-orange-500/10' };
                              case 'deleted':
                              case 'deleted_subtask':
                                return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' };
                              default:
                                return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10' };
                            }
                          };

                          const { icon: ActionIcon, color: iconColor, bg: iconBg } = getActionIcon();

                          return (
                            <div key={`activity-${activity.id}`} className="flex gap-3 items-start group">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] flex items-center justify-center overflow-hidden">
                                  {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                  ) : activity.user_avatar ? (
                                    <img src={activity.user_avatar} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <User size={16} className="text-gray-400" />
                                  )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${iconBg} border-2 border-white dark:border-[#15171E] flex items-center justify-center`}>
                                  <ActionIcon size={10} className={iconColor} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                                  <span className="font-semibold text-[#172B4D] dark:text-white">
                                    {user?.name || activity.user_name || 'System'}
                                  </span>
                                  {' '}
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {getActionText()}
                                  </span>
                                </p>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                                  {new Date(activity.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar (Right) */}
          <div className="w-[320px] bg-[#FAFBFC] dark:bg-[#0B0C0E] border-l border-gray-200 dark:border-[#1F2128] p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">

            {/* Context Section */}
            <SidebarSection title="Context">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Reporter</span>
                  <div className="flex items-center gap-2">
                    {currentTask.reporter?.avatarUrl ? (
                      <img src={currentTask.reporter.avatarUrl} className="w-5 h-5 rounded-full grayscale opacity-70" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600" />
                    )}
                    <span className="text-xs text-gray-500">{currentTask.reporter?.name?.split(' ')[0] || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-500">Sprint</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowSprintDropdown(!showSprintDropdown)}
                      className="w-full flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-left hover:border-blue-400 dark:hover:border-blue-500 transition-colors shadow-sm"
                    >
                      {(() => {
                        const currentSprint = sprints.find((s: any) => s.id === currentTask.sprintId);
                        if (!currentSprint) {
                          return (
                            <>
                              <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Inbox size={12} className="text-gray-400" />
                              </div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-1 truncate">Backlog</span>
                            </>
                          );
                        }
                        const statusConfig: Record<string, { color: string; bg: string }> = {
                          'active': { color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                          'planned': { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                          'completed': { color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
                        };
                        const config = statusConfig[currentSprint.status] || statusConfig['planned'];
                        return (
                          <>
                            <div className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center`}>
                              <IterationCw size={12} className={config.color} />
                            </div>
                            <span className="text-xs font-medium text-[#172B4D] dark:text-white flex-1 truncate">{currentSprint.name}</span>
                          </>
                        );
                      })()}
                      <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {showSprintDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSprintDropdown(false)} />
                        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden max-h-80 overflow-y-auto">

                          {/* Backlog Option */}
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Backlog</div>
                          <button
                            onClick={() => {
                              handleUpdateCurrentTask({ sprintId: undefined });
                              setShowSprintDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                              !currentTask.sprintId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <Inbox size={16} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Backlog</div>
                              <div className="text-[10px] text-gray-400">Not assigned to any sprint</div>
                            </div>
                            {!currentTask.sprintId && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                          </button>

                          {/* Active Sprints */}
                          {sprints.filter((s: any) => s.status === 'active').length > 0 && (
                            <>
                              <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                              <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Sprints
                              </div>
                              {sprints.filter((s: any) => s.status === 'active').map((sprint: any) => {
                                const isSelected = currentTask.sprintId === sprint.id;
                                return (
                                  <button
                                    key={sprint.id}
                                    onClick={() => {
                                      handleUpdateCurrentTask({ sprintId: sprint.id });
                                      setShowSprintDropdown(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                      <IterationCw size={16} className="text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{sprint.name}</div>
                                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Calendar size={9} />
                                        {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {/* Planned Sprints */}
                          {sprints.filter((s: any) => s.status === 'planned').length > 0 && (
                            <>
                              <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                              <div className="px-3 py-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">Planned Sprints</div>
                              {sprints.filter((s: any) => s.status === 'planned').map((sprint: any) => {
                                const isSelected = currentTask.sprintId === sprint.id;
                                return (
                                  <button
                                    key={sprint.id}
                                    onClick={() => {
                                      handleUpdateCurrentTask({ sprintId: sprint.id });
                                      setShowSprintDropdown(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                      <IterationCw size={16} className="text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{sprint.name}</div>
                                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Calendar size={9} />
                                        {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {/* Completed Sprints */}
                          {sprints.filter((s: any) => s.status === 'completed').length > 0 && (
                            <>
                              <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</div>
                              {sprints.filter((s: any) => s.status === 'completed').map((sprint: any) => {
                                const isSelected = currentTask.sprintId === sprint.id;
                                return (
                                  <button
                                    key={sprint.id}
                                    onClick={() => {
                                      handleUpdateCurrentTask({ sprintId: sprint.id });
                                      setShowSprintDropdown(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      <CheckCircle2 size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{sprint.name}</div>
                                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Calendar size={9} />
                                        {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SidebarSection>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

            {/* Dates Section */}
            <SidebarSection title="Dates">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Start Date</label>
                  <input
                    type="date"
                    value={currentTask.startDate ? new Date(currentTask.startDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleUpdateCurrentTask({ startDate: e.target.value })}
                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Flag size={12} /> Due Date</label>
                  <input
                    type="date"
                    value={currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleUpdateCurrentTask({ dueDate: e.target.value })}
                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </SidebarSection>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

            {/* Dependencies Section */}
            <SidebarSection title="Dependencies">
              <div className="space-y-4">
                {/* Blocked By Section */}
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <PauseCircle size={10} className="text-red-500" /> Blocked By
                  </label>

                  {isLoadingLinks ? (
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Loading...
                    </div>
                  ) : blockedByTasks.length === 0 ? (
                    <div className="text-xs text-gray-400">No blocking tasks</div>
                  ) : (
                    <div className="space-y-1.5">
                      {blockedByTasks.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 group">
                          <div className="flex-1 flex items-center gap-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 px-2 py-1.5 rounded-md">
                            <Link2 size={10} className="text-red-400 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-gray-500">{link.blocking_task?.task_key}</span>
                            <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate flex-1">
                              {link.blocking_task?.title}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlockingTask(link.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Blocking Task Button/Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowBlockedByDropdown(!showBlockedByDropdown);
                        if (!showBlockedByDropdown) loadAvailableTasks();
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={10} /> Add blocking task
                    </button>

                    {showBlockedByDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowBlockedByDropdown(false)} />
                        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden max-h-80">
                          {/* Search Input */}
                          <div className="px-3 pb-2">
                            <input
                              type="text"
                              placeholder="Search tasks..."
                              value={blockingSearchTerm}
                              onChange={(e) => setBlockingSearchTerm(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                              autoFocus
                            />
                          </div>

                          {/* Task List */}
                          <div className="max-h-60 overflow-y-auto">
                            {filteredAvailableTasks.length === 0 ? (
                              <div className="px-3 py-4 text-xs text-gray-400 text-center">
                                No tasks available for linking
                              </div>
                            ) : (
                              filteredAvailableTasks.map((task) => (
                                <button
                                  key={task.id}
                                  onClick={() => handleAddBlockingTask(task)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#2D2F36] text-left transition-colors"
                                >
                                  <span className="text-[10px] font-mono text-gray-400">{task.task_key}</span>
                                  <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate flex-1">
                                    {task.title}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Blocks Section (read-only display) */}
                {blocksTasks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#2D2F36]">
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle size={10} className="text-amber-500" /> Blocks
                    </label>
                    <div className="space-y-1.5">
                      {blocksTasks.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 px-2 py-1.5 rounded-md">
                          <Link2 size={10} className="text-amber-400 flex-shrink-0" />
                          <span className="text-[10px] font-mono text-gray-500">{link.blocked_task?.task_key}</span>
                          <span className="text-xs text-[#172B4D] dark:text-gray-200 truncate">
                            {link.blocked_task?.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SidebarSection>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

            {/* Metadata Section */}
            <SidebarSection title="Metadata">
              <div className="flex flex-wrap gap-2">
                {currentTask.tags?.map((tag: any) => (
                  <span
                    key={tag.label}
                    className="group inline-flex items-center gap-1 text-[10px] font-medium bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] px-2 py-1 rounded text-gray-600 dark:text-gray-300"
                  >
                    <Tag size={10} />
                    {tag.label}
                    <button
                      onClick={() => handleRemoveTag(tag.label)}
                      className="ml-0.5 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                        if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagInput('');
                        }
                      }}
                      placeholder="Tag name..."
                      className="px-2 py-1 text-[10px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded focus:outline-none focus:border-blue-500 w-20"
                      autoFocus
                    />
                    <button onClick={handleAddTag} className="text-blue-600 dark:text-blue-400 hover:text-blue-700">
                      <CheckSquare size={12} />
                    </button>
                    <button onClick={() => { setIsAddingTag(false); setNewTagInput(''); }} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingTag(true)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 px-1"
                  >
                    <Plus size={10} /> Add Tag
                  </button>
                )}
              </div>
            </SidebarSection>

            {/* Created timestamp */}
            <div className="mt-auto pt-6 text-[10px] text-gray-400 flex flex-col gap-1 border-t border-gray-100 dark:border-[#2D2F36]">
              <span>Created {new Date(currentTask.createdAt || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#15171E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">Delete {isEpic ? 'Epic' : 'Task'}?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{currentTask.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
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

export default TaskDetailModal;
