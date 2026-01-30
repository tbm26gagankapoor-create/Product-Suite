
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Building2
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { organizationsService } from '../services/organizations.service';
import { invitesService } from '../services/invites.service';
import { OrganizationRole } from '../types';
import InviteUserModal from './InviteUserModal';
import { useToast } from '../context/ToastContext';

interface PendingInvite {
  id: string;
  email: string;
  role: OrganizationRole;
  status: string;
  createdAt: string;
  expiresAt: string;
  inviterName?: string;
}

const UserManagementView: React.FC = () => {
  const {
    currentUser,
    currentOrganization,
    organizationMembers,
    isOrgAdmin,
    refreshOrganization
  } = useProjectData();
  const { warning, success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Fetch pending invites
  useEffect(() => {
    const fetchInvites = async () => {
      if (!currentOrganization || !isOrgAdmin) return;
      try {
        const invites = await invitesService.getPendingByOrganization(currentOrganization.id);
        setPendingInvites(invites.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          createdAt: inv.created_at,
          expiresAt: inv.expires_at,
          inviterName: inv.inviter?.name
        })));
      } catch (e) {
        console.error('Error fetching invites:', e);
      }
    };
    fetchInvites();
  }, [currentOrganization, isOrgAdmin]);

  // Filter members based on search
  const filteredMembers = organizationMembers.filter(member =>
    member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: OrganizationRole) => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      await organizationsService.updateMemberRole(currentOrganization.id, userId, newRole);
      await refreshOrganization();
    } catch (e) {
      console.error('Error updating role:', e);
    }
    setIsLoading(false);
    setActionMenuOpen(null);
  };

  // Handle remove member
  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization) return;
    if (userId === currentUser?.id) {
      warning('Cannot Remove Self', 'You cannot remove yourself from the organization.');
      return;
    }
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;

    setIsLoading(true);
    try {
      await organizationsService.removeMember(currentOrganization.id, userId);
      await refreshOrganization();
    } catch (e) {
      console.error('Error removing member:', e);
    }
    setIsLoading(false);
    setActionMenuOpen(null);
  };

  // Handle resend invite
  const handleResendInvite = async (inviteId: string) => {
    setIsLoading(true);
    try {
      await invitesService.resend(inviteId);
      // Refresh invites
      if (currentOrganization) {
        const invites = await invitesService.getPendingByOrganization(currentOrganization.id);
        setPendingInvites(invites.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          createdAt: inv.created_at,
          expiresAt: inv.expires_at,
          inviterName: inv.inviter?.name
        })));
      }
    } catch (e) {
      console.error('Error resending invite:', e);
    }
    setIsLoading(false);
  };

  // Handle revoke invite
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    setIsLoading(true);
    try {
      await invitesService.revoke(inviteId);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (e) {
      console.error('Error revoking invite:', e);
    }
    setIsLoading(false);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if invite is expired
  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (!isOrgAdmin) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] items-center justify-center">
        <Shield size={64} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Only organization administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200">

      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white">
                {currentOrganization?.name || 'Organization'}
              </h1>
            </div>
            <p className="text-[#5E6C84] dark:text-gray-400 text-sm">
              Manage members and invitations for your organization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
              />
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              <UserPlus size={16} />
              Invite User
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-8 py-4 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'members' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Users size={16} />
            Members ({organizationMembers.length})
            {activeTab === 'members' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'invites' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Mail size={16} />
            Pending Invites ({pendingInvites.length})
            {activeTab === 'invites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {activeTab === 'members' ? (
          <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#1F2128]">
                    <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Member</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Org Role</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'U')}&background=random`}
                            alt={member.user?.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          />
                          <div>
                            <div className="font-bold text-sm text-[#172B4D] dark:text-white flex items-center gap-2">
                              {member.user?.name}
                              {member.userId === currentUser?.id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">You</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2 py-1 rounded bg-gray-100 dark:bg-[#2D2F36] text-xs font-medium text-gray-700 dark:text-gray-300">
                          {member.user?.role || 'Member'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          member.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-300'
                        }`}>
                          {member.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">
                        {member.joinedAt ? formatDate(member.joinedAt) : '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                            className="text-gray-400 hover:text-[#172B4D] dark:hover:text-white p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {actionMenuOpen === member.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                {member.role === 'admin' ? (
                                  <button
                                    onClick={() => handleRoleChange(member.userId, 'member')}
                                    disabled={member.userId === currentUser?.id}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1F2128] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Shield size={14} />
                                    Make Member
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRoleChange(member.userId, 'admin')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1F2128] flex items-center gap-2"
                                  >
                                    <ShieldCheck size={14} />
                                    Make Admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  disabled={member.userId === currentUser?.id}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={14} />
                                  Remove from Org
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            {pendingInvites.length === 0 ? (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-12 text-center">
                <Mail size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">No Pending Invites</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Invite users to join your organization.</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  <UserPlus size={16} />
                  Invite User
                </button>
              </div>
            ) : (
              pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2D2F36] flex items-center justify-center">
                      <Mail size={20} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#172B4D] dark:text-white">{invite.email}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          invite.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-300'
                        }`}>
                          {invite.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {isExpired(invite.expiresAt) ? (
                            <span className="text-red-500">Expired</span>
                          ) : (
                            <>Expires {formatDate(invite.expiresAt)}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResendInvite(invite.id)}
                      disabled={isLoading}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Resend Invite"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={isLoading}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Revoke Invite"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInviteSent={async () => {
            setShowInviteModal(false);
            // Refresh invites
            if (currentOrganization) {
              const invites = await invitesService.getPendingByOrganization(currentOrganization.id);
              setPendingInvites(invites.map(inv => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                createdAt: inv.created_at,
                expiresAt: inv.expires_at,
                inviterName: inv.inviter?.name
              })));
            }
          }}
        />
      )}
    </div>
  );
};

export default UserManagementView;
