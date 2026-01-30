
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  MoreHorizontal, 
  Layout, 
  List as ListIcon,
  BarChart2, 
  Clock,
  CheckSquare,
  Users,
  CalendarRange
} from 'lucide-react';
import { Sprint, Task } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import KanbanBoard from './KanbanBoard';
import ListView from './ListView';
import TimelineView from './TimelineView';

interface SprintDetailViewProps {
  sprintId: string;
  onBack: () => void;
}

const SprintDetailView: React.FC<SprintDetailViewProps> = ({ sprintId, onBack }) => {
  const { sprints, tasks, updateTask, updateSprint, users, projects } = useProjectData();
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'timeline'>('board');

  const sprint = sprints.find(s => s.id === sprintId);
  const sprintTasks = tasks.filter(t => t.sprintId === sprintId);
  const project = projects.find(p => p.id === sprint?.projectId);

  if (!sprint) return <div>Sprint not found</div>;

  // Stats
  const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const completedTasks = sprintTasks.filter(t => t.columnId === 'done');
  const completedPoints = completedTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
  
  // Calculate Days Remaining
  const endDate = new Date(sprint.endDate);
  const today = new Date();
  const diffTime = Math.max(0, endDate.getTime() - today.getTime());
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Unique Assignees
  const uniqueAssigneeIds = Array.from(new Set(sprintTasks.map(t => t.assignee?.id).filter(Boolean)));

  const handleTaskUpdate = (updatedTask: Task) => {
    updateTask(updatedTask);

    // Auto-complete sprint when all tasks are done
    if (sprint.status !== 'completed') {
      // Get updated task list (replace the old task with updated one)
      const updatedTaskList = sprintTasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      );

      const allTasksDone = updatedTaskList.length > 0 &&
        updatedTaskList.every(t => t.columnId === 'done');

      if (allTasksDone) {
        updateSprint({ ...sprint, status: 'completed' });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200 animate-in fade-in slide-in-from-right-4">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6">
        <div className="mb-4">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 dark:hover:text-white transition-colors mb-4 font-medium"
            >
                <ArrowLeft size={16} /> Back to Planning
            </button>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-2 flex items-center gap-3">
                        {sprint.name}
                        <span className={`text-sm px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                            sprint.status === 'active' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                            sprint.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}>
                            {sprint.status}
                        </span>
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        {project && (
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] shadow-sm hover:shadow-md transition-shadow`}>
                                <div className={`w-4 h-4 rounded-lg bg-gradient-to-br ${project.color || 'from-blue-500 to-blue-600'} flex items-center justify-center shadow-sm`}>
                                    <span className="text-[8px] font-bold text-white">{project.key?.charAt(0) || 'P'}</span>
                                </div>
                                <span className="text-gray-700 dark:text-gray-200">{project.name}</span>
                                {project.key && <span className="text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-[#2D2F36] px-1.5 py-0.5 rounded">{project.key}</span>}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36]">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-600 dark:text-gray-300">{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</span>
                        </span>
                        {sprint.goal && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-xs font-medium italic">
                                "{sprint.goal}"
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors">
                        Sprint Reports
                    </button>
                    <button className="px-4 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                        Complete Sprint
                    </button>
                </div>
            </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-4 gap-6 mt-6">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Timeline</span>
                    <Clock size={16} className="text-blue-500" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{daysRemaining} <span className="text-sm font-medium text-gray-400">days left</span></div>
                </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</span>
                    <TrendingUp size={16} className="text-green-500" />
                </div>
                <div>
                    <div className="flex items-end justify-between mb-1">
                        <span className="text-2xl font-bold text-[#172B4D] dark:text-white">{progress}%</span>
                        <span className="text-xs text-gray-500 mb-1">{completedPoints} / {totalPoints} pts</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scope</span>
                    <CheckSquare size={16} className="text-purple-500" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{sprintTasks.length} <span className="text-sm font-medium text-gray-400">tasks</span></div>
                    <div className="text-xs text-gray-500 mt-1">{completedTasks.length} completed</div>
                </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team</span>
                    <Users size={16} className="text-orange-500" />
                </div>
                <div className="flex items-center -space-x-2 mt-1">
                    {uniqueAssigneeIds.length > 0 ? (
                        uniqueAssigneeIds.map(uid => {
                            const user = users.find(u => u.id === uid);
                            if (!user) return null;
                            return (
                                <img 
                                    key={uid} 
                                    src={user.avatarUrl} 
                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1F2128] object-cover" 
                                    alt={user.name} 
                                    title={user.name}
                                />
                            );
                        })
                    ) : (
                        <span className="text-sm text-gray-400 italic">No assignees</span>
                    )}
                    {uniqueAssigneeIds.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2D2F36] border-2 border-white dark:border-[#1F2128] flex items-center justify-center text-xs font-bold text-gray-600">
                            +{uniqueAssigneeIds.length - 4}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-6 mt-8 border-b border-gray-200 dark:border-[#1F2128]">
            <button 
                onClick={() => setActiveTab('board')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === 'board' ? 'text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Layout size={16} /> Board
                {activeTab === 'board' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('list')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === 'list' ? 'text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <ListIcon size={16} /> List
                {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === 'timeline' ? 'text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <CalendarRange size={16} /> Timeline
                {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-white rounded-t-full"></div>}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
          {activeTab === 'board' ? (
              <KanbanBoard 
                sprintId={sprint.id} 
                tasks={sprintTasks} 
                onTaskUpdate={handleTaskUpdate} 
                title={`${sprint.name} Board`}
              />
          ) : activeTab === 'list' ? (
              <ListView 
                sprintId={sprint.id} 
                tasks={sprintTasks} 
                onTaskUpdate={handleTaskUpdate} 
                mode="sprint"
              />
          ) : (
              <TimelineView 
                tasks={sprintTasks} 
                onTaskUpdate={handleTaskUpdate} 
              />
          )}
      </div>

    </div>
  );
};

export default SprintDetailView;
