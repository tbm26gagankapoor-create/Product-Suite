
import React, { useState } from 'react';
import {
  Clock,
  AlertCircle,
  Search,
  Layout,
  Layers,
  Calendar,
  List,
  LayoutGrid
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import ListView from './ListView';
import KanbanBoard from './KanbanBoard';

interface MyTasksViewProps {
  onProjectSelect?: (projectId: string) => void;
}

const MyTasksView: React.FC<MyTasksViewProps> = ({ onProjectSelect }) => {
  const { myTasks: allMyTasks, updateTask, currentUser } = useProjectData();
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'completed' | 'overdue' | 'today'>('incomplete');
  const [groupBy, setGroupBy] = useState<'none' | 'stage' | 'date'>('stage');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Please log in to view your tasks.</div>;
  }

  // Group tasks by date logic for filtering
  const getTaskGroupByDate = (task: { columnId: string; dueDate?: string }) => {
    if (task.columnId === 'done') return 'Completed';
    if (!task.dueDate) return 'No Date';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) return 'Overdue';
    if (dueDate.getTime() === today.getTime()) return 'Today';
    return 'Upcoming';
  };

  // Filter tasks based on search and filter selection
  const filteredTasks = allMyTasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Status filter
    const dateGroup = getTaskGroupByDate(task);
    if (filter === 'incomplete' && dateGroup === 'Completed') return false;
    if (filter === 'completed' && dateGroup !== 'Completed') return false;
    if (filter === 'overdue' && dateGroup !== 'Overdue') return false;
    if (filter === 'today' && dateGroup !== 'Today') return false;

    return true;
  });

  // Calculate stats for widgets
  // Epics are not tasks - they contain tasks. Always exclude epics from counting.
  const tasksOnly = allMyTasks.filter(t => t.type !== 'epic');

  const openTasksCount = tasksOnly.filter(t => t.columnId !== 'done').length;
  const overdueCount = tasksOnly.filter(t => getTaskGroupByDate(t) === 'Overdue').length;
  const todayCount = tasksOnly.filter(t => getTaskGroupByDate(t) === 'Today').length;

  // Helper for widget styling
  const getWidgetStyle = (isActive: boolean) => {
    return `bg-white dark:bg-[#15171E] p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 select-none ${
      isActive
        ? 'border-blue-500 ring-1 ring-blue-500 shadow-md transform scale-[1.02]'
        : 'border-gray-200 dark:border-[#1F2128] shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
    }`;
  };

  const handleTaskUpdate = (task: typeof filteredTasks[0]) => {
    updateTask(task);
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200">

      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">My Tasks</h1>
            <div className="flex items-center gap-2 text-sm text-[#5E6C84] dark:text-gray-400">
              <span className="font-medium">Good morning, {currentUser.name.split(' ')[0]}!</span>
              <span>•</span>
              <span>You have {todayCount} tasks due today.</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-0">
          {/* Stats Widgets as Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div
              onClick={() => setFilter('incomplete')}
              className={getWidgetStyle(filter === 'incomplete')}
            >
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Layout size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{openTasksCount}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Open Tasks</div>
              </div>
            </div>

            <div
              onClick={() => setFilter('overdue')}
              className={getWidgetStyle(filter === 'overdue')}
            >
              <div className="p-3 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{overdueCount}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overdue</div>
              </div>
            </div>

            <div
              onClick={() => setFilter('today')}
              className={getWidgetStyle(filter === 'today')}
            >
              <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{todayCount}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Today</div>
              </div>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#2D2F36] p-1 rounded-lg">
                <button
                  onClick={() => setFilter('incomplete')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'incomplete' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  Incomplete
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'completed' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  All
                </button>
              </div>

              {/* Group By - Only show for list view */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#2D2F36] p-1 rounded-lg">
                  <button
                    onClick={() => setGroupBy('none')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === 'none' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                  >
                    <LayoutGrid size={12} /> None
                  </button>
                  <button
                    onClick={() => setGroupBy('stage')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === 'stage' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                  >
                    <Layers size={12} /> Stage
                  </button>
                  <button
                    onClick={() => setGroupBy('date')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === 'date' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                  >
                    <Calendar size={12} /> Date
                  </button>
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#2D2F36] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                title="List view"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                title="Card view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Task View - List or Card */}
        {viewMode === 'list' ? (
          <div className="px-8 pb-8">
            <div className="bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl overflow-hidden shadow-sm">
              <ListView
                tasks={filteredTasks}
                onTaskUpdate={handleTaskUpdate}
                mode="myTasks"
                hideToolbar
                onProjectSelect={onProjectSelect}
                groupBy={groupBy}
              />
            </div>
          </div>
        ) : (
          <div className="px-8 pb-8 h-[calc(100%-2rem)]">
            <KanbanBoard
              tasks={filteredTasks}
              onTaskUpdate={handleTaskUpdate}
              mode="myTasks"
              hideToolbar
              onProjectSelect={onProjectSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksView;
