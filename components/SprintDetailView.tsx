
import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  CheckCircle,
  Layout,
  List as ListIcon,
  Clock,
  CheckSquare,
  Users,
  CalendarRange,
  Pencil,
  X,
  AlertTriangle,
  Rocket
} from 'lucide-react';
import { Task } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { activityService } from '../services/activity.service';
import { sprintsService } from '../services/sprints.service';
import KanbanBoard from './KanbanBoard';
import ListView from './ListView';
import TimelineView from './TimelineView';
import SprintGoalsTracker from './SprintGoalsTracker';
import SprintRetrospectiveModal from './SprintRetrospectiveModal';

interface SprintDetailViewProps {
  sprintId: string;
  onBack: () => void;
}

const SprintDetailView: React.FC<SprintDetailViewProps> = ({ sprintId, onBack }) => {
  const { sprints, tasks, updateTask, updateSprint, startSprint, organizationMembers, projects, refreshData } = useProjectData();
  const users = organizationMembers.map(m => m.user);
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'timeline'>('board');

  // Edit Sprint Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', startDate: '', endDate: '', goal: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Complete Sprint Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [carryOverOption, setCarryOverOption] = useState<'backlog' | 'nextSprint'>('backlog');
  const [selectedCarryOverSprintId, setSelectedCarryOverSprintId] = useState<string>('');

  // Start Sprint state
  const [isStarting, setIsStarting] = useState(false);

  // Retrospective Modal state
  const [showRetroModal, setShowRetroModal] = useState(false);

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

  // Open Edit Sprint Modal
  const handleOpenEditModal = () => {
    setEditForm({
      name: sprint.name,
      startDate: sprint.startDate.split('T')[0],
      endDate: sprint.endDate.split('T')[0],
      goal: sprint.goal || ''
    });
    setShowEditModal(true);
  };

  // Save Sprint Edit with Activity Logging
  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const changes: { field: string; oldValue: string; newValue: string }[] = [];

      // Track what changed
      if (editForm.name !== sprint.name) {
        changes.push({ field: 'name', oldValue: sprint.name, newValue: editForm.name });
      }
      if (editForm.startDate !== sprint.startDate.split('T')[0]) {
        changes.push({ field: 'startDate', oldValue: sprint.startDate, newValue: editForm.startDate });
      }
      if (editForm.endDate !== sprint.endDate.split('T')[0]) {
        changes.push({ field: 'endDate', oldValue: sprint.endDate, newValue: editForm.endDate });
      }
      if (editForm.goal !== (sprint.goal || '')) {
        changes.push({ field: 'goal', oldValue: sprint.goal || '', newValue: editForm.goal });
      }

      if (changes.length === 0) {
        setShowEditModal(false);
        return;
      }

      // Update sprint via API
      await sprintsService.update(sprint.id, {
        name: editForm.name,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        goal: editForm.goal
      });

      // Update local state
      updateSprint({
        ...sprint,
        name: editForm.name,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        goal: editForm.goal
      });

      // Log activity for each changed field
      for (const change of changes) {
        await activityService.log({
          entityType: 'sprint',
          entityId: sprint.id,
          action: 'updated',
          fieldChanged: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue
        });
      }

      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update sprint:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get incomplete tasks count for confirmation modal
  const incompleteTasks = sprintTasks.filter(t => t.columnId !== 'done');

  // Get available sprints for carry-over (planned sprints in the same project, excluding current)
  const availableCarryOverSprints = sprints.filter(
    s => s.projectId === sprint?.projectId && s.id !== sprintId && s.status === 'planned'
  );

  // Handle Complete Sprint
  const handleCompleteSprint = async () => {
    setIsCompleting(true);
    try {
      // Handle incomplete tasks based on carry-over option
      if (carryOverOption === 'backlog') {
        // Move incomplete tasks to backlog (remove sprint assignment)
        for (const task of incompleteTasks) {
          await updateTask({ ...task, sprintId: undefined });
        }
      } else if (carryOverOption === 'nextSprint' && selectedCarryOverSprintId) {
        // Move incomplete tasks to the selected sprint
        for (const task of incompleteTasks) {
          await updateTask({ ...task, sprintId: selectedCarryOverSprintId });
        }
      }

      // Complete the sprint via API
      await sprintsService.completeSprint(sprint.id);

      // Update local state
      updateSprint({ ...sprint, status: 'completed' });

      // Log activity
      await activityService.log({
        entityType: 'sprint',
        entityId: sprint.id,
        action: 'updated',
        fieldChanged: 'status',
        oldValue: sprint.status,
        newValue: 'completed'
      });

      setShowCompleteModal(false);
      // Reset carry-over state
      setCarryOverOption('backlog');
      setSelectedCarryOverSprintId('');

      // Refresh data to sync state
      await refreshData();
    } catch (error) {
      console.error('Failed to complete sprint:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle Start Sprint (for planned sprints)
  const handleStartSprint = async () => {
    setIsStarting(true);
    try {
      await startSprint(sprint.id);

      // Log activity
      await activityService.log({
        entityType: 'sprint',
        entityId: sprint.id,
        action: 'updated',
        fieldChanged: 'status',
        oldValue: 'planned',
        newValue: 'active'
      });

      // Refresh data to sync state
      await refreshData();
    } catch (error) {
      console.error('Failed to start sprint:', error);
    } finally {
      setIsStarting(false);
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
                    {sprint.status === 'planned' && (
                        <button
                            onClick={handleStartSprint}
                            disabled={isStarting}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Rocket size={14} />
                            {isStarting ? 'Starting...' : 'Start Sprint'}
                        </button>
                    )}
                    <button
                        onClick={handleOpenEditModal}
                        className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors flex items-center gap-2"
                    >
                        <Pencil size={14} />
                        Edit Sprint
                    </button>
                    <button className="px-4 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors">
                        Sprint Reports
                    </button>
                    {sprint.status === 'completed' && (
                        <button
                            onClick={() => setShowRetroModal(true)}
                            className="px-4 py-2 border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-sm font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                        >
                            Retrospective
                        </button>
                    )}
                    {sprint.status !== 'completed' && (
                        <button
                            onClick={() => setShowCompleteModal(true)}
                            className="px-4 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                        >
                            Complete Sprint
                        </button>
                    )}
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

        {/* Sprint Goals Tracker */}
        {sprint.goal && (
            <SprintGoalsTracker sprintId={sprint.id} goalText={sprint.goal} />
        )}

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

      {/* Edit Sprint Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-[#1F2128] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2D2F36]">
              <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit Sprint</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sprint Goal
                </label>
                <textarea
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2D2F36] rounded-lg bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="What do you want to achieve in this sprint?"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-[#2D2F36]">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Sprint Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-[#1F2128] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2D2F36]">
              <h2 className="text-lg font-bold text-[#172B4D] dark:text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                Complete Sprint
              </h2>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to complete <span className="font-semibold text-[#172B4D] dark:text-white">{sprint.name}</span>?
              </p>

              {incompleteTasks.length > 0 && (
                <div className="space-y-4">
                  {/* Carry-over options */}
                  <div className="bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      What should happen to {incompleteTasks.length} incomplete task{incompleteTasks.length !== 1 ? 's' : ''}?
                    </p>
                    <div className="space-y-3">
                      {/* Backlog option */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="carryOver"
                          value="backlog"
                          checked={carryOverOption === 'backlog'}
                          onChange={() => setCarryOverOption('backlog')}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Move to backlog</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tasks will be unassigned from any sprint</p>
                        </div>
                      </label>

                      {/* Carry to next sprint option */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="carryOver"
                          value="nextSprint"
                          checked={carryOverOption === 'nextSprint'}
                          onChange={() => setCarryOverOption('nextSprint')}
                          disabled={availableCarryOverSprints.length === 0}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${availableCarryOverSprints.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                            Carry over to next sprint
                          </span>
                          {availableCarryOverSprints.length === 0 ? (
                            <p className="text-xs text-gray-400 mt-0.5">No planned sprints available</p>
                          ) : (
                            <select
                              value={selectedCarryOverSprintId}
                              onChange={(e) => setSelectedCarryOverSprintId(e.target.value)}
                              disabled={carryOverOption !== 'nextSprint'}
                              className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2D2F36] rounded-lg bg-white dark:bg-[#15171E] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="">Select a sprint...</option>
                              {availableCarryOverSprints.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Incomplete tasks list */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Incomplete Tasks</p>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-[#2D2F36] rounded-lg divide-y divide-gray-100 dark:divide-[#2D2F36]">
                      {incompleteTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="px-3 py-2 text-sm">
                          <span className="font-mono text-xs text-gray-500 mr-2">{task.id}</span>
                          <span className="text-gray-700 dark:text-gray-300">{task.title}</span>
                        </div>
                      ))}
                      {incompleteTasks.length > 5 && (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          ...and {incompleteTasks.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {incompleteTasks.length === 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      All tasks are completed! Great work!
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-[#2D2F36]">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSprint}
                disabled={isCompleting || (carryOverOption === 'nextSprint' && !selectedCarryOverSprintId && incompleteTasks.length > 0)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCompleting ? 'Completing...' : 'Complete Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retrospective Modal */}
      <SprintRetrospectiveModal
        isOpen={showRetroModal}
        onClose={() => setShowRetroModal(false)}
        sprintId={sprint.id}
        sprintName={sprint.name}
        users={users}
      />

    </div>
  );
};

export default SprintDetailView;
