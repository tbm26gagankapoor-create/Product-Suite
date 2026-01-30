
import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Clock,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  CalendarRange,
  ChevronsRight,
  Bird,
  Fish,
  Rabbit,
  Turtle,
  Dog,
  Cat,
  Snail,
  Bug,
  Send,
  Rocket,
  Crown,
  Star,
  Heart,
  Ghost,
  Flower,
  ChevronRight,
  CheckSquare,
  Calendar,
  Target,
  ArrowRight
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { Sprint, Project, User } from '../types';
import SprintDetailView from './SprintDetailView';
import SprintModal from './SprintModal';

const SprintsView: React.FC = () => {
  const { sprints, tasks, projects, addSprint } = useProjectData();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Planned' | 'Completed'>('Active');
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSprints = sprints.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'All') return true;
      if (filter === 'Active') return s.status === 'active';
      if (filter === 'Planned') return s.status === 'planned';
      if (filter === 'Completed') return s.status === 'completed';
      return true;
  });

  // --- Timeline Helpers (Moved before conditional return) ---
  const timelineData = useMemo(() => {
      if (filteredSprints.length === 0) return null;

      // Find global date range
      const dates = filteredSprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)]);
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Add padding
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 14);

      const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Group by Project
      const groupedByProject: Record<string, Sprint[]> = {};
      projects.forEach(p => groupedByProject[p.id] = []);
      filteredSprints.forEach(s => {
          const pid = s.projectId || 'unknown';
          if (!groupedByProject[pid]) groupedByProject[pid] = [];
          groupedByProject[pid].push(s);
      });

      return { minDate, maxDate, totalDays, groupedByProject };
  }, [filteredSprints, projects]);

  if (selectedSprintId) {
    return <SprintDetailView sprintId={selectedSprintId} onBack={() => setSelectedSprintId(null)} />;
  }

  const getProject = (projectId?: string) => projects.find(p => p.id === projectId);

  const getSprintStats = (sprintId: string) => {
      const sprintTasks = tasks.filter(t => t.sprintId === sprintId);
      const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.points || 0), 0);
      const completedTasks = sprintTasks.filter(t => t.columnId === 'done');
      const completedPoints = completedTasks.reduce((acc, t) => acc + (t.points || 0), 0);
      const inProgressTasks = sprintTasks.filter(t => t.columnId === 'inprogress').length;
      const blockedTasks = sprintTasks.filter(t => t.columnId === 'blocked').length;
      const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

      const assigneesMap = new Map<string, User>();
      sprintTasks.forEach(t => {
          if (t.assignee) assigneesMap.set(t.assignee.id, t.assignee);
      });
      const assignees = Array.from(assigneesMap.values());

      return {
          totalPoints,
          completedPoints,
          progress,
          assignees,
          taskCount: sprintTasks.length,
          completedCount: completedTasks.length,
          inProgressCount: inProgressTasks,
          blockedCount: blockedTasks
      };
  };

  const formatShortDate = (dateString?: string) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleCreateSprint = (data: { name: string; startDate: string; endDate: string; goal: string; projectId?: string }) => {
      // projectId is now required for sprint-to-product uniqueness
      const projectId = data.projectId || projects[0]?.id;
      if (!projectId) {
          console.error('Cannot create sprint without a project');
          return;
      }
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
  };

  // --- Theme Logic ---
  const getSprintTheme = (id: string) => {
      const icons = [Bird, Fish, Rabbit, Turtle, Dog, Cat, Snail, Bug, Send, Rocket, Crown, Star, Heart, Ghost, Flower];
      const gradients = [
          'from-orange-400 to-pink-500',
          'from-blue-400 to-indigo-500',
          'from-green-400 to-emerald-500',
          'from-purple-400 to-fuchsia-500',
          'from-yellow-400 to-orange-500',
          'from-teal-400 to-cyan-500',
          'from-red-400 to-rose-500',
          'from-indigo-400 to-purple-500',
      ];
      
      // Deterministic hash based on string ID
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
          hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const iconIndex = Math.abs(hash) % icons.length;
      const gradientIndex = Math.abs(hash) % gradients.length;
      
      return {
          Icon: icons[iconIndex],
          gradient: gradients[gradientIndex]
      };
  };

  const getLeftOffset = (dateStr: string, minDate: Date) => {
      const date = new Date(dateStr);
      const diff = Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
  };

  const getDuration = (start: string, end: string) => {
      const s = new Date(start);
      const e = new Date(end);
      return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200 overflow-hidden">
        
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Sprints</h1>
                   <p className="text-[#5E6C84] dark:text-gray-400 text-sm">
                       Track velocity and progress across all product initiatives.
                   </p>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search sprints..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
                        />
                     </div>
                     <div className="h-8 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>
                     <button 
                        onClick={() => setIsSprintModalOpen(true)}
                        className="flex items-center gap-2 bg-[#0052CC] hover:bg-[#0065FF] text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm text-sm"
                     >
                        <Plus size={16} strokeWidth={3} />
                        <span>Start Sprint</span>
                     </button>
                </div>
            </div>
        </div>

        {/* Fixed Toolbar Section */}
        <div className="flex-shrink-0 px-8 py-4 flex items-center justify-between bg-[#F4F5F7] dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">Filter By:</span>
                    <div className="flex gap-1">
                        {['All', 'Active', 'Planned', 'Completed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    filter === f
                                    ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">View:</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                        title="List View"
                    >
                        <ListIcon size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                        title="Timeline View"
                    >
                        <CalendarRange size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 pt-6">
            
            {/* --- GRID VIEW --- */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                    {filteredSprints.map(sprint => {
                        const project = getProject(sprint.projectId);
                        const stats = getSprintStats(sprint.id);
                        const { progress, assignees, totalPoints, taskCount, completedCount, inProgressCount } = stats;
                        const endDate = new Date(sprint.endDate);
                        const today = new Date();
                        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysRemaining < 0 && sprint.status !== 'completed';

                        const { Icon, gradient } = getSprintTheme(sprint.id);

                        return (
                            <div 
                                key={sprint.id}
                                onClick={() => setSelectedSprintId(sprint.id)}
                                className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-5 hover:border-blue-500/50 hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                            >
                                {/* Decorative Background Blob */}
                                <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>

                                {/* Top Section with Icon */}
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg shadow-gray-200 dark:shadow-none transform group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon size={28} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                                            {sprint.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Sprint Info */}
                                <div className="mb-4 relative z-10">
                                    <h3 className="font-bold text-lg text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 truncate">
                                        {sprint.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {project && (
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r ${project.color || 'from-blue-500 to-blue-600'} bg-opacity-10 border border-gray-200 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128]`}>
                                                <div className={`w-2.5 h-2.5 rounded-md bg-gradient-to-br ${project.color || 'from-blue-500 to-blue-600'} shadow-sm`}></div>
                                                <span className="text-gray-700 dark:text-gray-200">{project.name}</span>
                                            </span>
                                        )}
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{totalPoints} pts</span>
                                    </div>
                                </div>

                                {/* Sprint Goal */}
                                {sprint.goal && (
                                    <div className="mb-4 relative z-10">
                                        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1F2128] px-3 py-2 rounded-lg">
                                            <Target size={12} strokeWidth={1.5} className="mt-0.5 flex-shrink-0 text-blue-400" />
                                            <span className="line-clamp-2">{sprint.goal}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Date Range & Task Stats */}
                                <div className="flex flex-wrap items-center gap-3 mb-4 relative z-10">
                                    {/* Date Range */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1F2128] px-2 py-1 rounded-md">
                                        <Calendar size={11} className="opacity-60" />
                                        <span>{formatShortDate(sprint.startDate)}</span>
                                        <ArrowRight size={10} className="opacity-40" />
                                        <span>{formatShortDate(sprint.endDate)}</span>
                                    </div>

                                    {/* Task Count */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1F2128] px-2 py-1 rounded-md" title={`${completedCount} completed, ${inProgressCount} in progress`}>
                                        <CheckSquare size={11} strokeWidth={1.5} className="text-blue-400" />
                                        <span className="font-medium">{taskCount}</span>
                                        {completedCount > 0 && (
                                            <span className="text-emerald-500 dark:text-emerald-400">({completedCount})</span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="mt-auto space-y-4 relative z-10">
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
                                            <span>Progress</span>
                                            <span className={progress === 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${gradient}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#1F2128]">
                                        <div className="flex items-center -space-x-2">
                                            {assignees.slice(0, 3).map(u => (
                                                <img key={u.id} src={u.avatarUrl} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#15171E] object-cover" title={u.name} />
                                            ))}
                                            {assignees.length > 3 && (
                                                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#15171E] bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-[10px] font-medium text-gray-500">
                                                    +{assignees.length - 3}
                                                </div>
                                            )}
                                            {assignees.length === 0 && <span className="text-xs text-gray-400 italic">No assignees</span>}
                                        </div>

                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                                            <Clock size={14} strokeWidth={1.5} />
                                            <span>{sprint.status === 'completed' ? 'Ended' : `${daysRemaining} days`}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    <button 
                        onClick={() => setIsSprintModalOpen(true)}
                        className="bg-gray-50 dark:bg-[#1F2128]/30 border-2 border-dashed border-gray-300 dark:border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white dark:hover:bg-[#1F2128] hover:border-blue-500/50 hover:shadow-lg transition-all group min-h-[300px]"
                    >
                       <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-blue-600 transition-colors">
                          <Plus size={32} />
                       </div>
                       <span className="text-gray-500 dark:text-gray-400 font-medium group-hover:text-blue-600 dark:group-hover:text-white">Plan New Sprint</span>
                    </button>
                </div>
            )}

            {/* --- LIST VIEW --- */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
                    <div className="grid grid-cols-[minmax(200px,1.5fr)_90px_minmax(120px,1fr)_140px_70px_90px_120px_80px_44px] gap-3 px-6 py-3 bg-gray-50/80 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#1F2128] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <div>Sprint</div>
                        <div>Status</div>
                        <div>Project</div>
                        <div>Duration</div>
                        <div className="text-center">Points</div>
                        <div className="text-center">Tasks</div>
                        <div>Progress</div>
                        <div>Team</div>
                        <div></div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                        {filteredSprints.map(sprint => {
                            const project = getProject(sprint.projectId);
                            const stats = getSprintStats(sprint.id);
                            const endDate = new Date(sprint.endDate);
                            const today = new Date();
                            const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = daysRemaining < 0 && sprint.status !== 'completed';

                            return (
                                <div
                                    key={sprint.id}
                                    onClick={() => setSelectedSprintId(sprint.id)}
                                    className="grid grid-cols-[minmax(200px,1.5fr)_90px_minmax(120px,1fr)_140px_70px_90px_120px_80px_44px] gap-3 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group"
                                >
                                    {/* Sprint Name & Goal */}
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{sprint.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{sprint.goal || "No goal set"}</div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                                            {sprint.status}
                                        </span>
                                    </div>

                                    {/* Project */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        {project && (
                                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${project.color || 'from-blue-500 to-blue-600'} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                                <span className="text-[9px] font-bold text-white">{project.key?.substring(0, 2) || 'PR'}</span>
                                            </div>
                                        )}
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{project?.name || 'Unknown'}</span>
                                    </div>

                                    {/* Duration */}
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <span>{formatShortDate(sprint.startDate)}</span>
                                            <ArrowRight size={10} className="opacity-40" />
                                            <span>{formatShortDate(sprint.endDate)}</span>
                                        </div>
                                        <div className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : sprint.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                                            {sprint.status === 'completed' ? 'Completed' : isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 dark:bg-[#2D2F36] rounded text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {stats.totalPoints}
                                        </div>
                                        {stats.completedPoints > 0 && (
                                            <div className="text-[9px] text-green-600 mt-0.5">{stats.completedPoints} done</div>
                                        )}
                                    </div>

                                    {/* Tasks */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                            <CheckSquare size={11} className="text-blue-500" />
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{stats.taskCount}</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-[9px] mt-0.5">
                                            {stats.completedCount > 0 && (
                                                <span className="text-green-600">{stats.completedCount} done</span>
                                            )}
                                            {stats.inProgressCount > 0 && (
                                                <span className="text-blue-500">{stats.inProgressCount} wip</span>
                                            )}
                                            {stats.blockedCount > 0 && (
                                                <span className="text-red-500">{stats.blockedCount} blocked</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${stats.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${stats.progress}%` }}></div>
                                            </div>
                                            <span className={`text-[10px] font-bold w-8 text-right ${stats.progress === 100 ? 'text-green-600' : 'text-blue-600'}`}>{stats.progress}%</span>
                                        </div>
                                    </div>

                                    {/* Team */}
                                    <div>
                                        <div className="flex items-center -space-x-1.5">
                                            {stats.assignees.slice(0, 3).map(u => (
                                                <img key={u.id} src={u.avatarUrl} className="w-6 h-6 rounded-full border-2 border-white dark:border-[#15171E] object-cover" title={u.name} />
                                            ))}
                                            {stats.assignees.length > 3 && (
                                                <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#15171E] bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-[9px] font-bold text-gray-500">
                                                    +{stats.assignees.length - 3}
                                                </div>
                                            )}
                                            {stats.assignees.length === 0 && <span className="text-[10px] text-gray-400 italic">-</span>}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end">
                                        <button className="text-gray-400 hover:text-blue-600 dark:hover:text-white p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36]">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- TIMELINE VIEW --- */}
            {viewMode === 'timeline' && timelineData && (
                <div className="bg-[#141417] border border-[#232328] rounded-lg overflow-hidden shadow-xl animate-in fade-in duration-300 flex flex-col min-h-[500px]">
                    {/* Timeline Header - Time Scale */}
                    <div className="flex border-b border-[#232328] sticky top-0 z-20">
                        {/* Project Header Cell */}
                        <div className="w-56 px-5 py-3 border-r border-[#232328] flex-shrink-0 bg-[#141417]">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Resources</span>
                        </div>
                        {/* Time Scale Header */}
                        <div className="flex-1 overflow-hidden relative bg-[#141417]">
                            <div className="flex h-11">
                                {Array.from({length: 12}).map((_, i) => {
                                    const d = new Date(timelineData.minDate);
                                    d.setDate(d.getDate() + (i * 7));
                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 border-l border-[#232328] flex items-center justify-center"
                                        >
                                            <span className="text-[10px] font-medium text-gray-500">
                                                {d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Body */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {Object.entries(timelineData.groupedByProject).map(([projectId, projSprints]: [string, Sprint[]]) => {
                            const project = getProject(projectId);
                            if(projSprints.length === 0) return null;

                            // Calculate dynamic row height based on number of sprints
                            const sprintCount = projSprints.length;
                            const sprintBarHeight = 34;
                            const sprintGap = 8;
                            const verticalPadding = 16;
                            const rowHeight = verticalPadding * 2 + (sprintCount * sprintBarHeight) + ((sprintCount - 1) * sprintGap);

                            // Sort sprints by start date for consistent vertical positioning
                            const sortedSprints = [...projSprints].sort((a, b) =>
                                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                            );

                            // Muted color palette for sprints (based on sprint index for variety)
                            const sprintColors = [
                                { bg: '#3d5a4c', text: 'text-emerald-200' },  // Muted sage green
                                { bg: '#4a5568', text: 'text-gray-200' },     // Slate gray
                                { bg: '#5c4a3d', text: 'text-amber-200' },    // Muted brown
                                { bg: '#3d4a5c', text: 'text-blue-200' },     // Steel blue
                                { bg: '#5c3d4a', text: 'text-rose-200' },     // Muted mauve
                                { bg: '#4a5c3d', text: 'text-lime-200' },     // Olive green
                                { bg: '#3d5c5c', text: 'text-teal-200' },     // Teal
                                { bg: '#5c5c3d', text: 'text-yellow-200' },   // Khaki
                            ];

                            return (
                                <div key={projectId} className="flex border-b border-[#1e1e22] hover:bg-[#1a1a1e] transition-colors" style={{ minHeight: `${Math.max(72, rowHeight)}px` }}>
                                    {/* Project Column */}
                                    <div className="w-56 px-5 py-4 border-r border-[#232328] bg-[#141417] flex-shrink-0 flex items-center">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar/Icon */}
                                            <div className="w-9 h-9 rounded-lg bg-[#232328] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#2d2d32]">
                                                {project?.imageUrl ? (
                                                    <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[11px] font-bold text-gray-400">{project?.key?.substring(0, 2) || 'PR'}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[13px] font-semibold text-gray-100 truncate block leading-tight">{project?.name || 'Unknown'}</span>
                                                <span className="text-[10px] text-gray-500 font-medium">{project?.key || 'PRJ'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline Area */}
                                    <div className="flex-1 relative bg-[#18181b]">
                                        {/* Grid Lines - subtle dotted */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {Array.from({length: 12}).map((_, i) => (
                                                <div key={i} className="flex-1 border-l border-dashed border-[#232328]/60"></div>
                                            ))}
                                        </div>

                                        {/* Today Indicator */}
                                        {(() => {
                                            const today = new Date();
                                            const todayOffset = (getLeftOffset(today.toISOString(), timelineData.minDate) / timelineData.totalDays) * 100;
                                            if (todayOffset >= 0 && todayOffset <= 100) {
                                                return (
                                                    <div
                                                        className="absolute top-0 bottom-0 z-20 pointer-events-none"
                                                        style={{ left: `${todayOffset}%` }}
                                                    >
                                                        <div className="absolute top-0 bottom-0 w-px bg-blue-500/70"></div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Sprint Bars */}
                                        <div className="relative w-full h-full flex flex-col justify-center" style={{ padding: `${verticalPadding}px 12px` }}>
                                            <div className="flex flex-col" style={{ gap: `${sprintGap}px` }}>
                                                {sortedSprints.map((s, sprintIndex) => {
                                                    const left = (getLeftOffset(s.startDate, timelineData.minDate) / timelineData.totalDays) * 100;
                                                    const width = (getDuration(s.startDate, s.endDate) / timelineData.totalDays) * 100;
                                                    const stats = getSprintStats(s.id);

                                                    // Calculate days remaining/overdue
                                                    const today = new Date();
                                                    const endDate = new Date(s.endDate);
                                                    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                    const isOverdue = daysRemaining < 0 && s.status !== 'completed';

                                                    // Get color based on sprint index (cycles through palette)
                                                    const colorIndex = sprintIndex % sprintColors.length;
                                                    const sprintColor = sprintColors[colorIndex];

                                                    // Status text color
                                                    const getStatusStyle = () => {
                                                        if (s.status === 'completed') return 'text-emerald-300/90';
                                                        if (s.status === 'active' && isOverdue) return 'text-orange-300/90';
                                                        if (s.status === 'active') return 'text-blue-300/90';
                                                        return 'text-gray-300/80';
                                                    };

                                                    return (
                                                        <div key={s.id} className="relative" style={{ height: `${sprintBarHeight}px` }}>
                                                            <div
                                                                onClick={() => setSelectedSprintId(s.id)}
                                                                className="absolute rounded-md hover:brightness-125 cursor-pointer transition-all flex items-center justify-between px-3 overflow-hidden group"
                                                                style={{
                                                                    left: `${Math.max(0, left)}%`,
                                                                    width: `${Math.max(4, width)}%`,
                                                                    minWidth: '110px',
                                                                    height: `${sprintBarHeight}px`,
                                                                    top: '0',
                                                                    backgroundColor: sprintColor.bg
                                                                }}
                                                                title={`${s.name}\n${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}\n${stats.taskCount} tasks • ${stats.progress}% complete`}
                                                            >
                                                                {/* Sprint Name */}
                                                                <span className={`text-[12px] font-medium ${sprintColor.text} truncate`}>
                                                                    {s.name}
                                                                </span>

                                                                {/* Status Badge */}
                                                                <span className={`text-[9px] font-medium ${getStatusStyle()} flex-shrink-0 ml-2`}>
                                                                    {s.status === 'completed' && 'Done'}
                                                                    {s.status === 'active' && !isOverdue && 'Active'}
                                                                    {s.status === 'active' && isOverdue && `+${Math.abs(daysRemaining)}d`}
                                                                    {s.status === 'planned' && 'Planned'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {Object.values(timelineData.groupedByProject).every((sprints: Sprint[]) => sprints.length === 0) && (
                            <div className="flex items-center justify-center py-24 text-gray-500">
                                <div className="text-center">
                                    <CalendarRange size={48} className="mx-auto mb-4 opacity-40" />
                                    <p className="text-sm font-medium">No sprints to display</p>
                                    <p className="text-xs mt-1 text-gray-600">Create a sprint to see it on the timeline</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timeline Footer */}
                    <div className="px-5 py-3 border-t border-[#232328] bg-[#141417] flex items-center justify-between">
                        <div className="flex items-center gap-6 text-[10px] text-gray-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#3d5a4c]"></div>
                                <span>Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#4a5568]"></div>
                                <span>Planned</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#5c4a3d]"></div>
                                <span>Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-3 bg-blue-500/70 rounded-full"></div>
                                <span>Today</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">
                            {filteredSprints.length} sprint{filteredSprints.length !== 1 ? 's' : ''} • {Object.values(timelineData.groupedByProject).filter((s: Sprint[]) => s.length > 0).length} project{Object.values(timelineData.groupedByProject).filter((s: Sprint[]) => s.length > 0).length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            )}

        </div>
        
        <SprintModal
            isOpen={isSprintModalOpen}
            onClose={() => setIsSprintModalOpen(false)}
            onSubmit={handleCreateSprint}
            nextSprintNumber={sprints.length + 1}
            projects={projects}
        />
    </div>
  );
};

export default SprintsView;
