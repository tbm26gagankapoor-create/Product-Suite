
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
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { Sprint, Project, User } from '../types';
import SprintDetailView from './SprintDetailView';
import SprintModal from './SprintModal';
import ProductIcon from './ProductIcon';

interface SprintsViewProps {
  onProjectSelect?: (projectId: string) => void;
}

const SprintsView: React.FC<SprintsViewProps> = ({ onProjectSelect }) => {
  const { sprints, tasks, projects, addSprint, startSprint, refreshData } = useProjectData();
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Planned' | 'Completed'>('All');
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

  // Calculate sprint risk level based on progress vs time elapsed
  const getSprintRisk = (sprint: Sprint, stats: ReturnType<typeof getSprintStats>) => {
      if (sprint.status === 'completed' || sprint.status === 'planned') {
          return { isAtRisk: false, riskLevel: 'none' as const, reason: '' };
      }

      const today = new Date();
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);

      // Calculate time elapsed percentage
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = today.getTime() - startDate.getTime();
      const timeElapsedPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

      // Calculate expected vs actual progress
      const expectedProgress = timeElapsedPercent;
      const actualProgress = stats.progress;
      const progressGap = expectedProgress - actualProgress;

      // Determine risk factors
      const hasBlockedTasks = stats.blockedCount > 0;
      const isBehindSchedule = progressGap > 20; // More than 20% behind expected
      const isSeverelyBehind = progressGap > 40; // More than 40% behind
      const isNearEndWithLowProgress = timeElapsedPercent > 75 && actualProgress < 50;

      // Calculate risk level
      let riskLevel: 'none' | 'warning' | 'critical' = 'none';
      let reason = '';

      if (isSeverelyBehind || isNearEndWithLowProgress) {
          riskLevel = 'critical';
          reason = isNearEndWithLowProgress
              ? `${Math.round(actualProgress)}% done with ${Math.round(100 - timeElapsedPercent)}% time left`
              : `${Math.round(progressGap)}% behind schedule`;
      } else if (isBehindSchedule || hasBlockedTasks) {
          riskLevel = 'warning';
          reason = hasBlockedTasks
              ? `${stats.blockedCount} blocked task${stats.blockedCount > 1 ? 's' : ''}`
              : `${Math.round(progressGap)}% behind schedule`;
      }

      return {
          isAtRisk: riskLevel !== 'none',
          riskLevel,
          reason
      };
  };

  const formatShortDate = (dateString?: string) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Handle starting a planned sprint
  const handleStartSprint = async (sprintId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStartingSprintId(sprintId);
    try {
      await startSprint(sprintId);
      await refreshData();
    } catch (error) {
      console.error('Failed to start sprint:', error);
    } finally {
      setStartingSprintId(null);
    }
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
                        <span>Plan New Sprint</span>
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

            {/* Empty State - Show when no sprints match the filter */}
            {filteredSprints.length === 0 && (
                <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-300">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <Rocket size={40} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                            {filter === 'All' ? 'No sprints yet' : `No ${filter.toLowerCase()} sprints`}
                        </h3>
                        <p className="text-[#5E6C84] dark:text-gray-400 mb-6">
                            {filter === 'All'
                                ? 'Get started by creating your first sprint to organize and track your work.'
                                : `You don't have any ${filter.toLowerCase()} sprints. Create a new sprint or change the filter to see more.`
                            }
                        </p>
                        <button
                            onClick={() => setIsSprintModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-[#0052CC] hover:bg-[#0065FF] text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg text-sm"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Start Your First Sprint</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- GRID VIEW --- */}
            {viewMode === 'grid' && filteredSprints.length > 0 && (
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
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                                            {sprint.status}
                                        </span>
                                        {sprint.status === 'planned' && (
                                            <button
                                                onClick={(e) => handleStartSprint(sprint.id, e)}
                                                disabled={startingSprintId === sprint.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                                                title="Start this sprint"
                                            >
                                                {startingSprintId === sprint.id ? (
                                                    <span className="animate-pulse">Starting...</span>
                                                ) : (
                                                    <>
                                                        <Rocket size={10} />
                                                        Start
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Sprint Info */}
                                <div className="mb-4 relative z-10">
                                    <h3 className="font-bold text-lg text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 truncate">
                                        {sprint.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {project && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onProjectSelect?.(project.id); }}
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r ${project.color || 'from-blue-500 to-blue-600'} bg-opacity-10 border border-gray-200 dark:border-[#2D2F36] bg-gray-50 dark:bg-[#1F2128] hover:border-blue-500 transition-colors`}
                                            >
                                                <div className={`w-2.5 h-2.5 rounded-md bg-gradient-to-br ${project.color || 'from-blue-500 to-blue-600'} shadow-sm`}></div>
                                                <span className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">{project.name}</span>
                                            </button>
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
            {viewMode === 'list' && filteredSprints.length > 0 && (
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
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                                            {sprint.status}
                                        </span>
                                        {sprint.status === 'planned' && (
                                            <button
                                                onClick={(e) => handleStartSprint(sprint.id, e)}
                                                disabled={startingSprintId === sprint.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                                                title="Start this sprint"
                                            >
                                                {startingSprintId === sprint.id ? '...' : 'Start'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Project */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); project && onProjectSelect?.(project.id); }}
                                        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                                    >
                                        {project && (
                                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${project.color || 'from-blue-500 to-blue-600'} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                                <span className="text-[9px] font-bold text-white">{project.key?.substring(0, 2) || 'PR'}</span>
                                            </div>
                                        )}
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate hover:text-blue-600 dark:hover:text-blue-400">{project?.name || 'Unknown'}</span>
                                    </button>

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
            {viewMode === 'timeline' && filteredSprints.length > 0 && timelineData && (
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300 flex flex-col min-h-[500px]">
                    {/* Timeline Header - Time Scale */}
                    <div className="flex border-b border-gray-200 dark:border-[#1F2128] sticky top-0 z-20 bg-white dark:bg-[#15171E]">
                        {/* Project Header Cell */}
                        <div className="w-64 px-6 border-r border-gray-200 dark:border-[#1F2128] flex-shrink-0 flex flex-col justify-end pb-3">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Projects</span>
                        </div>
                        {/* Time Scale Header with Month Spans */}
                        <div className="flex-1 overflow-hidden relative">
                            {/* Month Header Row */}
                            <div className="flex border-b border-gray-100 dark:border-[#1F2128]/50">
                                {(() => {
                                    const months: { name: string; span: number }[] = [];
                                    let currentMonth = '';
                                    let span = 0;
                                    for (let i = 0; i < 12; i++) {
                                        const d = new Date(timelineData.minDate);
                                        d.setDate(d.getDate() + (i * 7));
                                        const monthName = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                                        if (monthName === currentMonth) {
                                            span++;
                                        } else {
                                            if (currentMonth) months.push({ name: currentMonth, span });
                                            currentMonth = monthName;
                                            span = 1;
                                        }
                                    }
                                    months.push({ name: currentMonth, span });
                                    return months.map((m, idx) => (
                                        <div
                                            key={idx}
                                            className="border-r border-gray-100 dark:border-[#1F2128]/50 flex items-center justify-center py-2"
                                            style={{ flex: m.span }}
                                        >
                                            <span className="text-[11px] font-semibold text-[#172B4D] dark:text-gray-200">{m.name}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                            {/* Week Header Row */}
                            <div className="flex h-10">
                                {Array.from({length: 12}).map((_, i) => {
                                    const d = new Date(timelineData.minDate);
                                    d.setDate(d.getDate() + (i * 7));
                                    const today = new Date();
                                    const isCurrentWeek = d <= today && new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000) > today;
                                    return (
                                        <div
                                            key={i}
                                            className={`flex-1 border-l border-gray-100 dark:border-[#1F2128]/50 flex items-center justify-center transition-colors ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                                        >
                                            <span className={`text-[10px] font-medium ${isCurrentWeek ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Body */}
                    <div className="flex-1 overflow-auto custom-scrollbar bg-[#F4F5F7] dark:bg-[#0B0C0E]">
                        {Object.entries(timelineData.groupedByProject).map(([projectId, projSprints]: [string, Sprint[]]) => {
                            const project = getProject(projectId);
                            if(projSprints.length === 0) return null;

                            // Calculate dynamic row height based on number of sprints
                            const sprintCount = projSprints.length;
                            const sprintBarHeight = 36;
                            const sprintGap = 8;
                            const verticalPadding = 16;
                            const rowHeight = verticalPadding * 2 + (sprintCount * sprintBarHeight) + ((sprintCount - 1) * sprintGap);

                            // Sort sprints by start date for consistent vertical positioning
                            const sortedSprints = [...projSprints].sort((a, b) =>
                                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                            );

                            // Status-based colors matching the product design system
                            const getSprintStyles = (status: string) => {
                                switch (status) {
                                    case 'active':
                                        return {
                                            bg: 'bg-blue-500 dark:bg-blue-600',
                                            text: 'text-white',
                                            subtext: 'text-blue-100',
                                            border: 'border-blue-600 dark:border-blue-500'
                                        };
                                    case 'completed':
                                        return {
                                            bg: 'bg-emerald-500 dark:bg-emerald-600',
                                            text: 'text-white',
                                            subtext: 'text-emerald-100',
                                            border: 'border-emerald-600 dark:border-emerald-500'
                                        };
                                    case 'planned':
                                    default:
                                        return {
                                            bg: 'bg-gray-400 dark:bg-gray-600',
                                            text: 'text-white',
                                            subtext: 'text-gray-200',
                                            border: 'border-gray-500 dark:border-gray-500'
                                        };
                                }
                            };

                            return (
                                <div key={projectId} className="flex border-b border-gray-200 dark:border-[#1F2128] hover:bg-white/50 dark:hover:bg-[#15171E]/50 transition-colors" style={{ minHeight: `${Math.max(72, rowHeight)}px` }}>
                                    {/* Project Column */}
                                    <div className="w-64 px-6 py-4 border-r border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex-shrink-0 flex items-center">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar/Icon */}
                                            {project && <ProductIcon project={project} size="sm" />}
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    onClick={() => project && onProjectSelect?.(project.id)}
                                                    className="text-sm font-semibold text-[#172B4D] dark:text-white truncate block hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                                >
                                                    {project?.name || 'Unknown'}
                                                </button>
                                                <span className="text-[10px] text-[#5E6C84] dark:text-gray-500">{project?.key || 'PRJ'} • {projSprints.length} sprint{projSprints.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline Area */}
                                    <div className="flex-1 relative">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {Array.from({length: 12}).map((_, i) => (
                                                <div key={i} className="flex-1 border-l border-gray-200/50 dark:border-[#1F2128]/30"></div>
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
                                                        <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400"></div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Sprint Bars */}
                                        <div className="relative w-full h-full flex flex-col justify-center" style={{ padding: `${verticalPadding}px 8px` }}>
                                            <div className="flex flex-col" style={{ gap: `${sprintGap}px` }}>
                                                {sortedSprints.map((s) => {
                                                    const left = (getLeftOffset(s.startDate, timelineData.minDate) / timelineData.totalDays) * 100;
                                                    const width = (getDuration(s.startDate, s.endDate) / timelineData.totalDays) * 100;
                                                    const stats = getSprintStats(s.id);
                                                    const styles = getSprintStyles(s.status);
                                                    const risk = getSprintRisk(s, stats);

                                                    // Calculate days remaining/overdue
                                                    const today = new Date();
                                                    const endDate = new Date(s.endDate);
                                                    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                    const isOverdue = daysRemaining < 0 && s.status !== 'completed';

                                                    return (
                                                        <div key={s.id} className="relative" style={{ height: `${sprintBarHeight}px` }}>
                                                            <div
                                                                onClick={() => setSelectedSprintId(s.id)}
                                                                className={`absolute rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 hover:brightness-105 flex items-center justify-between px-3 overflow-hidden group ${styles.bg}`}
                                                                style={{
                                                                    left: `${Math.max(0, left)}%`,
                                                                    width: `${Math.max(4, width)}%`,
                                                                    minWidth: '120px',
                                                                    height: `${sprintBarHeight}px`,
                                                                    top: '0',
                                                                }}
                                                                title={`${s.name}\n${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}\n${stats.taskCount} tasks • ${stats.progress}% complete`}
                                                            >
                                                                {/* Left: Sprint info */}
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <span className={`text-[11px] font-semibold ${styles.text} truncate`}>
                                                                        {s.name}
                                                                    </span>
                                                                    <span className={`text-[9px] ${styles.subtext} flex-shrink-0`}>
                                                                        {stats.taskCount} tasks {stats.totalPoints > 0 && `• ${stats.totalPoints} pts`}
                                                                    </span>
                                                                </div>

                                                                {/* Right: Avatars and status */}
                                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                                    {/* Team avatars */}
                                                                    {stats.assignees.length > 0 && (
                                                                        <div className="flex items-center -space-x-1">
                                                                            {stats.assignees.slice(0, 3).map((u) => (
                                                                                <img
                                                                                    key={u.id}
                                                                                    src={u.avatarUrl}
                                                                                    alt={u.name}
                                                                                    className="w-5 h-5 rounded-full border-2 border-white/30 object-cover"
                                                                                />
                                                                            ))}
                                                                            {stats.assignees.length > 3 && (
                                                                                <div className="w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 flex items-center justify-center text-[8px] font-bold text-white">
                                                                                    +{stats.assignees.length - 3}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Risk Warning Indicator */}
                                                                    {risk.isAtRisk && (
                                                                        <div
                                                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                                                                risk.riskLevel === 'critical'
                                                                                    ? 'bg-red-500/40 text-white'
                                                                                    : 'bg-amber-500/40 text-white'
                                                                            }`}
                                                                            title={risk.reason}
                                                                        >
                                                                            <AlertTriangle size={10} className={risk.riskLevel === 'critical' ? 'text-red-200' : 'text-amber-200'} />
                                                                            <span className="text-[9px] font-medium">{risk.riskLevel === 'critical' ? 'At Risk' : 'Warning'}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Status/Days indicator */}
                                                                    {s.status === 'active' && (
                                                                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-500/30 text-white' : 'bg-white/20 text-white'}`}>
                                                                            {isOverdue ? `+${Math.abs(daysRemaining)}d` : `${daysRemaining}d`}
                                                                        </span>
                                                                    )}

                                                                    {/* More menu */}
                                                                    <button
                                                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 transition-all"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <MoreHorizontal size={12} className="text-white/80" />
                                                                    </button>
                                                                </div>
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
                                    <p className="text-xs mt-1 text-gray-600 dark:text-gray-500">Create a sprint to see it on the timeline</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timeline Footer - Legend */}
                    <div className="px-5 py-3 border-t border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex items-center justify-between">
                        <div className="flex items-center gap-5 text-[10px] text-[#5E6C84] dark:text-gray-400">
                            <span className="font-semibold text-[#172B4D] dark:text-gray-300 uppercase tracking-wider">Legend</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-blue-500"></div>
                                <span>Active</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                <span>Completed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-gray-400"></div>
                                <span>Planned</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 dark:border-[#2D2F36]">
                                <div className="w-0.5 h-3 bg-blue-500 rounded-full"></div>
                                <span>Today</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 dark:border-[#2D2F36]">
                                <AlertTriangle size={10} className="text-amber-500" />
                                <span>Warning</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle size={10} className="text-red-500" />
                                <span>At Risk</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-[#5E6C84] dark:text-gray-400 font-medium">
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
