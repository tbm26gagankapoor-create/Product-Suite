import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Mail, Trophy, Target, ArrowUpRight, CheckCircle2,
  Clock, Layers, Lightbulb, Users
} from 'lucide-react';
import ProductIcon from '../ProductIcon';
import { useProjectData } from '../../context/ProjectDataContext';
import { api } from '../../lib/api';

interface UserDetailProps {
  userId: string;
  onBack: () => void;
  onSelectTeam?: (teamId: string) => void;
}

type TaskFilter = 'all' | 'inprogress' | 'blocked' | 'done' | 'high';

const UserDetail: React.FC<UserDetailProps> = ({ userId, onBack, onSelectTeam }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'context'>('overview');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  // Use organization-scoped data for user lookup
  const { organizationMembers, users } = useProjectData();
  const organizationUsers = organizationMembers.map(m => m.user);

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

  const pointsWon = completedTasks.reduce((acc: number, t: any) => acc + (t.points || 0), 0);
  const pointsPending = activeTasks.reduce((acc: number, t: any) => acc + (t.points || 0), 0);
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
                    <Lightbulb size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No products assigned</p>
                  </div>
                ) : (
                  userProjects.map(project => (
                    <button
                      key={project.id}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-500 transition-all cursor-pointer group text-left"
                    >
                      <ProductIcon project={project} size="sm" />
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
                        {team.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
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

export default UserDetail;
