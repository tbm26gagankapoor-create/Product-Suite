
import React, { useState } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  ChevronDown,
  Calendar,
  Layout,
  Target,
  ArrowRight
} from 'lucide-react';
import { Task, Sprint } from '../types';
import SprintModal from './SprintModal';
import SprintDetailView from './SprintDetailView';
import { useProjectData } from '../context/ProjectDataContext';

interface PlanningViewProps {
    projectId: string;
}

const PlanningView: React.FC<PlanningViewProps> = ({ projectId }) => {
  // --- Context ---
  const { sprints, tasks, addSprint, addTask, updateTask, generateNextId, currentUser, users } = useProjectData();

  // --- State ---
  const [activeTab, setActiveTab] = useState<'Ongoing' | 'Upcoming' | 'Completed'>('Ongoing');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [backlogInput, setBacklogInput] = useState('');
  
  // Drill-down State
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // --- Derived Data ---
  const projectSprints = sprints.filter(s => s.projectId === projectId);
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const backlogTasks = projectTasks.filter(t => !t.sprintId && t.columnId !== 'done');
  
  // Filter sprints based on tab
  const visibleSprints = projectSprints.filter(s => {
      if (activeTab === 'Ongoing') return s.status === 'active';
      if (activeTab === 'Upcoming') return s.status === 'planned';
      return s.status === 'completed';
  });

  // --- Actions ---

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const taskToUpdate = tasks.find(t => t.id === draggingTaskId);
    if (taskToUpdate) {
        updateTask({ ...taskToUpdate, sprintId: targetSprintId || undefined }); 
    }
    setDraggingTaskId(null);
  };

  const handleCreateTask = (title: string, sprintId?: string) => {
      if (!title.trim()) return;
      const user = currentUser || users[0];
      
      const newTask: Task = {
          id: generateNextId(projectId, 'task'),
          projectId: projectId,
          title: title,
          columnId: 'todo',
          type: 'task',
          priority: 'MEDIUM',
          points: 0,
          assignee: user,
          reporter: user, 
          tags: [],
          commentsCount: 0,
          sprintId: sprintId
      };
      addTask(newTask);
      if (!sprintId) {
          setBacklogInput('');
      }
  };

  const handleSprintSubmit = (data: { name: string; startDate: string; endDate: string; goal: string; projectId?: string }) => {
      const newSprint: Sprint = {
          id: `s-${Date.now()}`,
          projectId: projectId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          goal: data.goal,
          status: 'planned'
      };
      addSprint(newSprint);
      setActiveTab('Upcoming');
  };

  const renderTaskCard = (task: Task) => (
      <div 
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className="group bg-white dark:bg-[#1C1E26] p-3 rounded-md border border-gray-200 dark:border-[#2D2F36] shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 mb-2"
      >
          <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 dark:bg-[#2D2F36] border border-gray-200 dark:border-[#3D404A] flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
              {task.points || '-'}
          </div>
          <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{task.title}</div>
          </div>
          <div className="flex-shrink-0">
              <img src={task.assignee.avatarUrl} alt={task.assignee.name} className="w-6 h-6 rounded-full border border-gray-100 dark:border-[#2D2F36]" title={task.assignee.name} />
          </div>
      </div>
  );

  // If a sprint is selected, show detail view
  if (selectedSprintId) {
      return <SprintDetailView sprintId={selectedSprintId} onBack={() => setSelectedSprintId(null)} />;
  }

  return (
    <div className="flex h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] overflow-hidden">
      
      {/* 1. FIXED LEFT PANEL - BACKLOG */}
      <div 
        className="w-[340px] flex-shrink-0 flex flex-col bg-white dark:bg-[#15171E] border-r border-gray-200 dark:border-[#1F2128]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)} // Drop to null = Backlog
      >
          {/* Backlog Header */}
          <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#172B4D] dark:text-white">Backlog</h2>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded-full">
                      {backlogTasks.length} tasks
                  </span>
              </div>
              
              {/* Create Task Input */}
              <div className="relative group mb-6">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Create task" 
                    value={backlogInput}
                    onChange={(e) => setBacklogInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(backlogInput)}
                    className="w-full bg-transparent border-none text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:ring-0 pl-9 py-2 hover:bg-gray-50 dark:hover:bg-[#1F2128] rounded-md transition-colors"
                  />
              </div>
          </div>

          {/* Backlog List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 bg-gray-50/30 dark:bg-[#0B0C0E]/10 pt-2">
              {backlogTasks.length > 0 ? (
                  <div className="space-y-1">
                      {backlogTasks.map(renderTaskCard)}
                  </div>
              ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-[#2D2F36] rounded-xl">
                      <p className="text-sm text-gray-400">Backlog is empty</p>
                  </div>
              )}
          </div>
      </div>

      {/* 2. RIGHT AREA - SPRINTS */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F5F7] dark:bg-[#0B0C0E]">
          
          {/* Header Area */}
          <div className="px-8 py-6 pb-0 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Sprints</h1>
                  <button 
                    onClick={() => setIsSprintModalOpen(true)}
                    className="bg-[#172B4D] dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                      <Plus size={16} /> New Sprint
                  </button>
              </div>
              
              {/* Tabs */}
              <div className="flex items-center gap-8 border-b border-gray-200 dark:border-[#1F2128]">
                  {['Ongoing', 'Upcoming', 'Completed'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 text-sm font-bold transition-all relative ${
                            activeTab === tab 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                          {tab}
                          {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                      </button>
                  ))}
              </div>
          </div>

          {/* Sprints Horizontal Scroll Container */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 flex items-start gap-6">
              
              {visibleSprints.map(sprint => {
                  const sprintTasks = projectTasks.filter(t => t.sprintId === sprint.id);
                  const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.points || 0), 0);
                  
                  return (
                      <div 
                        key={sprint.id}
                        className="w-[360px] flex-shrink-0 flex flex-col max-h-full bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, sprint.id)}
                      >
                          {/* Sprint Header */}
                          <div className="p-4 bg-white dark:bg-[#15171E] border-b border-gray-100 dark:border-[#1F2128] relative">
                              {sprint.status === 'active' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-green-500"></div>}

                              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 mt-1">
                                  <span className="font-medium flex items-center gap-1.5">
                                      <Calendar size={12} />
                                      {new Date(sprint.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {new Date(sprint.endDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                  </span>
                                  {sprint.status === 'active' && (
                                      <span className="text-green-600 bg-green-100 dark:bg-green-500/10 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide">Active</span>
                                  )}
                              </div>

                              <div className="flex items-center justify-between mb-2">
                                  <h3 
                                    className="font-bold text-lg text-[#172B4D] dark:text-white truncate pr-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    onClick={() => setSelectedSprintId(sprint.id)}
                                    title="View Sprint Details"
                                  >
                                      {sprint.name}
                                  </h3>
                                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400 font-bold whitespace-nowrap">
                                      <span>{totalPoints} pts</span>
                                  </div>
                              </div>
                              {sprint.goal && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">"{sprint.goal}"</p>
                              )}
                              
                              <button 
                                onClick={() => setSelectedSprintId(sprint.id)}
                                className="w-full mt-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1"
                              >
                                View Dashboard <ArrowRight size={12} />
                              </button>
                          </div>

                          {/* Task List */}
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gray-50/50 dark:bg-[#0B0C0E]/30 min-h-[150px]">
                              <div className="space-y-1">
                                  {sprintTasks.map(renderTaskCard)}
                                  {sprintTasks.length === 0 && (
                                      <div className="h-32 border-2 border-dashed border-gray-200 dark:border-[#2D2F36] rounded-lg flex flex-col items-center justify-center text-xs text-gray-400">
                                          <span>Plan your sprint</span>
                                          <span className="opacity-50 mt-1">Drag tasks here</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })}

              {visibleSprints.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 w-full text-gray-400">
                      <Layout size={48} className="mb-4 opacity-20" />
                      <p>No {activeTab.toLowerCase()} sprints found.</p>
                      {activeTab !== 'Completed' && (
                          <button onClick={() => setIsSprintModalOpen(true)} className="mt-4 text-blue-600 hover:underline text-sm">Create one now</button>
                      )}
                  </div>
              )}

              {activeTab === 'Upcoming' && visibleSprints.length > 0 && (
                  <button 
                    onClick={() => setIsSprintModalOpen(true)}
                    className="w-[300px] flex-shrink-0 flex flex-col h-[200px] bg-transparent hover:bg-white dark:hover:bg-[#15171E] rounded-xl border-2 border-dashed border-gray-300 dark:border-[#2D2F36] items-center justify-center text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all group"
                  >
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1F2128] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 flex items-center justify-center mb-3 transition-colors">
                        <Plus size={24} />
                      </div>
                      <span className="font-bold text-sm">Create New Sprint</span>
                  </button>
              )}

          </div>
      </div>

      <SprintModal 
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSubmit={handleSprintSubmit}
        nextSprintNumber={projectSprints.length + 1}
      />

    </div>
  );
};

export default PlanningView;
