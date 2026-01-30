
import React, { useState } from 'react';
import { 
  Plus, MoreHorizontal, Users, Grid, Settings, ChevronsRight, Search, List as ListIcon, LayoutGrid, ArrowLeft,
  Mail, Trophy, Target, ArrowUpRight, CheckCircle2, AlertCircle, Clock, Layers, Briefcase
} from 'lucide-react';
import { Team, User } from '../types';
import { useProjectData } from '../context/ProjectDataContext';

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
}

const UserDetail: React.FC<UserDetailProps> = ({ userId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'context'>('overview');
  const { tasks, teams, users, projects } = useProjectData();
  
  const user = users.find(u => u.id === userId);
  if (!user) return <div>User not found</div>;

  const userTasks = tasks.filter(t => t.assignee?.id === userId);
  const completedTasks = userTasks.filter(t => t.columnId === 'done');
  const activeTasks = userTasks.filter(t => t.columnId !== 'done');
  
  const pointsWon = completedTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const pointsPending = activeTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  
  const userTeams = teams.filter(t => t.members.includes(userId));
  const userProjects = projects.filter(p => p.members.includes(userId));

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B0C0E] p-8 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300 h-full">
       <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#172B4D] dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                    <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-50 dark:ring-[#0B0C0E]" />
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1 flex items-center gap-3">
                        {user.name}
                        {user.isAdmin && <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 uppercase tracking-wide">Admin</span>}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
                        <span className="font-medium text-[#172B4D] dark:text-gray-200">{user.role || 'Team Member'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Mail size={14} /> {user.email}</span>
                    </div>
                </div>
                
                <div className="w-full md:w-auto">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1F2128] border border-gray-100 dark:border-[#2D2F36] min-w-[140px]">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Tasks</div>
                        <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{userTasks.length}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Trophy size={64} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-green-100 font-medium text-sm uppercase tracking-wide"><Trophy size={16} /> Points Won</div>
                    <div className="text-4xl font-bold mb-1">{pointsWon}</div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Target size={64} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-blue-100 font-medium text-sm uppercase tracking-wide"><Target size={16} /> Pending</div>
                    <div className="text-4xl font-bold mb-1">{pointsPending}</div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-8 border-b border-gray-200 dark:border-[#1F2128] mb-6">
            {['overview', 'tasks', 'context'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    {tab === 'context' ? 'Products & Teams' : tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-white rounded-t-full"></div>}
                </button>
            ))}
        </div>

        <div className="min-h-[400px]">
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Active Priorities</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {activeTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
                                <div className={`p-2 rounded-lg ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {task.priority === 'HIGH' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-[#172B4D] dark:text-white">{task.title}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-[#172B4D] dark:text-white">{task.points} pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {activeTab === 'context' && (
                <div className="space-y-8">
                    <section>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Assigned Products</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userProjects.map(project => (
                                <div key={project.id} className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] p-4 rounded-xl flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${project.color} flex items-center justify-center text-white font-bold`}>{project.key}</div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#172B4D] dark:text-white">{project.name}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
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
  const teamMembers = users.filter(u => team.members.includes(u.id));
  const teamProjects = projects.filter(p => team.projectIds.includes(p.id));

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B0C0E] p-8 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300 h-full">
       <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#172B4D] dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                    <TeamAvatar team={team} size="xl" className="ring-4 ring-gray-50 dark:ring-[#0B0C0E]" />
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-2">{team.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-2xl leading-relaxed">{team.description}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-gray-50/50 dark:bg-[#1F2128]/50">
                    <h3 className="font-bold text-[#172B4D] dark:text-white">Team Members</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {teamMembers.map(member => (
                        <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors">
                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-[#2D2F36]" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-[#172B4D] dark:text-white">{member.name}</h4>
                                <div className="text-xs text-gray-500">{member.role}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-gray-50/50 dark:bg-[#1F2128]/50">
                    <h3 className="font-bold text-[#172B4D] dark:text-white">Assigned Products</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                    {teamProjects.map(project => (
                        <div key={project.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${project.color} flex items-center justify-center text-white font-bold text-xs`}>{project.key}</div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-[#172B4D] dark:text-white">{project.name}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

const TeamsView: React.FC = () => {
  const [activeView, setActiveView] = useState<'teams' | 'users'>('teams');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { teams, users } = useProjectData();

  const filteredTeams = teams.filter(team => team.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = users.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  if (selectedUserId) return <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  if (selectedTeam) return <TeamDetail team={selectedTeam} onBack={() => setSelectedTeamId(null)} />;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Teams & People</h1>
               <p className="text-[#5E6C84] dark:text-gray-400 text-sm">Manage your organization structure and personnel.</p>
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
          ) : (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-gray-50/50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#1F2128]">
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                             <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                          {filteredUsers.map(user => (
                             <tr key={user.id} onClick={() => setSelectedUserId(user.id)} className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors group cursor-pointer">
                                <td className="py-4 px-6">
                                   <div className="flex items-center gap-3">
                                      <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                      <div>
                                         <div className="font-bold text-sm text-[#172B4D] dark:text-white">{user.name}</div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                      </div>
                                   </div>
                                </td>
                                <td className="py-4 px-6">
                                   <span className="inline-block px-2 py-1 rounded bg-gray-100 dark:bg-[#2D2F36] text-xs font-medium text-gray-700 dark:text-gray-300">{user.role || 'Member'}</span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                   <button className="text-gray-400 hover:text-[#172B4D] dark:hover:text-white p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"><MoreHorizontal size={16} /></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default TeamsView;
