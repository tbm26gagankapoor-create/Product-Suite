
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
  Zap,
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
  Paperclip
} from 'lucide-react';
import { Task, Comment } from '../types';
import { COLUMNS } from '../constants';
import { useProjectData } from '../context/ProjectDataContext';
import { aiClient } from '../lib/ai';

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
  const { sprints, projects, tasks: allTasks, users, addTask, updateTask, deleteTask, generateNextId, addComment, currentUser } = useProjectData();

  const globalTask = allTasks.find((t: Task) => t.id === task.id) || task;
  const currentProject = projects.find((p: any) => p.id === globalTask.projectId);

  const [currentTask, setCurrentTask] = useState<Task>(globalTask);
  const [descriptionBuffer, setDescriptionBuffer] = useState(globalTask.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; type: string }[]>((globalTask as any).attachments || []);

  const isEpic = currentTask.type === 'epic';
  const childTasks = allTasks.filter((t: Task) => t.parentEpicId === currentTask.id);

  useEffect(() => {
    setCurrentTask(globalTask);
    if (!isEditingDescription) {
      setDescriptionBuffer(globalTask.description || '');
    }
  }, [globalTask, isEditingDescription]);

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

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateCurrentTask({ columnId: e.target.value });
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateCurrentTask({ priority: e.target.value as 'HIGH' | 'MEDIUM' | 'LOW' });
  const handleSprintChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateCurrentTask({ sprintId: e.target.value });
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
                  <select
                    value={currentTask.columnId}
                    onChange={handleStatusChange}
                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none"
                  >
                    {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                <div className="relative">
                  <select
                    value={currentTask.priority}
                    onChange={handlePriorityChange}
                    className={`w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer appearance-none ${
                      currentTask.priority === 'HIGH' ? 'text-red-600' :
                      currentTask.priority === 'LOW' ? 'text-blue-600' : 'text-amber-600'
                    }`}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                <div className="relative">
                  <button
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1F2128] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                  >
                    {currentTask.assignee?.avatarUrl ? (
                      <img src={currentTask.assignee.avatarUrl} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User size={12} className="text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate flex-1 text-left">
                      {currentTask.assignee?.name?.split(' ')[0] || 'Unassigned'}
                    </span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {showAssigneeDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-[#1F2128] rounded-lg shadow-xl border border-gray-200 dark:border-[#2D2F36] py-1 z-20 overflow-hidden max-h-48 overflow-y-auto">
                        <button
                          onClick={() => {
                            handleUpdateCurrentTask({ assignee: undefined });
                            setShowAssigneeDropdown(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                            !currentTask.assignee ? 'bg-gray-50 dark:bg-[#2D2F36]/50' : ''
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User size={12} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Unassigned</span>
                        </button>
                        {users.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              handleUpdateCurrentTask({ assignee: user });
                              setShowAssigneeDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                              currentTask.assignee?.id === user.id ? 'bg-gray-50 dark:bg-[#2D2F36]/50' : ''
                            }`}
                          >
                            <img src={user.avatarUrl} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600" />
                            <span className="text-sm text-[#172B4D] dark:text-gray-200">{user.name}</span>
                          </button>
                        ))}
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
                {currentTask.comments?.map((comment: any) => {
                  const user = users.find((u: any) => u.id === comment.userId);
                  return (
                    <div key={comment.id} className="flex gap-4 group">
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
                })}
                {(!currentTask.comments || currentTask.comments.length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No activity yet</p>
                  </div>
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
                    <Zap size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-yellow-500" />
                    <select
                      value={currentTask.sprintId || ''}
                      onChange={handleSprintChange}
                      className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 pl-8 text-xs text-[#172B4D] dark:text-white outline-none focus:border-blue-500 shadow-sm"
                    >
                      <option value="">Backlog</option>
                      {sprints.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
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
