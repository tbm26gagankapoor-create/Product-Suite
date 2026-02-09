
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  MessageSquare,
  ChevronDown,
  Check,
  Minus,
  Circle,
  SignalMedium,
  Loader2,
  User,
  Plus,
  UserPlus,
  ArrowRightLeft,
  PenLine,
  ListPlus,
  CheckCircle,
  RotateCcw,
  Activity,
  Trash2,
} from 'lucide-react';
import { Task, Comment } from '../../types';
import { useProjectData } from '../../context/ProjectDataContext';
import { useConfig } from '../../context/ConfigContext';
import * as LucideIcons from 'lucide-react';
import { aiClient } from '../../lib/ai';
import { activityService } from '../../services/activity.service';
import { tasksService, TaskLink, AvailableTask } from '../../services/tasks.service';

import TaskHeader from './TaskHeader';
import DescriptionSection from './DescriptionSection';
import SubtasksSection from './SubtasksSection';
import PropertySidebar from './PropertySidebar';
import DependenciesSection from './DependenciesSection';

// Helper to get icon class from config
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || LucideIcons.Circle;
};

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

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { sprints, projects, tasks: allTasks, organizationMembers, addTask, updateTask, deleteTask, generateNextId, addComment, currentUser } = useProjectData();
  const users = organizationMembers.map(m => m.user);
  const { taskTypes, priorities, statuses, getTaskTypeConfig, getPriorityConfig, getStatusConfig } = useConfig();

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

  // Get task permissions (from API response)
  const permissions = currentTask.permissions || {
    canEdit: true,
    canComment: true,
    canChangeStatus: true,
    canDelete: true,
    isReporter: false,
    isAssignee: false,
  };

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

  // Activity helpers for inline rendering
  const getActionText = (activity: ActivityLog) => {
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

  const getActionIcon = (action: string) => {
    switch (action) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15171E] w-full max-w-[1200px] h-[90vh] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">

        <TaskHeader
          currentTask={currentTask}
          currentProject={currentProject}
          permissions={permissions}
          taskTypes={taskTypes}
          getTaskTypeConfig={getTaskTypeConfig}
          showAiPanel={showAiPanel}
          setShowAiPanel={setShowAiPanel}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onTypeChange={handleTypeChange}
          onClose={onClose}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          isAiGenerating={isAiGenerating}
          isEpic={isEpic}
          onAiBuild={handleAiBuild}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content (Left) */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

            {/* Title */}
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => permissions.canEdit && handleUpdateCurrentTask({ title: e.target.value })}
              readOnly={!permissions.canEdit}
              className={`w-full text-2xl font-bold text-[#172B4D] dark:text-white bg-transparent border-none focus:ring-0 p-0 mb-6 placeholder:text-gray-400 focus:outline-none ${!permissions.canEdit ? 'cursor-default' : ''}`}
              placeholder="Task Title"
            />

            {/* Primary Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 border-b border-gray-200 dark:border-[#2D2F36] pb-6">
              {/* Status - can change if user has canChangeStatus permission */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <div className="relative">
                  <button
                    onClick={() => permissions.canChangeStatus && setShowStatusDropdown(!showStatusDropdown)}
                    disabled={!permissions.canChangeStatus}
                    className={`w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg transition-colors ${permissions.canChangeStatus ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36]' : 'cursor-default opacity-75'}`}
                  >
                    {(() => {
                      const config = getStatusConfig(currentTask.columnId);
                      const StatusIcon = config?.icon ? getIconComponentByName(config.icon) : Circle;
                      return <StatusIcon size={16} className={config?.color || 'text-gray-500'} />;
                    })()}
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate flex-1 text-left">
                      {getStatusConfig(currentTask.columnId)?.label || 'Backlog'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showStatusDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                        {statuses.map((status) => {
                          const StatusIcon = status.icon ? getIconComponentByName(status.icon) : Circle;
                          const isSelected = currentTask.columnId === status.name;
                          return (
                            <button
                              key={status.name}
                              onClick={() => {
                                handleUpdateCurrentTask({ columnId: status.name });
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${status.bg_color || 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center`}>
                                <StatusIcon size={16} className={status.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200">{status.label}</div>
                                <div className="text-[10px] text-gray-400">{status.is_done_state ? 'Completed' : 'In progress'}</div>
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

              {/* Priority - requires edit permission */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                <div className="relative">
                  <button
                    onClick={() => permissions.canEdit && setShowPriorityDropdown(!showPriorityDropdown)}
                    disabled={!permissions.canEdit}
                    className={`w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg transition-colors ${permissions.canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36]' : 'cursor-default opacity-75'}`}
                  >
                    {(() => {
                      const config = getPriorityConfig(currentTask.priority);
                      const PriorityIcon = config?.icon ? getIconComponentByName(config.icon) : SignalMedium;
                      return <PriorityIcon size={16} className={config?.color || 'text-amber-500'} />;
                    })()}
                    <span className={`text-sm font-semibold truncate flex-1 text-left ${getPriorityConfig(currentTask.priority)?.color || 'text-amber-600'}`}>
                      {getPriorityConfig(currentTask.priority)?.label || 'Medium'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showPriorityDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority Level</div>
                        {priorities.map((priority) => {
                          const PriorityIcon = priority.icon ? getIconComponentByName(priority.icon) : SignalMedium;
                          const isSelected = currentTask.priority === priority.name;
                          return (
                            <button
                              key={priority.name}
                              onClick={() => {
                                handleUpdateCurrentTask({ priority: priority.name as 'HIGH' | 'MEDIUM' | 'LOW' });
                                setShowPriorityDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${priority.bg_color} flex items-center justify-center`}>
                                <PriorityIcon size={16} className={priority.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${priority.color}`}>{priority.label}</div>
                                <div className="text-[10px] text-gray-400">{priority.name === 'HIGH' ? 'Critical, needs immediate attention' : priority.name === 'LOW' ? 'Can be done when time permits' : 'Important, but not urgent'}</div>
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

              {/* Assigned To - requires edit permission */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                <div className="relative">
                  <button
                    onClick={() => permissions.canEdit && setShowAssigneeDropdown(!showAssigneeDropdown)}
                    disabled={!permissions.canEdit}
                    className={`w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg transition-colors ${permissions.canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36]' : 'cursor-default opacity-75'}`}
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

              {/* Points - requires edit permission */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Points</label>
                <input
                  type="number"
                  value={currentTask.points || 0}
                  onChange={(e) => permissions.canEdit && handleUpdateCurrentTask({ points: parseInt(e.target.value) || 0 })}
                  readOnly={!permissions.canEdit}
                  className={`w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-mono text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none ${!permissions.canEdit ? 'cursor-default opacity-75' : ''}`}
                />
              </div>
            </div>

            {/* Description */}
            <DescriptionSection
              currentTask={currentTask}
              permissions={permissions}
              descriptionBuffer={descriptionBuffer}
              setDescriptionBuffer={setDescriptionBuffer}
              isEditingDescription={isEditingDescription}
              setIsEditingDescription={setIsEditingDescription}
              attachments={attachments}
              setAttachments={setAttachments}
              globalTask={globalTask}
              onUpdateCurrentTask={handleUpdateCurrentTask}
            />

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>

            {/* Child Issues (for Epics) */}
            {isEpic && (
              <SubtasksSection
                childTasks={childTasks}
                currentTask={currentTask}
                getTaskTypeConfig={getTaskTypeConfig}
                newSubtaskTitle={newSubtaskTitle}
                setNewSubtaskTitle={setNewSubtaskTitle}
                onAddChildTask={handleAddChildTask}
                onUpdateChildTaskStatus={updateChildTaskStatus}
                onUpdateChildTaskDate={updateChildTaskDate}
              />
            )}

            {isEpic && <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>}

            {/* Comments / Activity */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare size={14} /> Activity
              </label>
              {permissions.canComment && (
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
                        <LucideIcons.Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

                          const { icon: ActionIcon, color: iconColor, bg: iconBg } = getActionIcon(activity.action);

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
                                    {getActionText(activity)}
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
            <PropertySidebar
              currentTask={currentTask}
              permissions={permissions}
              sprints={sprints}
              users={users}
              showSprintDropdown={showSprintDropdown}
              setShowSprintDropdown={setShowSprintDropdown}
              isAddingTag={isAddingTag}
              setIsAddingTag={setIsAddingTag}
              newTagInput={newTagInput}
              setNewTagInput={setNewTagInput}
              onUpdateCurrentTask={handleUpdateCurrentTask}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              dependenciesSection={
                <DependenciesSection
                  permissions={permissions}
                  blockedByTasks={blockedByTasks}
                  blocksTasks={blocksTasks}
                  isLoadingLinks={isLoadingLinks}
                  showBlockedByDropdown={showBlockedByDropdown}
                  setShowBlockedByDropdown={setShowBlockedByDropdown}
                  blockingSearchTerm={blockingSearchTerm}
                  setBlockingSearchTerm={setBlockingSearchTerm}
                  filteredAvailableTasks={filteredAvailableTasks}
                  onLoadAvailableTasks={loadAvailableTasks}
                  onAddBlockingTask={handleAddBlockingTask}
                  onRemoveBlockingTask={handleRemoveBlockingTask}
                />
              }
            />
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
