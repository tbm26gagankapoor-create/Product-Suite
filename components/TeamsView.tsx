
import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, MoreHorizontal, Users, Search, MapPin, Edit2,
  UserX, UserCheck, Shield, UserPlus
} from 'lucide-react';
import { Team, User } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import CreateTeamModal from './CreateTeamModal';
import EditUserModal from './EditUserModal';
import InviteUserModal from './InviteUserModal';
import { api } from '../lib/api';
import TeamAvatar from './ui/TeamAvatar';
import UserDetail from './teams/UserDetail';
import TeamDetail from './teams/TeamDetail';

// --- Actions Dropdown Component (kept inline - small, tightly coupled) ---
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
  const { organizationTeams, organizationMembers, addTeam, currentOrganization, currentUser, refreshData } = useProjectData();
  const organizationUsers = organizationMembers.map(m => m.user);

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
