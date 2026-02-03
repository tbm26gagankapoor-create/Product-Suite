
import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, MoreHorizontal, Users, Grid, Settings, ChevronsRight, Search, List as ListIcon, LayoutGrid, ArrowLeft,
  Mail, Trophy, Target, ArrowUpRight, CheckCircle2, AlertCircle, Clock, Layers, Briefcase, MapPin, Edit2,
  UserX, UserCheck, Shield, UserPlus
} from 'lucide-react';
import { Team, User } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import CreateTeamModal from './CreateTeamModal';
import EditUserModal from './EditUserModal';
import InviteUserModal from './InviteUserModal';
import { api } from '../lib/api';

// --- Helper Component: Team Avatar ---
const TeamAvatar = ({ team, size = 'md', className = '' }: { team: Team, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) => {
    const initials = team.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-12 h-12 text-lg",
        lg: "w-16 h-16 text-xl",
        xl: "w-24 h-24 text-3xl"
    };

    // Deterministic color based on name length
    const colors = [
        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    ];
    const colorIndex = team.name.length % colors.length;
    const colorClass = colors[colorIndex];

    // Check if avatarUrl exists and is not a default placeholder if you have one, or just check truthy
    // Assuming empty string or null means no avatar
    if (team.avatarUrl && team.avatarUrl.trim() !== '' && !team.avatarUrl.includes('ui-avatars.com')) {
        return (
            <img 
                src={team.avatarUrl} 
                alt={team.name} 
                className={`${sizeClasses[size]} rounded-xl object-cover ${className}`} 
            />
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold ${colorClass} ${className}`}>
            {initials}
        </div>
    );
};

// --- Sub-Component: User Detail ---
interface UserDetailProps {
  userId: string;
  onBack: () => void;
  onSelectTeam?: (teamId: string) => void;
}

type TaskFilter = 'all' | 'inprogress' | 'blocked' | 'done' | 'high';

const UserDetail: React.FC<UserDetailProps> = ({ userId, onBack, onSelectTeam }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'context'>('overview');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  // Use organization-scoped data for user lookup only
  const { organizationUsers, users } = useProjectData();

  // Fetch user-specific data from API (tasks, teams, projects)
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const [tasksData, teamsData, projectsData] = await Promise.all([
          api.getTasks(users, { assignee_id: userId }),
          api.getTeamsForUser(userId),
          api.getProjectsForUser(userId),
        ]);
        setUserTasks(tasksData);
        setUserTeams(teamsData);
        setUserProjects(projectsData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [userId, users]);

  const user = organizationUsers.find(u => u.id === userId);
  if (!user) return <div>User not found</div>;
  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading user data...</div>;

  const completedTasks = userTasks.filter(t => t.columnId === 'done');
  const activeTasks = userTasks.filter(t => t.columnId !== 'done');
  const inProgressTasks = userTasks.filter(t => t.columnId === 'inprogress');
  const blockedTasks = userTasks.filter(t => t.columnId === 'blocked');

  const pointsWon = completedTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const pointsPending = activeTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const completionRate = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;

  // Get high priority tasks
  const highPriorityTasks = activeTasks.filter(t => t.priority === 'HIGH');

  // Filter tasks based on selected filter
  const filteredTasks = taskFilter === 'all' ? userTasks :
    taskFilter === 'inprogress' ? inProgressTasks :
    taskFilter === 'blocked' ? blockedTasks :
    taskFilter === 'done' ? completedTasks :
    taskFilter === 'high' ? highPriorityTasks : userTasks;

  // Handle filter click from Task Breakdown
  const handleFilterClick = (filter: TaskFilter) => {
    setTaskFilter(filter);
    setActiveTab('tasks');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B0C0E] p-8 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300 h-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#172B4D] dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Directory
      </button>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Avatar & Info */}
          <div className="flex items-center gap-5 flex-1">
            <div className="relative">
              <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100 dark:ring-[#1F2128]" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-[#15171E]"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white mb-1 flex items-center gap-3">
                {user.name}
                {user.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 uppercase tracking-wide">Admin</span>}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-[#172B4D] dark:text-gray-200">{user.designation || 'Team Member'}</span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><Mail size={14} /> {user.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row - Clickable */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => { setTaskFilter('all'); setActiveTab('tasks'); }}
              className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <div className="text-xl font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{userTasks.length}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider group-hover:text-blue-500">Tasks</div>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px] hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
            >
              <div className="text-xl font-bold text-[#172B4D] dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">{userTeams.length}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider group-hover:text-purple-500">Teams</div>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px] hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
            >
              <div className="text-xl font-bold text-[#172B4D] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{userProjects.length}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider group-hover:text-indigo-500">Products</div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><Trophy size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-green-100 font-medium text-xs uppercase tracking-wide"><Trophy size={14} /> Points Won</div>
            <div className="text-3xl font-bold">{pointsWon}</div>
            <div className="text-xs text-green-100 mt-1">{completedTasks.length} tasks completed</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><Target size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-blue-100 font-medium text-xs uppercase tracking-wide"><Target size={14} /> Pending</div>
            <div className="text-3xl font-bold">{pointsPending}</div>
            <div className="text-xs text-blue-100 mt-1">{activeTasks.length} tasks remaining</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><CheckCircle2 size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-purple-100 font-medium text-xs uppercase tracking-wide"><CheckCircle2 size={14} /> Completion</div>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <div className="text-xs text-purple-100 mt-1">{completedTasks.length} of {userTasks.length} tasks</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-gray-200 dark:border-[#1F2128] mb-6">
        {['overview', 'tasks', 'context'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab === 'context' ? 'Products & Teams' : tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-white rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Breakdown - Clickable */}
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Task Breakdown</h3>
                <button
                  onClick={() => { setTaskFilter('all'); setActiveTab('tasks'); }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  View All <ArrowUpRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleFilterClick('inprogress')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-500 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172B4D] dark:text-white">{inProgressTasks.length}</span>
                    <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <button
                  onClick={() => handleFilterClick('blocked')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200">Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172B4D] dark:text-white">{blockedTasks.length}</span>
                    <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <button
                  onClick={() => handleFilterClick('done')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172B4D] dark:text-white">{completedTasks.length}</span>
                    <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <button
                  onClick={() => handleFilterClick('high')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-500 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium text-[#172B4D] dark:text-gray-200">High Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172B4D] dark:text-white">{highPriorityTasks.length}</span>
                    <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            </div>

            {/* Active Priorities */}
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Priorities</h3>
                {activeTasks.length > 4 && (
                  <button
                    onClick={() => { setTaskFilter('all'); setActiveTab('tasks'); }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    View All <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : (
                  activeTasks.slice(0, 4).map(task => (
                    <button
                      key={task.id}
                      onClick={() => { setTaskFilter('all'); setActiveTab('tasks'); }}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-500 transition-all cursor-pointer group text-left"
                    >
                      <div className={`w-2 h-2 rounded-full ${task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#172B4D] dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{task.points || 0} pts</span>
                        <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'inprogress', 'blocked', 'done', 'high'] as TaskFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    taskFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2D2F36]'
                  }`}
                >
                  {filter === 'all' ? 'All Tasks' :
                   filter === 'inprogress' ? 'In Progress' :
                   filter === 'blocked' ? 'Blocked' :
                   filter === 'done' ? 'Completed' : 'High Priority'}
                  <span className="ml-1.5 opacity-70">
                    ({filter === 'all' ? userTasks.length :
                      filter === 'inprogress' ? inProgressTasks.length :
                      filter === 'blocked' ? blockedTasks.length :
                      filter === 'done' ? completedTasks.length : highPriorityTasks.length})
                  </span>
                </button>
              ))}
            </div>

            {/* Tasks Table */}
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#1F2128] border-b border-gray-200 dark:border-[#2D2F36]">
                      <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Task</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          <Layers size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{taskFilter === 'all' ? 'No tasks assigned' : 'No tasks match this filter'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${task.columnId === 'done' ? 'bg-green-500' : task.columnId === 'inprogress' ? 'bg-yellow-500' : task.columnId === 'blocked' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                              <span className="text-sm font-medium text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              task.columnId === 'done' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              task.columnId === 'inprogress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              task.columnId === 'blocked' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}>
                              {task.columnId === 'done' ? 'Done' : task.columnId === 'inprogress' ? 'In Progress' : task.columnId === 'blocked' ? 'Blocked' : 'To Do'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              task.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              task.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-bold text-[#172B4D] dark:text-white">{task.points || 0}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Products */}
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Assigned Products</h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-[#1F2128] px-2 py-1 rounded">{userProjects.length}</span>
              </div>
              <div className="space-y-3">
                {userProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No products assigned</p>
                  </div>
                ) : (
                  userProjects.map(project => (
                    <button
                      key={project.id}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-500 transition-all cursor-pointer group text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${project.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white font-bold text-xs`}>{project.key}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#172B4D] dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{project.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Member of Teams */}
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Member of Teams</h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-[#1F2128] px-2 py-1 rounded">{userTeams.length}</span>
              </div>
              <div className="space-y-3">
                {userTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Not in any team</p>
                  </div>
                ) : (
                  userTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => onSelectTeam?.(team.id)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-500 transition-all cursor-pointer group text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {team.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#172B4D] dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{team.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{team.members.length} members</p>
                      </div>
                      <ArrowUpRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-Component: Team Detail ---
interface TeamDetailProps {
  team: Team;
  onBack: () => void;
}

const TeamDetail: React.FC<TeamDetailProps> = ({ team, onBack }) => {
  const { users, projects } = useProjectData();

  // Fetch team-specific data from API
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [memberTasksMap, setMemberTasksMap] = useState<Map<string, any[]>>(new Map());
  const [projectTasksMap, setProjectTasksMap] = useState<Map<string, any[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get team projects from context (filtered by team.projectIds)
  const teamProjects = projects.filter(p => team.projectIds?.includes(p.id));

  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      try {
        // Get team members from API
        const members = await api.getUsersInTeam(team.id);
        setTeamMembers(members);

        // Fetch tasks for each member
        const tasksMap = new Map<string, any[]>();
        await Promise.all(
          members.map(async (member) => {
            const memberTasks = await api.getTasks(users, { assignee_id: member.id });
            tasksMap.set(member.id, memberTasks);
          })
        );
        setMemberTasksMap(tasksMap);

        // Fetch tasks for each project
        const projTasksMap = new Map<string, any[]>();
        await Promise.all(
          (team.projectIds || []).map(async (projectId: string) => {
            const projTasks = await api.getTasks(users, { project_id: projectId });
            projTasksMap.set(projectId, projTasks);
          })
        );
        setProjectTasksMap(projTasksMap);
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamData();
  }, [team.id, team.projectIds, users]);

  // Calculate task stats for each member using API-fetched data
  const getMemberStats = (memberId: string) => {
    const memberTasks = memberTasksMap.get(memberId) || [];
    const completed = memberTasks.filter(t => t.columnId === 'done').length;
    const inProgress = memberTasks.filter(t => t.columnId === 'inprogress').length;
    const blocked = memberTasks.filter(t => t.columnId === 'blocked').length;
    const totalPoints = memberTasks.reduce((acc, t) => acc + (t.points || 0), 0);
    const completedPoints = memberTasks.filter(t => t.columnId === 'done').reduce((acc, t) => acc + (t.points || 0), 0);
    return { total: memberTasks.length, completed, inProgress, blocked, totalPoints, completedPoints };
  };

  // Calculate team totals
  const teamStats = {
    totalTasks: teamMembers.reduce((acc, m) => acc + getMemberStats(m.id).total, 0),
    completedTasks: teamMembers.reduce((acc, m) => acc + getMemberStats(m.id).completed, 0),
    totalPoints: teamMembers.reduce((acc, m) => acc + getMemberStats(m.id).totalPoints, 0),
    completedPoints: teamMembers.reduce((acc, m) => acc + getMemberStats(m.id).completedPoints, 0),
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading team data...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B0C0E] p-8 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300 h-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#172B4D] dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Directory
      </button>

      {/* Team Header */}
      <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-5 flex-1">
            <TeamAvatar team={team} size="xl" className="ring-4 ring-gray-50 dark:ring-[#0B0C0E]" />
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white mb-1">{team.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl leading-relaxed">{team.description}</p>
            </div>
          </div>

          {/* Team Quick Stats */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px]">
              <div className="text-xl font-bold text-[#172B4D] dark:text-white">{teamMembers.length}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Members</div>
            </div>
            <div className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px]">
              <div className="text-xl font-bold text-[#172B4D] dark:text-white">{teamStats.totalTasks}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Tasks</div>
            </div>
            <div className="flex-1 lg:flex-none p-3 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] text-center min-w-[90px]">
              <div className="text-xl font-bold text-[#172B4D] dark:text-white">{teamStats.completedPoints}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><Layers size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-blue-100 font-medium text-xs uppercase tracking-wide"><Layers size={14} /> Total Tasks</div>
            <div className="text-3xl font-bold">{teamStats.totalTasks}</div>
            <div className="text-xs text-blue-100 mt-1">{teamStats.completedTasks} completed</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><Trophy size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-green-100 font-medium text-xs uppercase tracking-wide"><Trophy size={14} /> Points Earned</div>
            <div className="text-3xl font-bold">{teamStats.completedPoints}</div>
            <div className="text-xs text-green-100 mt-1">of {teamStats.totalPoints} total</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><CheckCircle2 size={56} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-purple-100 font-medium text-xs uppercase tracking-wide"><CheckCircle2 size={14} /> Completion</div>
            <div className="text-3xl font-bold">{teamStats.totalTasks > 0 ? Math.round((teamStats.completedTasks / teamStats.totalTasks) * 100) : 0}%</div>
            <div className="text-xs text-purple-100 mt-1">{teamStats.completedTasks} of {teamStats.totalTasks} tasks</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members with Task Stats */}
        <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-gray-50/50 dark:bg-[#1F2128]/50">
            <h3 className="font-bold text-[#172B4D] dark:text-white">Team Members</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded">{teamMembers.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
            {teamMembers.map(member => {
              const stats = getMemberStats(member.id);
              return (
                <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <img src={member.avatarUrl} alt={member.name} className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 dark:border-[#2D2F36]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{member.name}</h4>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                    <ArrowUpRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  {/* Task Stats Row */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1F2128] text-xs font-medium text-gray-600 dark:text-gray-300">
                      <Layers size={12} /> {stats.total} tasks
                    </span>
                    {stats.inProgress > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        <Clock size={12} /> {stats.inProgress} active
                      </span>
                    )}
                    {stats.blocked > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-xs font-medium text-red-700 dark:text-red-400">
                        <AlertCircle size={12} /> {stats.blocked} blocked
                      </span>
                    )}
                    {stats.completed > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-400">
                        <CheckCircle2 size={12} /> {stats.completed} done
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-xs font-medium text-purple-700 dark:text-purple-400">
                      <Trophy size={12} /> {stats.completedPoints} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assigned Products with Task Stats */}
        <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-gray-50/50 dark:bg-[#1F2128]/50">
            <h3 className="font-bold text-[#172B4D] dark:text-white">Assigned Products</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-[#2D2F36] px-2 py-1 rounded">{teamProjects.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
            {teamProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No products assigned</p>
              </div>
            ) : (
              teamProjects.map(project => {
                const projectTasks = projectTasksMap.get(project.id) || [];
                const projectCompleted = projectTasks.filter((t: any) => t.columnId === 'done').length;
                const projectInProgress = projectTasks.filter((t: any) => t.columnId === 'inprogress').length;
                return (
                  <div key={project.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${project.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white font-bold text-xs`}>{project.key}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{project.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {/* Project Task Stats */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1F2128] text-xs font-medium text-gray-600 dark:text-gray-300">
                        <Layers size={12} /> {projectTasks.length} tasks
                      </span>
                      {projectInProgress > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                          <Clock size={12} /> {projectInProgress} active
                        </span>
                      )}
                      {projectCompleted > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 size={12} /> {projectCompleted} done
                        </span>
                      )}
                      {projectTasks.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-400">
                          {Math.round((projectCompleted / projectTasks.length) * 100)}% complete
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Actions Dropdown Component ---
const UserActionsDropdown: React.FC<{
  user: User;
  onEdit: () => void;
  onViewProfile: () => void;
  isAdmin: boolean;
}> = ({ user, onEdit, onViewProfile, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="text-gray-400 hover:text-[#172B4D] dark:hover:text-white p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1F2128] rounded-lg shadow-xl border border-gray-200 dark:border-[#2D2F36] py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={(e) => { e.stopPropagation(); onViewProfile(); setIsOpen(false); }}
            className="w-full px-4 py-2 text-left text-sm text-[#172B4D] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2D2F36] flex items-center gap-2"
          >
            <Users size={14} />
            View Profile
          </button>
          {isAdmin && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-[#172B4D] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2D2F36] flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit User
              </button>
              <div className="border-t border-gray-200 dark:border-[#2D2F36] my-1" />
              {user.status === 'inactive' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                >
                  <UserCheck size={14} />
                  Reactivate User
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <UserX size={14} />
                  Deactivate User
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TeamsView: React.FC = () => {
  const [activeView, setActiveView] = useState<'teams' | 'users'>('teams');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Use organization-scoped data - only shows users/teams from current organization
  const { organizationTeams, organizationUsers, addTeam, currentOrganization, currentUser, refreshData } = useProjectData();

  const isCurrentUserAdmin = currentUser?.isAdmin || currentUser?.role === 'Admin';

  const filteredTeams = organizationTeams.filter(team => team.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = organizationUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTeam = organizationTeams.find(t => t.id === selectedTeamId);

  // Handlers for user management
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (userId: string, updates: Partial<User>) => {
    await api.updateUser(userId, updates);
    await refreshData();
  };

  const handleDeactivateUser = async (userId: string) => {
    await api.updateUser(userId, { status: 'inactive' } as Partial<User>);
    await refreshData();
  };

  const handleReactivateUser = async (userId: string) => {
    await api.updateUser(userId, { status: 'active' } as Partial<User>);
    await refreshData();
  };

  if (selectedUserId) return <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} onSelectTeam={(teamId) => { setSelectedUserId(null); setSelectedTeamId(teamId); }} />;
  if (selectedTeam) return <TeamDetail team={selectedTeam} onBack={() => setSelectedTeamId(null)} />;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Teams & People</h1>
               <p className="text-[#5E6C84] dark:text-gray-400 text-sm">
                 {currentOrganization
                   ? `Manage ${currentOrganization.name}'s team structure and personnel.`
                   : 'Manage your organization structure and personnel.'}
               </p>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                    <input
                        type="text"
                        placeholder={activeView === 'teams' ? "Search teams..." : "Search people..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
                    />
                 </div>
                 {activeView === 'teams' ? (
                   <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold text-sm rounded-lg hover:bg-[#172B4D]/90 dark:hover:bg-gray-100 transition-colors"
                   >
                      <Plus size={16} />
                      Create Team
                   </button>
                 ) : (
                   <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold text-sm rounded-lg hover:bg-[#172B4D]/90 dark:hover:bg-gray-100 transition-colors"
                   >
                      <UserPlus size={16} />
                      Invite People
                   </button>
                 )}
            </div>
        </div>
      </div>

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 px-8 py-4 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveView('teams')} className={`pb-3 text-sm font-bold transition-all relative ${activeView === 'teams' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                Teams
                {activeView === 'teams' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
            </button>
            <button onClick={() => setActiveView('users')} className={`pb-3 text-sm font-bold transition-all relative ${activeView === 'users' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                People
                {activeView === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
            </button>
          </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeView === 'teams' ? (
              filteredTeams.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-300">
                  <div
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-white dark:bg-[#15171E] border-2 border-dashed border-gray-300 dark:border-[#2D2F36] rounded-2xl p-12 max-w-md w-full text-center hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Users size={32} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">No teams yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                      {searchTerm ? `No teams found matching "${searchTerm}"` : 'Get started by creating your first team to organize your people and projects.'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold text-sm rounded-lg group-hover:bg-blue-600 dark:group-hover:bg-blue-500 dark:group-hover:text-white transition-colors">
                      <Plus size={18} />
                      Create Team
                    </div>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {filteredTeams.map((team) => (
                  <div 
                    key={team.id} 
                    onClick={() => setSelectedTeamId(team.id)}
                    className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-6 hover:border-blue-500/30 hover:shadow-md transition-all group flex flex-col h-full cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                          <TeamAvatar team={team} size="md" className="border border-gray-100 dark:border-[#1F2128]" />
                          <div>
                            <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">{team.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <Users size={12} />
                                <span>{team.members.length} members</span>
                            </div>
                          </div>
                      </div>
                    </div>
                    <p className="text-[#5E6C84] dark:text-gray-400 text-sm mb-6 line-clamp-2 min-h-[40px]">{team.description}</p>
                  </div>
                ))}
              </div>
              )
          ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-300">
                  <div className="text-center max-w-md">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                          <UserPlus size={40} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                          {searchTerm ? 'No people found' : 'No team members yet'}
                      </h3>
                      <p className="text-[#5E6C84] dark:text-gray-400 mb-6">
                          {searchTerm
                              ? `No people found matching "${searchTerm}". Try a different search term.`
                              : 'Start building your team by inviting people to collaborate on your products and projects.'
                          }
                      </p>
                      {!searchTerm && (
                          <button
                              onClick={() => setIsInviteModalOpen(true)}
                              className="inline-flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black hover:opacity-90 px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg text-sm"
                          >
                              <UserPlus size={18} />
                              <span>Invite Your First Member</span>
                          </button>
                      )}
                  </div>
              </div>
          ) : (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                       <thead>
                          <tr className="bg-gray-50/50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#1F2128]">
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[280px]">Name</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[150px]">Job Title</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[150px]">Location</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">Role</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">Status</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right w-[80px]">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                          {
                            filteredUsers.map(user => (
                             <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group">
                                <td className="py-4 px-6">
                                   <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                                      <div className="relative">
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                        {user.status === 'inactive' && (
                                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-[#15171E]" />
                                        )}
                                      </div>
                                      <div>
                                         <div className="font-bold text-sm text-[#172B4D] dark:text-white flex items-center gap-2">
                                           {user.name}
                                           {user.isAdmin && (
                                             <Shield size={12} className="text-purple-500" />
                                           )}
                                         </div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                      </div>
                                   </div>
                                </td>
                                <td className="py-4 px-6">
                                   <span className="text-sm text-[#172B4D] dark:text-gray-300">{user.jobTitle || '—'}</span>
                                </td>
                                <td className="py-4 px-6">
                                   {user.location ? (
                                     <span className="text-sm text-[#172B4D] dark:text-gray-300 flex items-center gap-1.5">
                                       <MapPin size={12} className="text-gray-400" />
                                       {user.location}
                                     </span>
                                   ) : (
                                     <span className="text-sm text-gray-400">—</span>
                                   )}
                                </td>
                                <td className="py-4 px-6">
                                   <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                     user.designation === 'Admin'
                                       ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                       : 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-300'
                                   }`}>
                                     {user.designation === 'Admin' && <Shield size={10} />}
                                     {user.designation || 'Member'}
                                   </span>
                                </td>
                                <td className="py-4 px-6">
                                   <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                                     user.status === 'inactive'
                                       ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                       : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                   }`}>
                                     <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'inactive' ? 'bg-red-500' : 'bg-green-500'}`} />
                                     {user.status === 'inactive' ? 'Inactive' : 'Active'}
                                   </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                   <UserActionsDropdown
                                     user={user}
                                     onEdit={() => handleEditUser(user)}
                                     onViewProfile={() => setSelectedUserId(user.id)}
                                     isAdmin={isCurrentUserAdmin}
                                   />
                                </td>
                             </tr>
                            ))}
                       </tbody>
                    </table>
                 </div>
              </div>
          )}
      </div>

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(team) => {
          addTeam(team);
          setIsCreateModalOpen(false);
        }}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSave={handleSaveUser}
        onDeactivate={handleDeactivateUser}
        onReactivate={handleReactivateUser}
        currentUserIsAdmin={isCurrentUserAdmin}
      />

      {isInviteModalOpen && (
        <InviteUserModal
          onClose={() => setIsInviteModalOpen(false)}
          onInviteSent={() => {
            setIsInviteModalOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
};

export default TeamsView;
