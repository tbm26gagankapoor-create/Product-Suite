import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, AlertCircle, Clock,
  Layers, Trophy, Lightbulb
} from 'lucide-react';
import ProductIcon from '../ProductIcon';
import TeamAvatar from '../ui/TeamAvatar';
import { Team, User } from '../../types';
import { useProjectData } from '../../context/ProjectDataContext';
import { api } from '../../lib/api';

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
    const memberTasks = (memberTasksMap.get(memberId) || []).filter(t => t.type !== 'epic');
    const completed = memberTasks.filter(t => t.columnId === 'done').length;
    const inProgress = memberTasks.filter(t => t.columnId === 'inprogress').length;
    const blocked = memberTasks.filter(t => t.columnId === 'blocked').length;
    const totalPoints = memberTasks.reduce((acc: number, t: any) => acc + (t.points || 0), 0);
    const completedPoints = memberTasks.filter(t => t.columnId === 'done').reduce((acc: number, t: any) => acc + (t.points || 0), 0);
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
                <Lightbulb size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No products assigned</p>
              </div>
            ) : (
              teamProjects.map(project => {
                const projectTasks = (projectTasksMap.get(project.id) || []).filter((t: any) => t.type !== 'epic');
                const projectCompleted = projectTasks.filter((t: any) => t.columnId === 'done').length;
                const projectInProgress = projectTasks.filter((t: any) => t.columnId === 'inprogress').length;
                return (
                  <div key={project.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <ProductIcon project={project} size="md" />
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

export default TeamDetail;
