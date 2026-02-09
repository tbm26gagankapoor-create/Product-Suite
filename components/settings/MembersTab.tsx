import React, { useState, useEffect } from 'react';
import {
  Users, Crown, Mail, UserPlus, ChevronDown, Loader2, MoreHorizontal, X
} from 'lucide-react';
import { useProjectData } from '../../context/ProjectDataContext';
import { useToast } from '../../context/ToastContext';
import { organizationsService } from '../../services/organizations.service';
import { invitesService, OrganizationInvite } from '../../services/invites.service';
import { OrganizationRole } from '../../types';
import InviteUserModal from '../InviteUserModal';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatCard from './StatCard';
import RoleBadge from './RoleBadge';

const MembersTab: React.FC = () => {
  const {
    currentUser, currentOrganization, organizationMembers, isOrgAdmin, refreshOrganization
  } = useProjectData();
  const { error: showError, success } = useToast();

  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Pending invites state
  const [pendingInvites, setPendingInvites] = useState<OrganizationInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);

  // Load pending invites when organization changes
  useEffect(() => {
    const loadPendingInvites = async () => {
      if (!currentOrganization?.id) {
        setPendingInvites([]);
        return;
      }
      setLoadingInvites(true);
      try {
        const invites = await invitesService.getPendingByOrganization(currentOrganization.id);
        setPendingInvites(invites.filter((inv: OrganizationInvite) => inv.status === 'pending'));
      } catch (e) {
        console.error('Error loading invites:', e);
        setPendingInvites([]);
      } finally {
        setLoadingInvites(false);
      }
    };
    loadPendingInvites();
  }, [currentOrganization?.id]);

  const handleRoleChange = async (userId: string, newRole: OrganizationRole) => {
    if (!currentOrganization || !isOrgAdmin) return;
    setUpdatingRole(userId);
    try {
      await organizationsService.updateMemberRole(currentOrganization.id, userId, newRole);
      await refreshOrganization();
      success('Role Updated', 'Member role has been updated successfully');
    } catch (e) {
      console.error('Error updating role:', e);
      showError('Error', 'Failed to update member role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInvite(inviteId);
    try {
      await invitesService.resend(inviteId);
      success('Invite Resent', 'The invitation has been resent successfully');
    } catch (e) {
      console.error('Error resending invite:', e);
      showError('Error', 'Failed to resend invitation');
    } finally {
      setResendingInvite(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInvite(inviteId);
    try {
      await invitesService.revoke(inviteId);
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      success('Invite Revoked', 'The invitation has been revoked');
    } catch (e) {
      console.error('Error revoking invite:', e);
      showError('Error', 'Failed to revoke invitation');
    } finally {
      setRevokingInvite(null);
    }
  };

  // Use org members directly - roles come from the database
  const orgMembers = organizationMembers;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Team Members</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage who has access to this organization
          </p>
        </div>
        {isOrgAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg"
          >
            <UserPlus size={16} />
            Invite Members
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} value={orgMembers.length} label="Total" color="bg-blue-500" />
        <StatCard icon={Crown} value={orgMembers.filter(m => m.role === 'admin' || m.role === 'owner').length} label="Admins" color="bg-purple-500" />
        <StatCard icon={Users} value={orgMembers.filter(m => m.role === 'member').length} label="Members" color="bg-green-500" />
        <StatCard icon={Mail} value={pendingInvites.length} label="Pending" color="bg-amber-500" />
      </div>

      {/* Members Table */}
      <SectionCard>
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1F2128]">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
              {orgMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user?.avatarUrl || `https://avatar.iran.liara.run/public`}
                        alt={member.user?.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-[#1F2128]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-[#172B4D] dark:text-white flex items-center gap-2">
                          {member.user?.name || 'Unknown'}
                          {member.role === 'owner' && (
                            <Crown size={14} className="text-amber-500" />
                          )}
                          {member.userId === currentUser?.id && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {member.user?.email || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isOrgAdmin && member.userId !== currentUser?.id && member.role !== 'owner' ? (
                      <div className="relative inline-block">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as OrganizationRole)}
                          disabled={updatingRole === member.userId}
                          className="appearance-none pl-2 pr-7 py-1 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none bg-gray-100 dark:bg-[#1F2128] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#2D2F36]"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                      </div>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isOrgAdmin && member.userId !== currentUser?.id && member.role !== 'owner' && (
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orgMembers.length === 0 && (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No members found</p>
          </div>
        )}
      </SectionCard>

      {/* Pending Invites */}
      <SectionCard>
        <SectionHeader
          icon={Mail}
          title="Pending Invitations"
          description="Invitations that haven't been accepted yet"
          gradient="from-amber-500 to-orange-600"
        />
        <div className="p-4 space-y-3">
          {loadingInvites ? (
            <div className="p-8 text-center">
              <Loader2 size={24} className="mx-auto text-gray-400 animate-spin mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading invitations...</p>
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="p-8 text-center">
              <Mail size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending invitations</p>
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#172B4D] dark:text-white">
                      {invite.email}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Sent {new Date(invite.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={invite.role} />
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    disabled={resendingInvite === invite.id}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    {resendingInvite === invite.id ? 'Sending...' : 'Resend'}
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={revokingInvite === invite.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {revokingInvite === invite.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInviteSent={async () => {
            setShowInviteModal(false);
            refreshOrganization();
            // Refresh pending invites
            if (currentOrganization?.id) {
              const invites = await invitesService.getPendingByOrganization(currentOrganization.id);
              setPendingInvites(invites.filter((inv: OrganizationInvite) => inv.status === 'pending'));
            }
          }}
        />
      )}
    </div>
  );
};

export default MembersTab;
