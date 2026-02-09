import React from 'react';
import {
  Check,
  Plus,
  Trash2,
  Maximize2,
  Layers,
  Target,
  FileText,
  X,
  Wand2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { GeneratedEpic, GeneratedTask, WizardStep } from './types';
import { User as UserType } from '../../types';

interface PlanningStepProps {
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward';
  generatedEpics: GeneratedEpic[];
  generatedDocs: Record<string, string>;
  users: UserType[];
  aiPromptEpicId: string | null;
  setAiPromptEpicId: (id: string | null) => void;
  aiTaskPrompt: string;
  setAiTaskPrompt: (val: string) => void;
  isGeneratingTasks: boolean;
  handleEpicChange: (id: string, field: keyof GeneratedEpic, value: string) => void;
  handleTaskChange: (epicId: string, taskId: string, field: keyof GeneratedTask, value: any) => void;
  handleDeleteTask: (epicId: string, taskId: string) => void;
  handleDeleteEpic: (epicId: string) => void;
  handleAddTask: (epicId: string) => void;
  handleAiAddTasks: (epicId: string) => void;
  handleOpenTaskDetail: (epic: GeneratedEpic, task: GeneratedTask) => void;
  setGeneratedEpics: React.Dispatch<React.SetStateAction<GeneratedEpic[]>>;
  handleStepChange: (step: WizardStep, direction: 'forward' | 'backward') => void;
  StepSummary: React.FC<{ stepName: string; onEdit: () => void; children: React.ReactNode }>;
}

const PlanningStep: React.FC<PlanningStepProps> = ({
  isTransitioning,
  transitionDirection,
  generatedEpics,
  generatedDocs,
  users,
  aiPromptEpicId,
  setAiPromptEpicId,
  aiTaskPrompt,
  setAiTaskPrompt,
  isGeneratingTasks,
  handleEpicChange,
  handleTaskChange,
  handleDeleteTask,
  handleDeleteEpic,
  handleAddTask,
  handleAiAddTasks,
  handleOpenTaskDetail,
  setGeneratedEpics,
  handleStepChange,
  StepSummary,
}) => {
  return (
    <div className={`w-full h-full overflow-y-auto p-6 ${
      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
    }`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Step Summary from Documents */}
        <StepSummary stepName="Documents" onEdit={() => handleStepChange('prd_view', 'backward')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={14} className="text-blue-500" />
              <span className="text-xs">
                {Object.keys(generatedDocs).filter(k => generatedDocs[k]).length} documents generated
              </span>
            </div>
            <div className="flex gap-1">
              {Object.keys(generatedDocs).filter(k => generatedDocs[k]).slice(0, 4).map((docId) => (
                <div key={docId} className="w-1.5 h-1.5 rounded-full bg-green-500" title={docId} />
              ))}
              {Object.keys(generatedDocs).filter(k => generatedDocs[k]).length > 4 && (
                <span className="text-[10px] text-gray-400">+{Object.keys(generatedDocs).filter(k => generatedDocs[k]).length - 4}</span>
              )}
            </div>
          </div>
        </StepSummary>

        {/* Summary Stats */}
        <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <Layers size={16} />
                    <span className="text-2xl font-bold">{generatedEpics.length}</span>
                </div>
                <span className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium">Epics</span>
            </div>
            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Check size={16} />
                    <span className="text-2xl font-bold">{generatedEpics.reduce((acc, e) => acc + e.tasks.length, 0)}</span>
                </div>
                <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Tasks</span>
            </div>
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                    <Target size={16} />
                    <span className="text-2xl font-bold">{generatedEpics.reduce((acc, e) => acc + e.tasks.reduce((a, t) => a + t.points, 0), 0)}</span>
                </div>
                <span className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Story Points</span>
            </div>
        </div>

        {/* Epics List */}
        {generatedEpics.map((epic, epicIdx) => (
            <div key={epic.id} className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden">
                {/* Epic Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F2128]/50 dark:to-[#15171E] border-b border-gray-100 dark:border-[#1F2128] flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {epicIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={epic.title}
                            onChange={(e) => handleEpicChange(epic.id, 'title', e.target.value)}
                            className="bg-transparent font-bold text-[#172B4D] dark:text-white w-full focus:outline-none text-sm"
                            placeholder="Epic Title"
                        />
                        <input
                            type="text"
                            value={epic.description}
                            onChange={(e) => handleEpicChange(epic.id, 'description', e.target.value)}
                            className="bg-transparent text-xs text-gray-500 w-full focus:outline-none mt-0.5"
                            placeholder="Epic description..."
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => { setAiPromptEpicId(epic.id); setAiTaskPrompt(''); }}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Wand2 size={12} /> AI
                        </button>
                        <button
                            onClick={() => handleAddTask(epic.id)}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Plus size={12} /> Task
                        </button>
                        <button
                            onClick={() => handleDeleteEpic(epic.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* AI Task Prompt */}
                {aiPromptEpicId === epic.id && (
                    <div className="px-5 py-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 flex gap-2 animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            value={aiTaskPrompt}
                            onChange={(e) => setAiTaskPrompt(e.target.value)}
                            placeholder="Describe tasks to generate..."
                            className="flex-1 bg-white dark:bg-[#0B0C0E] border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAiAddTasks(epic.id)}
                        />
                        <button
                            onClick={() => handleAiAddTasks(epic.id)}
                            disabled={!aiTaskPrompt.trim() || isGeneratingTasks}
                            className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            {isGeneratingTasks ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Generate
                        </button>
                        <button onClick={() => setAiPromptEpicId(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Tasks */}
                <div className="divide-y divide-gray-50 dark:divide-[#1F2128]">
                    {epic.tasks.length > 0 ? epic.tasks.map((task, taskIdx) => (
                        <div
                            key={task.id}
                            className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-[#1F2128]/30 transition-colors group"
                        >
                            <span className="text-[10px] text-gray-400 font-mono w-6">{taskIdx + 1}</span>

                            <div className="flex-1 min-w-0" onClick={() => handleOpenTaskDetail(epic, task)}>
                                <input
                                    type="text"
                                    value={task.title}
                                    onChange={(e) => { e.stopPropagation(); handleTaskChange(epic.id, task.id, 'title', e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full bg-transparent text-xs font-medium text-[#172B4D] dark:text-gray-200 focus:outline-none cursor-pointer"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={task.type}
                                    onChange={(e) => handleTaskChange(epic.id, task.id, 'type', e.target.value)}
                                    className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded px-2 py-1 border-none cursor-pointer"
                                >
                                    <option value="task">Task</option>
                                    <option value="story">Story</option>
                                    <option value="bug">Bug</option>
                                </select>

                                <select
                                    value={task.points}
                                    onChange={(e) => handleTaskChange(epic.id, task.id, 'points', parseInt(e.target.value))}
                                    className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded px-2 py-1 border-none cursor-pointer font-mono w-14"
                                >
                                    {[1,2,3,5,8,13].map(p => <option key={p} value={p}>{p} pts</option>)}
                                </select>

                                <div className="relative">
                                    <select
                                        value={task.assigneeId}
                                        onChange={(e) => handleTaskChange(epic.id, task.id, 'assigneeId', e.target.value)}
                                        className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded pl-6 pr-2 py-1 border-none cursor-pointer appearance-none w-20"
                                    >
                                        {users.length > 0 ? users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>
                                        )) : (
                                            <option value="unassigned">Unassigned</option>
                                        )}
                                    </select>
                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {users.find(u => u.id === task.assigneeId) ? (
                                            <img src={users.find(u => u.id === task.assigneeId)?.avatarUrl} className="w-3.5 h-3.5 rounded-full" alt="" />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full bg-gray-300" />
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenTaskDetail(epic, task)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    <Maximize2 size={12} />
                                </button>

                                <button
                                    onClick={() => handleDeleteTask(epic.id, task.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="py-6 text-center text-xs text-gray-400">
                            No tasks yet. Add manually or use AI to generate.
                        </div>
                    )}
                </div>
            </div>
        ))}

        {/* Add Epic Button */}
        <button
            onClick={() => {
                setGeneratedEpics(prev => [...prev, {
                    id: `epic-${Date.now()}`,
                    title: 'New Epic',
                    description: '',
                    tasks: []
                }]);
            }}
            className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-[#2D2F36] rounded-xl text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all font-bold text-xs flex items-center justify-center gap-2"
        >
            <Plus size={14} /> Add Epic
        </button>
      </div>
    </div>
  );
};

export default PlanningStep;
