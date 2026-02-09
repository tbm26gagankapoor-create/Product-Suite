
import React from 'react';
import {
  X, Wand2, Plus, BarChart3, Layout, AlertCircle, ChevronRight,
  ListTodo, CheckCircle2, Clock, FileText, Target, Calendar,
  TrendingUp, Users, Briefcase, Lightbulb, Bug, Flag
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import CreateTaskModal, { CreateTaskData } from '../CreateTaskModal';
import { Task, User } from '../../types';

interface CanvasContent {
  type: 'task_form' | 'sprint_draft' | 'list_view' | 'summary' | 'epic_view' | 'none';
  data: any;
  title?: string;
}

interface CanvasPanelProps {
  canvasContent: CanvasContent;
  onClose: () => void;
  onClearCanvas: () => void;
  onTaskCreated: () => void;
  onProcessQuery: (query: string) => void;
  tasks: Task[];
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'epic': return { icon: Briefcase, color: 'text-purple-500' };
        case 'feature': return { icon: Lightbulb, color: 'text-pink-500' };
        case 'bug': return { icon: Bug, color: 'text-red-500' };
        case 'story': return { icon: FileText, color: 'text-emerald-500' };
        default: return { icon: CheckCircle2, color: 'text-blue-500' };
    }
};

export const CanvasPanel: React.FC<CanvasPanelProps> = ({
  canvasContent,
  onClose,
  onClearCanvas,
  onTaskCreated,
  onProcessQuery,
  tasks,
}) => {
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0C0E] dark:to-[#0F1015] flex flex-col relative overflow-hidden">
        {/* Canvas Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] bg-white/50 dark:bg-[#0B0C0E]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Layout size={16} />
                </div>
                <span className="font-semibold text-[#172B4D] dark:text-white text-sm">
                  {canvasContent.title || 'Canvas'}
                </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
            >
                <X size={18} />
            </button>
        </div>

        <div className="flex-1 overflow-hidden h-full flex flex-col">

            {/* Empty State */}
            {canvasContent.type === 'none' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center max-w-sm animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-purple-500/20">
                            <Wand2 size={36} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-3">Canvas Ready</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            Ask the assistant to create tasks, summarize projects, or show blockers. Results will appear here.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                              onClick={() => onProcessQuery("Create a task for implementing user authentication")}
                              className="px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2"
                            >
                              <Plus size={12} /> New Task
                            </button>
                            <button
                              onClick={() => onProcessQuery("Summarize the current project status")}
                              className="px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all flex items-center gap-2"
                            >
                              <BarChart3 size={12} /> Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Draft Form */}
            {canvasContent.type === 'task_form' && canvasContent.data && (
                <div className="flex-1 h-full animate-in slide-in-from-right-4 duration-300">
                    <CreateTaskModal
                        isOpen={true}
                        onClose={() => onClearCanvas()}
                        initialData={canvasContent.data}
                        mode="embedded"
                        onSuccess={onTaskCreated}
                    />
                </div>
            )}

            {/* List View (Blockers) */}
            {canvasContent.type === 'list_view' && canvasContent.data && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Blocked Tasks</h3>
                              <p className="text-xs text-gray-500">{canvasContent.data.length} items need attention</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {canvasContent.data.map((item: Task) => (
                                <div key={item.id} className="p-4 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl flex items-center gap-4 hover:shadow-md transition-all group cursor-pointer">
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-[#172B4D] dark:text-white text-sm truncate group-hover:text-blue-600 transition-colors">{item.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded text-gray-500">{item.id}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                              item.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                              item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>{item.priority}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary View */}
            {canvasContent.type === 'summary' && canvasContent.data && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                    <div className="max-w-2xl mx-auto">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {[
                              { label: 'Total', value: canvasContent.data.stats?.total || tasks.length, color: 'blue', icon: ListTodo },
                              { label: 'Done', value: canvasContent.data.stats?.done || tasks.filter((t: Task) => t.columnId === 'done').length, color: 'green', icon: CheckCircle2 },
                              { label: 'In Progress', value: canvasContent.data.stats?.inProgress || tasks.filter((t: Task) => t.columnId === 'in-progress').length, color: 'amber', icon: Clock },
                              { label: 'Blocked', value: canvasContent.data.stats?.blocked || tasks.filter((t: Task) => t.columnId === 'blocked').length, color: 'red', icon: AlertCircle },
                            ].map((stat, i) => (
                              <div key={i} className={`p-4 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 border border-${stat.color}-100 dark:border-${stat.color}-900/30`}>
                                <stat.icon size={16} className={`text-${stat.color}-500 mb-2`} />
                                <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
                              </div>
                            ))}
                        </div>

                        {/* Summary Text */}
                        <div className="p-5 bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] mb-6">
                            <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 flex items-center gap-2">
                              <FileText size={14} /> Summary
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                              <MarkdownRenderer content={canvasContent.data.summary || 'No summary available.'} isUser={false} />
                            </div>
                        </div>

                        {/* Recent Tasks */}
                        <div>
                            <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm">Recent Activity</h4>
                            <div className="space-y-2">
                              {(canvasContent.data.tasks || []).slice(0, 5).map((task: Task) => (
                                <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                  <div className={`w-2 h-2 rounded-full ${
                                    task.columnId === 'done' ? 'bg-green-500' :
                                    task.columnId === 'in-progress' ? 'bg-amber-500' :
                                    task.columnId === 'blocked' ? 'bg-red-500' :
                                    'bg-gray-300'
                                  }`}></div>
                                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                                  <span className="text-[10px] text-gray-400">{task.id}</span>
                                </div>
                              ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Epic View */}
            {canvasContent.type === 'epic_view' && canvasContent.data && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                    <div className="max-w-2xl mx-auto">
                        <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">{canvasContent.data.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{canvasContent.data.description}</p>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm">Tasks ({canvasContent.data.tasks?.length || 0})</h4>
                        <div className="space-y-2">
                            {(canvasContent.data.tasks || []).map((task: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-200 dark:border-[#1F2128]">
                                    <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</div>
                                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{task.title}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{task.points || 1} pts</span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                            Create Epic
                        </button>
                    </div>
                </div>
            )}

            {/* Sprint Draft View */}
            {canvasContent.type === 'sprint_draft' && canvasContent.data && (() => {
                // Parse and match tasks with actual task objects
                const taskStrings = canvasContent.data.tasks || [];
                const matchedTasks = taskStrings.map((taskStr: string) => {
                    // Try to extract task ID (e.g., "INF-123" or "DIG-47")
                    const idMatch = taskStr.match(/([A-Z]+-\d+)/);
                    if (idMatch) {
                        const taskId = idMatch[1];
                        const foundTask = tasks.find(t => t.id === taskId);
                        if (foundTask) return foundTask;
                    }
                    // Try to match by title
                    const foundByTitle = tasks.find(t => t.title.toLowerCase().includes(taskStr.toLowerCase()) || taskStr.toLowerCase().includes(t.title.toLowerCase()));
                    if (foundByTitle) return foundByTitle;
                    // Return as plain text if no match
                    return { id: taskStr, title: taskStr, type: 'task' as const, priority: 'MEDIUM' as const };
                });

                // Calculate sprint stats
                const totalPoints = matchedTasks.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
                const taskCount = matchedTasks.length;
                const tasksByType = matchedTasks.reduce((acc: Record<string, number>, t: any) => {
                    acc[t.type] = (acc[t.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const tasksByPriority = matchedTasks.reduce((acc: Record<string, number>, t: any) => {
                    acc[t.priority] = (acc[t.priority] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                // Get unique assignees
                const assigneeMap = new Map<string, User>();
                matchedTasks.forEach((t: any) => {
                    if (t.assignee && t.assignee.id) {
                        assigneeMap.set(t.assignee.id, t.assignee as User);
                    }
                });
                const uniqueAssignees: User[] = Array.from(assigneeMap.values());

                // Calculate date range (default to 2 weeks from today)
                const startDate = new Date();
                const endDate = new Date(startDate);
                const durationMatch = (canvasContent.data.duration || '2 weeks').match(/(\d+)\s*(week|day)/i);
                if (durationMatch) {
                    const value = parseInt(durationMatch[1]);
                    const unit = durationMatch[2].toLowerCase();
                    endDate.setDate(endDate.getDate() + (unit === 'week' ? value * 7 : value));
                } else {
                    endDate.setDate(endDate.getDate() + 14);
                }

                const formatDate = (date: Date) => {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                };

                return (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            {/* Sprint Header */}
                            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-900/30 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                        <Target size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">{canvasContent.data.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{canvasContent.data.goal}</p>

                                        {/* Sprint Metadata */}
                                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                                            <div className="flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-md">
                                                <Calendar size={12} />
                                                <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md">
                                                <ListTodo size={12} />
                                                <span>{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
                                            </div>
                                            {totalPoints > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-md">
                                                    <TrendingUp size={12} />
                                                    <span>{totalPoints} points</span>
                                                </div>
                                            )}
                                            {uniqueAssignees.length > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md">
                                                    <Users size={12} />
                                                    <span>{uniqueAssignees.length} {uniqueAssignees.length === 1 ? 'member' : 'members'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sprint Statistics */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {/* Task Type Breakdown */}
                                <div className="p-4 bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128]">
                                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Task Types</h5>
                                    <div className="space-y-2">
                                        {Object.entries(tasksByType).map(([type, count]) => {
                                            const { icon: Icon, color } = getTypeIcon(type);
                                            return (
                                                <div key={type} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} className={color} />
                                                        <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{type}</span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priority Breakdown */}
                                <div className="p-4 bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128]">
                                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Priority</h5>
                                    <div className="space-y-2">
                                        {Object.entries(tasksByPriority).map(([priority, count]) => {
                                            const priorityColors = {
                                                CRITICAL: 'text-red-600 dark:text-red-400',
                                                HIGH: 'text-orange-600 dark:text-orange-400',
                                                MEDIUM: 'text-yellow-600 dark:text-yellow-400',
                                                LOW: 'text-gray-600 dark:text-gray-400'
                                            };
                                            return (
                                                <div key={priority} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Flag size={14} className={priorityColors[priority as keyof typeof priorityColors] || 'text-gray-600'} />
                                                        <span className="text-xs text-gray-600 dark:text-gray-300">{priority}</span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Team Members */}
                            {uniqueAssignees.length > 0 && (
                                <div className="mb-6">
                                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Team Members</h5>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {uniqueAssignees.slice(0, 8).map((assignee, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#15171E] rounded-lg border border-gray-200 dark:border-[#1F2128]">
                                                {assignee.avatarUrl ? (
                                                    <img src={assignee.avatarUrl} alt={assignee.name} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold">
                                                        {assignee.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-700 dark:text-gray-300">{assignee.name}</span>
                                            </div>
                                        ))}
                                        {uniqueAssignees.length > 8 && (
                                            <span className="text-xs text-gray-400">+{uniqueAssignees.length - 8} more</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Planned Tasks */}
                            <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm flex items-center gap-2">
                                <ListTodo size={14} />
                                Planned Tasks ({taskCount})
                            </h4>
                            <div className="space-y-2 mb-6">
                                {matchedTasks.map((task: any, i: number) => {
                                    const { icon: Icon, color } = getTypeIcon(task.type);
                                    const isFullTask = task.columnId !== undefined;

                                    return (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-200 dark:border-[#1F2128] hover:border-green-300 dark:hover:border-green-500/50 hover:shadow-md transition-all group">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                defaultChecked
                                            />

                                            {/* Task Type Icon */}
                                            <div className={`p-1.5 rounded-lg bg-gray-50 dark:bg-[#1F2128] ${color}`}>
                                                <Icon size={14} />
                                            </div>

                                            {/* Task Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded text-gray-500">
                                                        {isFullTask ? task.id : `Task ${i + 1}`}
                                                    </span>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                                                </div>
                                                {isFullTask && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {task.priority && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                                                task.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                                                task.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                                                task.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                                                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                                {task.priority}
                                                            </span>
                                                        )}
                                                        {task.columnId && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#1F2128] text-gray-500 capitalize">
                                                                {task.columnId.replace('-', ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Points & Assignee */}
                                            <div className="flex items-center gap-2">
                                                {task.points !== undefined && task.points > 0 && (
                                                    <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-semibold">
                                                        {task.points} pts
                                                    </div>
                                                )}
                                                {task.assignee && (
                                                    <div className="relative group/avatar">
                                                        {task.assignee.avatarUrl ? (
                                                            <img
                                                                src={task.assignee.avatarUrl}
                                                                alt={task.assignee.name}
                                                                className="w-6 h-6 rounded-full border-2 border-white dark:border-[#15171E]"
                                                                title={task.assignee.name}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold border-2 border-white dark:border-[#15171E]"
                                                                title={task.assignee.name}
                                                            >
                                                                {task.assignee.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Button */}
                            <button className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2">
                                <Target size={16} />
                                Start Sprint
                            </button>
                        </div>
                    </div>
                );
            })()}

        </div>
    </div>
  );
};
