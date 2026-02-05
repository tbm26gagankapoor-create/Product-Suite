import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Palette, Database, Wifi, WifiOff, RefreshCw,
  Building2, Crown, Users, ChevronDown, Plus, Loader2, Mail, Calendar,
  Sun, Moon, Monitor, Lock, Key, Globe, Layers, BarChart3, UserPlus,
  Pencil, X, Check, Camera, Save, AlertTriangle, ChevronRight, Smartphone,
  MoreHorizontal, ExternalLink, Copy, Trash2, Settings, ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../context/ProjectDataContext';
import { useConfig } from '../context/ConfigContext';
import { organizationsService } from '../services/organizations.service';
import { OrganizationRole, Organization } from '../types';
import InviteUserModal from './InviteUserModal';
import { useToast } from '../context/ToastContext';
import { invitesService, OrganizationInvite } from '../services/invites.service';

// --- Reusable UI Components ---

const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  gradient?: string;
}> = ({ icon: Icon, title, description, action, gradient = 'from-blue-500 to-indigo-600' }) => (
  <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-[#1F2128]">
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    {action}
  </div>
);

const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}> = ({ title, description, children, noBorder = false }) => (
  <div className={`flex items-center justify-between px-6 py-4 ${!noBorder ? 'border-b border-gray-100 dark:border-[#1F2128]' : ''}`}>
    <div className="flex-1 mr-4">
      <h3 className="text-sm font-semibold text-[#172B4D] dark:text-white">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-all ${
      checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'left-6' : 'left-1'
      }`}
    />
  </button>
);

const RoleBadge: React.FC<{ role: OrganizationRole }> = ({ role }) => {
  const { getRoleConfig } = useConfig();
  const roleConfig = getRoleConfig(role);

  // Fallback colors if config not found
  const fallbackColors: Record<OrganizationRole, string> = {
    owner: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    member: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700',
  };

  const colorClass = roleConfig
    ? `${roleConfig.bg_color} ${roleConfig.color} border-gray-200 dark:border-gray-700`
    : fallbackColors[role];

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${colorClass}`}>
      {roleConfig?.label || role}
    </span>
  );
};

const StatCard: React.FC<{
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-gray-50 dark:bg-[#1F2128] rounded-xl p-4 border border-gray-100 dark:border-[#2D2F36]">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{value}</div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  </div>
);

// --- Main Component ---

type SettingsTab = 'profile' | 'organization' | 'members' | 'appearance' | 'notifications' | 'security';

const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const {
    connectionStatus, connectionError, refreshData, projects, tasks, sprints, teams,
    currentUser, currentOrganization, organizationMembers, isOrgAdmin, refreshOrganization, users,
    updateCurrentUser, userOrganizations, switchOrganization
  } = useProjectData();
  const { error: showError, success } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Profile edit state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileJobTitle, setProfileJobTitle] = useState(currentUser?.jobTitle || '');
  const [profileLocation, setProfileLocation] = useState(currentUser?.location || '');
  const [profileBio, setProfileBio] = useState(currentUser?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Organization edit state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgSlug, setEditOrgSlug] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgEditError, setOrgEditError] = useState<string | null>(null);

  // Organization switching state
  const [switchingOrg, setSwitchingOrg] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssigned: true,
    mentions: true,
    sprintUpdates: true,
    projectUpdates: false,
  });

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

  // Initialize edit form when organization changes or edit mode starts
  useEffect(() => {
    if (currentOrganization && isEditingOrg) {
      setEditOrgName(currentOrganization.name);
      setEditOrgSlug(currentOrganization.slug);
      setOrgEditError(null);
    }
  }, [currentOrganization, isEditingOrg]);

  // Initialize profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileJobTitle(currentUser.jobTitle || '');
      setProfileLocation(currentUser.location || '');
      setProfileBio(currentUser.bio || '');
    }
  }, [currentUser]);

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!currentUser || savingProfile) return;
    setSavingProfile(true);
    try {
      await updateCurrentUser({
        name: profileName,
        jobTitle: profileJobTitle,
        location: profileLocation,
        bio: profileBio,
      });
      success('Profile updated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'organization' as const, label: 'Organization', icon: Building2 },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ];

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

  const handleCreateOrganization = async () => {
    if (!currentUser || creatingOrg) return;
    const name = orgName.trim() || `${currentUser.name}'s Organization`;
    setCreatingOrg(true);
    try {
      await organizationsService.setupForExistingUser(currentUser.id, name);
      await refreshData();
      success('Organization Created', `${name} has been created successfully`);
    } catch (e: any) {
      console.error('Error creating organization:', e);
      showError('Organization Error', e.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
      setOrgName('');
    }
  };

  const handleSaveOrganization = async () => {
    if (!currentOrganization || !isOrgAdmin || savingOrg) return;

    const trimmedName = editOrgName.trim();
    const trimmedSlug = editOrgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!trimmedName) {
      setOrgEditError('Organization name is required');
      return;
    }

    if (!trimmedSlug || trimmedSlug.length < 3) {
      setOrgEditError('Slug must be at least 3 characters');
      return;
    }

    setSavingOrg(true);
    setOrgEditError(null);

    try {
      if (trimmedSlug !== currentOrganization.slug) {
        const existing = await organizationsService.getBySlug(trimmedSlug);
        if (existing) {
          setOrgEditError('This slug is already taken');
          setSavingOrg(false);
          return;
        }
      }

      await organizationsService.update(currentOrganization.id, {
        name: trimmedName,
        slug: trimmedSlug,
      });

      await refreshOrganization();
      setIsEditingOrg(false);
      success('Organization Updated', 'Settings have been saved');
    } catch (e: any) {
      setOrgEditError(e.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
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
    <div className="flex-1 overflow-hidden bg-[#F8F9FC] dark:bg-[#0B0C0E] flex">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Settings
          </div>
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1F2128]'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronRight size={16} className="ml-auto" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-3xl mx-auto">

          {/* === PROFILE TAB === */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Profile Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage your personal information and preferences
                </p>
              </div>

              {/* Profile Photo Card */}
              <SectionCard>
                <div className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src={currentUser?.avatarUrl || 'https://avatar.iran.liara.run/public'}
                        alt={currentUser?.name || 'User'}
                        className="w-24 h-24 rounded-2xl object-cover ring-4 ring-gray-100 dark:ring-[#1F2128]"
                      />
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors">
                        <Camera size={16} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">
                        {currentUser?.name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {currentUser?.designation || 'Team Member'}
                      </p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                          Change Photo
                        </button>
                        <button className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Personal Information */}
              <SectionCard>
                <SectionHeader
                  icon={User}
                  title="Personal Information"
                  description="Update your personal details"
                />
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={currentUser?.email || ''}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={profileJobTitle}
                        onChange={(e) => setProfileJobTitle(e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Location
                      </label>
                      <input
                        type="text"
                        value={profileLocation}
                        onChange={(e) => setProfileLocation(e.target.value)}
                        placeholder="San Francisco, CA"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Tell us a bit about yourself..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* === ORGANIZATION TAB === */}
          {activeTab === 'organization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Organization Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage your organization's profile and settings
                </p>
              </div>

              {/* Organization Switcher - Show if user has multiple orgs */}
              {userOrganizations.length > 1 && (
                <SectionCard className="mb-6">
                  <SectionHeader
                    icon={Layers}
                    title="Your Organizations"
                    description="Switch between organizations you belong to"
                    gradient="from-indigo-500 to-purple-600"
                  />
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {userOrganizations.map((membership) => {
                        const isActive = membership.organization.id === currentOrganization?.id;
                        return (
                          <button
                            key={membership.organization.id}
                            onClick={async () => {
                              if (!isActive && !switchingOrg) {
                                setSwitchingOrg(true);
                                try {
                                  await switchOrganization(membership.organization.id);
                                  success('Organization Switched', `Now viewing ${membership.organization.name}`);
                                } catch (e) {
                                  showError('Switch Failed', 'Could not switch organization');
                                } finally {
                                  setSwitchingOrg(false);
                                }
                              }
                            }}
                            disabled={switchingOrg}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#1F2128]'
                            } ${switchingOrg ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {membership.organization.logoUrl ? (
                                <img
                                  src={membership.organization.logoUrl}
                                  alt={membership.organization.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                  isActive ? 'bg-blue-500' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}>
                                  {membership.organization.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-sm truncate ${
                                  isActive ? 'text-blue-700 dark:text-blue-400' : 'text-[#172B4D] dark:text-white'
                                }`}>
                                  {membership.organization.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                  {membership.role}
                                </p>
                              </div>
                              {isActive && (
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Check size={12} className="text-white" />
                                </div>
                              )}
                            </div>
                            {isActive && (
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-500 text-white rounded-full">
                                  Active
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>
              )}

              {currentOrganization ? (
                <>
                  {/* Organization Profile Card */}
                  <SectionCard>
                    <SectionHeader
                      icon={Building2}
                      title="Organization Profile"
                      description="Public information about your organization"
                      gradient="from-purple-500 to-violet-600"
                      action={
                        isOrgAdmin && !isEditingOrg && (
                          <button
                            onClick={() => {
                              setEditOrgName(currentOrganization.name);
                              setEditOrgSlug(currentOrganization.slug);
                              setIsEditingOrg(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2128] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-colors"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        )
                      }
                    />
                    <div className="p-6">
                      {isEditingOrg ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                Organization Name
                              </label>
                              <input
                                type="text"
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                URL Slug
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                  app/
                                </span>
                                <input
                                  type="text"
                                  value={editOrgSlug}
                                  onChange={(e) => setEditOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          {orgEditError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertTriangle size={16} />
                              {orgEditError}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setIsEditingOrg(false)}
                              disabled={savingOrg}
                              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveOrganization}
                              disabled={savingOrg}
                              className="flex items-center gap-2 px-5 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-semibold text-sm rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                            >
                              {savingOrg ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Save size={16} />
                              )}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="flex items-center gap-6 pb-5 border-b border-gray-100 dark:border-[#1F2128]">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                              {currentOrganization.name?.substring(0, 2).toUpperCase() || 'ORG'}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-[#172B4D] dark:text-white">
                                {currentOrganization.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                                <Globe size={14} />
                                vulcan.app/{currentOrganization.slug}
                              </p>
                              <div className="flex items-center gap-4 mt-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-[#172B4D] dark:text-white">{organizationMembers.length}</span> members
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-[#172B4D] dark:text-white">{projects.length}</span> projects
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-4">
                            <StatCard icon={Users} value={organizationMembers.length} label="Members" color="bg-blue-500" />
                            <StatCard icon={Crown} value={organizationMembers.filter(m => m.role === 'admin' || m.role === 'owner').length} label="Admins" color="bg-purple-500" />
                            <StatCard icon={Layers} value={projects.length} label="Projects" color="bg-green-500" />
                            <StatCard icon={BarChart3} value={tasks.length} label="Tasks" color="bg-amber-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {/* Domain Settings */}
                  <SectionCard>
                    <SectionHeader
                      icon={Globe}
                      title="Domain Settings"
                      description="Control how users can join your organization"
                      gradient="from-green-500 to-emerald-600"
                    />
                    <div>
                      <SettingRow
                        title="Verified Domain"
                        description="Users with this email domain can request to join"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium rounded-lg border border-green-200 dark:border-green-800">
                            {currentUser?.email?.split('@')[1] || 'example.com'}
                          </span>
                          {isOrgAdmin && (
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      </SettingRow>
                      <SettingRow
                        title="Allow Domain Auto-Join"
                        description="Let users with verified domain join without approval"
                      >
                        <Toggle checked={false} onChange={() => {}} disabled={!isOrgAdmin} />
                      </SettingRow>
                      <SettingRow
                        title="Require Admin Approval"
                        description="New members need admin approval to join"
                        noBorder
                      >
                        <Toggle checked={true} onChange={() => {}} disabled={!isOrgAdmin} />
                      </SettingRow>
                    </div>
                  </SectionCard>

                  {/* Danger Zone */}
                  {isOrgAdmin && (
                    <SectionCard className="border-red-200 dark:border-red-900/50">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Irreversible actions that affect your organization
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            Transfer Ownership
                          </button>
                          <button className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            Delete Organization
                          </button>
                        </div>
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : (
                /* Create Organization Flow */
                <SectionCard>
                  <div className="p-8 text-center max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <Building2 size={36} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                      Create Your Organization
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Set up your workspace to start collaborating with your team
                    </p>

                    <div className="space-y-4 text-left">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder={`${currentUser?.name || 'My'}'s Organization`}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <button
                        onClick={handleCreateOrganization}
                        disabled={creatingOrg}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                      >
                        {creatingOrg ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Plus size={18} />
                            Create Organization
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* === MEMBERS TAB === */}
          {activeTab === 'members' && (
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
            </div>
          )}

          {/* === APPEARANCE TAB === */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Appearance</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Customize how Vulcan looks for you
                </p>
              </div>

              {/* Theme Selection */}
              <SectionCard>
                <SectionHeader
                  icon={Palette}
                  title="Theme"
                  description="Choose your preferred color scheme"
                  gradient="from-pink-500 to-rose-600"
                />
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Light Theme */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-full aspect-video bg-[#F8F9FC] rounded-lg border border-gray-200 mb-3 flex flex-col overflow-hidden">
                        <div className="h-3 bg-white border-b border-gray-200" />
                        <div className="flex-1 p-2">
                          <div className="h-2 w-1/2 bg-gray-200 rounded mb-1.5" />
                          <div className="h-2 w-3/4 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                        <Sun size={16} />
                        Light
                        {theme === 'light' && <Check size={16} className="text-blue-500" />}
                      </div>
                    </button>

                    {/* Dark Theme */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-full aspect-video bg-[#0B0C0E] rounded-lg border border-[#2D2F36] mb-3 flex flex-col overflow-hidden">
                        <div className="h-3 bg-[#15171E] border-b border-[#2D2F36]" />
                        <div className="flex-1 p-2">
                          <div className="h-2 w-1/2 bg-[#2D2F36] rounded mb-1.5" />
                          <div className="h-2 w-3/4 bg-[#2D2F36] rounded" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                        <Moon size={16} />
                        Dark
                        {theme === 'dark' && <Check size={16} className="text-blue-500" />}
                      </div>
                    </button>

                    {/* System Theme */}
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'system'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-full aspect-video bg-gradient-to-br from-[#F8F9FC] to-[#0B0C0E] rounded-lg border border-gray-200 dark:border-[#2D2F36] mb-3 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">AUTO</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                        <Monitor size={16} />
                        System
                        {theme === 'system' && <Check size={16} className="text-blue-500" />}
                      </div>
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* === NOTIFICATIONS TAB === */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Notifications</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Choose what you want to be notified about
                </p>
              </div>

              {/* Email Notifications */}
              <SectionCard>
                <SectionHeader
                  icon={Mail}
                  title="Email Notifications"
                  description="Control which emails you receive"
                  gradient="from-blue-500 to-cyan-600"
                />
                <div>
                  <SettingRow
                    title="Daily Summary"
                    description="Receive a daily digest of your tasks and updates"
                  >
                    <Toggle
                      checked={notifications.email}
                      onChange={(v) => setNotifications({ ...notifications, email: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Task Assignments"
                    description="When you're assigned to a new task"
                  >
                    <Toggle
                      checked={notifications.taskAssigned}
                      onChange={(v) => setNotifications({ ...notifications, taskAssigned: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Comments & Mentions"
                    description="When someone mentions you in a comment"
                  >
                    <Toggle
                      checked={notifications.mentions}
                      onChange={(v) => setNotifications({ ...notifications, mentions: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Sprint Updates"
                    description="When sprints start, end, or are modified"
                  >
                    <Toggle
                      checked={notifications.sprintUpdates}
                      onChange={(v) => setNotifications({ ...notifications, sprintUpdates: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Product Updates"
                    description="News about new features and improvements"
                    noBorder
                  >
                    <Toggle
                      checked={notifications.projectUpdates}
                      onChange={(v) => setNotifications({ ...notifications, projectUpdates: v })}
                    />
                  </SettingRow>
                </div>
              </SectionCard>

              {/* Push Notifications */}
              <SectionCard>
                <SectionHeader
                  icon={Bell}
                  title="Push Notifications"
                  description="Real-time notifications in your browser"
                  gradient="from-violet-500 to-purple-600"
                />
                <div>
                  <SettingRow
                    title="Enable Push Notifications"
                    description="Get real-time updates even when the tab is closed"
                    noBorder
                  >
                    <Toggle
                      checked={notifications.push}
                      onChange={(v) => setNotifications({ ...notifications, push: v })}
                    />
                  </SettingRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* === SECURITY TAB === */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Security</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage your account security and authentication
                </p>
              </div>

              {/* Password */}
              <SectionCard>
                <SectionHeader
                  icon={Key}
                  title="Password"
                  description="Manage your account password"
                  gradient="from-blue-500 to-indigo-600"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#172B4D] dark:text-white">
                        Password last changed
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        3 months ago
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      Change Password
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* Two-Factor Authentication */}
              <SectionCard>
                <SectionHeader
                  icon={Smartphone}
                  title="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                  gradient="from-amber-500 to-orange-600"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Shield size={20} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          2FA is not enabled
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Protect your account with two-factor authentication
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* Active Sessions */}
              <SectionCard>
                <SectionHeader
                  icon={Lock}
                  title="Active Sessions"
                  description="Devices currently logged into your account"
                  gradient="from-green-500 to-emerald-600"
                />
                <div className="p-4 space-y-3">
                  {[
                    { device: 'MacBook Pro', location: 'San Francisco, CA', current: true },
                    { device: 'iPhone 15 Pro', location: 'San Francisco, CA', current: false },
                  ].map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Monitor size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#172B4D] dark:text-white flex items-center gap-2">
                            {session.device}
                            {session.current && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {session.location}
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <button className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Danger Zone */}
              <SectionCard className="border-red-200 dark:border-red-900/50">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-600 dark:text-red-400">Delete Account</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button className="mt-4 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      </div>

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

export default SettingsView;
