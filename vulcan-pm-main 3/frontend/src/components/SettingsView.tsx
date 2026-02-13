
import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Palette, Database, Wifi, WifiOff, RefreshCw,
  Building2, Crown, Users, ChevronDown, Plus, Loader2, Mail, Calendar,
  Sun, Moon, Monitor, Lock, Key, Globe, Layers, BarChart3, UserPlus,
  Pencil, X, Check, GitBranch
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../context/ProjectDataContext';
import { organizationsService } from '../services/organizations.service';
import { OrganizationRole } from '../types';
import InviteUserModal from './InviteUserModal';
import { useToast } from '../context/ToastContext';
import { GitConnectionsPanel } from './git';

const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const {
    connectionStatus, connectionError, refreshData, projects, tasks, sprints, teams,
    currentUser, currentOrganization, organizationMembers, isOrgAdmin, refreshOrganization
  } = useProjectData();
  const { error: showError, success } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Organization edit state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgSlug, setEditOrgSlug] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgEditError, setOrgEditError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Initialize edit form when organization changes or edit mode starts
  useEffect(() => {
    if (currentOrganization && isEditingOrg) {
      setEditOrgName(currentOrganization.name);
      setEditOrgSlug(currentOrganization.slug);
      setOrgEditError(null);
    }
  }, [currentOrganization, isEditingOrg]);

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'integrations', label: 'Integrations', icon: GitBranch },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleRoleChange = async (userId: string, newRole: OrganizationRole) => {
    if (!currentOrganization || !isOrgAdmin) return;
    setUpdatingRole(userId);
    try {
      await organizationsService.updateMemberRole(currentOrganization.id, userId, newRole);
      await refreshOrganization();
    } catch (e) {
      console.error('Error updating role:', e);
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
    } catch (e: any) {
      console.error('Error creating organization:', e);
      showError('Organization Error', e.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
      setOrgName('');
    }
  };

  const handleStartEditOrg = () => {
    if (!currentOrganization) return;
    setEditOrgName(currentOrganization.name);
    setEditOrgSlug(currentOrganization.slug);
    setOrgEditError(null);
    setIsEditingOrg(true);
  };

  const handleCancelEditOrg = () => {
    setIsEditingOrg(false);
    setOrgEditError(null);
  };

  const handleSaveOrganization = async () => {
    if (!currentOrganization || !isOrgAdmin || savingOrg) return;

    const trimmedName = editOrgName.trim();
    const trimmedSlug = editOrgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!trimmedName) {
      setOrgEditError('Organization name is required');
      return;
    }

    if (!trimmedSlug) {
      setOrgEditError('Organization slug is required');
      return;
    }

    if (trimmedSlug.length < 3) {
      setOrgEditError('Slug must be at least 3 characters');
      return;
    }

    setSavingOrg(true);
    setOrgEditError(null);

    try {
      // Check if slug is already taken (if changed)
      if (trimmedSlug !== currentOrganization.slug) {
        const existing = await organizationsService.getBySlug(trimmedSlug);
        if (existing) {
          setOrgEditError('This slug is already taken. Please choose another.');
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
    } catch (e: any) {
      console.error('Error updating organization:', e);
      setOrgEditError(e.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  // Infinia Design System - Stat Card Component
  const StatCard = ({ icon: Icon, value, label, color }: { icon: any, value: number | string, label: string, color: string }) => (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#2E2E2E] hover:border-gray-300 dark:border-[#3E3E3E] transition-all">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs font-medium text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );

  // Infinia Design System - Section Header Component
  const SectionHeader = ({ icon: Icon, title, description }: { icon: any, title: string, description?: string }) => (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {description && <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-0.5">{description}</p>}
      </div>
    </div>
  );

  // Infinia Design System - Card Container Component
  const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#2E2E2E] ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0D0D0D] custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Settings</h1>
          <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Manage your account and workspace preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar Navigation */}
          <div className="lg:w-52 flex-shrink-0">
            <Card className="p-2 sticky top-6">
              <nav className="space-y-0.5">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20'
                        : 'text-gray-500 dark:text-[#9CA3AF] hover:bg-gray-100 dark:bg-[#252525] hover:text-white border border-transparent'
                    }`}
                  >
                    <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* === PROFILE TAB === */}
            {activeTab === 'profile' && currentUser && (
              <Card className="overflow-hidden">
                {/* Profile Header - Glassmorphism */}
                <div className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] p-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/20"
                    />
                    <div className="text-white flex-1">
                      <h2 className="text-lg font-bold">{currentUser.name}</h2>
                      <p className="text-white/70 text-sm">{currentUser.role || 'Team Member'}</p>
                      {currentOrganization && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-white/60 text-xs">
                          <Building2 size={12} />
                          {currentOrganization.name}
                        </div>
                      )}
                    </div>
                    {isOrgAdmin && (
                      <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full flex items-center gap-1.5 border border-white/10">
                        <Crown size={11} />
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Form */}
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Full Name</label>
                      <div className="flex items-center gap-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg px-3 py-2.5">
                        <User size={14} className="text-gray-400 dark:text-[#6B7280]" />
                        <span className="text-sm text-gray-900 dark:text-white">{currentUser.name}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Email Address</label>
                      <div className="flex items-center gap-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg px-3 py-2.5">
                        <Mail size={14} className="text-gray-400 dark:text-[#6B7280]" />
                        <span className="text-sm text-gray-900 dark:text-white">{currentUser.email || 'Not set'}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Role</label>
                      <div className="flex items-center gap-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg px-3 py-2.5">
                        <Layers size={14} className="text-gray-400 dark:text-[#6B7280]" />
                        <span className="text-sm text-gray-900 dark:text-white">{currentUser.role || 'Member'}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Organization</label>
                      <div className="flex items-center gap-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg px-3 py-2.5">
                        <Building2 size={14} className="text-gray-400 dark:text-[#6B7280]" />
                        <span className="text-sm text-gray-900 dark:text-white">{currentOrganization?.name || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === ORGANIZATION TAB === */}
            {activeTab === 'organization' && (
              <>
                {currentOrganization ? (
                  <>
                    {/* Org Header Card - Infinia Design */}
                    <Card className="overflow-hidden">
                      {/* Header Section */}
                      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Building2 size={28} className="text-white" />
                          </div>
                          <div className="text-white flex-1">
                            <h2 className="text-lg font-bold">{currentOrganization.name}</h2>
                            <p className="text-white/60 text-sm flex items-center gap-1.5 mt-0.5 font-mono">
                              <Globe size={12} />
                              {currentOrganization.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOrgAdmin && !isEditingOrg && (
                              <button
                                onClick={handleStartEditOrg}
                                className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-lg transition-colors border border-white/10"
                                title="Edit organization"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {isOrgAdmin && (
                              <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full flex items-center gap-1.5 border border-white/10">
                                <Crown size={11} />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit Form Section - Shown when editing */}
                      {isEditingOrg && (
                        <div className="p-4 bg-white dark:bg-[#0D0D0D] border-b border-gray-200 dark:border-[#2E2E2E]">
                          <div className="flex items-center gap-2 mb-4">
                            <Pencil size={14} className="text-[#3B82F6]" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Edit Organization Details</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Organization Name</label>
                              <input
                                type="text"
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 text-sm"
                                placeholder="Enter organization name"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Slug (URL identifier)</label>
                              <div className="relative">
                                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6B7280]" />
                                <input
                                  type="text"
                                  value={editOrgSlug}
                                  onChange={(e) => setEditOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 text-sm font-mono"
                                  placeholder="organization-slug"
                                />
                              </div>
                            </div>
                          </div>

                          {orgEditError && (
                            <div className="mt-3 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-xs font-medium flex items-center gap-2">
                              <X size={14} />
                              {orgEditError}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 mt-4">
                            <button
                              onClick={handleCancelEditOrg}
                              disabled={savingOrg}
                              className="px-4 py-2 text-gray-500 dark:text-[#9CA3AF] hover:text-white hover:bg-gray-100 dark:bg-[#252525] rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveOrganization}
                              disabled={savingOrg}
                              className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              {savingOrg ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Check size={14} />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid - High Density */}
                      <div className="p-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <StatCard icon={Users} value={organizationMembers.length} label="Members" color="bg-[#3B82F6]" />
                          <StatCard icon={Crown} value={organizationMembers.filter(m => m.role === 'admin').length} label="Admins" color="bg-[#8B5CF6]" />
                          <StatCard icon={Layers} value={projects.length} label="Projects" color="bg-[#10B981]" />
                          <StatCard icon={BarChart3} value={tasks.length} label="Tasks" color="bg-[#F59E0B]" />
                        </div>
                      </div>
                    </Card>

                    {/* Members Card - Infinia Design */}
                    <Card>
                      <div className="p-4 border-b border-gray-200 dark:border-[#2E2E2E] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
                            <Users size={16} className="text-[#3B82F6]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Team Members</h3>
                            <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                              {organizationMembers.length} member{organizationMembers.length !== 1 ? 's' : ''} in your organization
                            </p>
                          </div>
                        </div>
                        {isOrgAdmin && (
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <UserPlus size={14} />
                            Invite
                          </button>
                        )}
                      </div>

                      {/* Members List - High Density */}
                      <div className="divide-y divide-[#2E2E2E]">
                        {organizationMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:bg-[#252525] transition-colors">
                            <img
                              src={member.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'U')}&background=3B82F6&color=fff`}
                              alt={member.user?.name}
                              className="w-9 h-9 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                  {member.user?.name || 'Unknown'}
                                </span>
                                {member.userId === currentUser?.id && (
                                  <span className="px-1.5 py-0.5 bg-[#3B82F6]/20 text-[#3B82F6] text-[10px] font-semibold rounded">You</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate">{member.user?.email || '-'}</span>
                                <span className="text-gray-500 dark:text-[#4B5563]">·</span>
                                <span className="text-xs text-gray-400 dark:text-[#6B7280]">{member.user?.role || 'Member'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOrgAdmin && member.userId !== currentUser?.id ? (
                                <div className="relative">
                                  <select
                                    value={member.role}
                                    onChange={(e) => handleRoleChange(member.userId, e.target.value as OrganizationRole)}
                                    disabled={updatingRole === member.userId}
                                    className={`appearance-none pl-2.5 pr-7 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all focus:outline-none focus:ring-1 ${
                                      member.role === 'admin'
                                        ? 'bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/30 focus:ring-[#8B5CF6]/50'
                                        : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-[#9CA3AF] border-gray-200 dark:border-[#2E2E2E] focus:ring-[#3B82F6]/50'
                                    } ${updatingRole === member.userId ? 'opacity-50' : ''}`}
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                  </select>
                                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-[#6B7280]" />
                                </div>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  member.role === 'admin'
                                    ? 'bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20'
                                    : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-[#9CA3AF] border border-gray-200 dark:border-[#2E2E2E]'
                                }`}>
                                  {member.role === 'admin' ? 'Admin' : 'Member'}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-[#6B7280] hidden sm:block whitespace-nowrap">
                                {member.joinedAt
                                  ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                  : '-'
                                }
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {organizationMembers.length === 0 && (
                        <div className="p-10 text-center">
                          <Users size={36} className="mx-auto text-gray-500 dark:text-[#4B5563] mb-3" />
                          <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">No members found</p>
                        </div>
                      )}
                    </Card>
                  </>
                ) : (
                  /* No Organization - Create Form - Infinia Design */
                  <Card className="p-6">
                    <div className="max-w-sm mx-auto text-center">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center">
                        <Building2 size={32} className="text-white" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">Create Your Organization</h2>
                      <p className="text-gray-500 dark:text-[#9CA3AF] text-sm mb-6">
                        Set up your workspace to start collaborating with your team
                      </p>

                      <div className="space-y-4 text-left">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wide">Organization Name</label>
                          <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder={`${currentUser?.name || 'My'}'s Organization`}
                            className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
                          />
                        </div>
                        <button
                          onClick={handleCreateOrganization}
                          disabled={creatingOrg}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-gray-900 dark:text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingOrg ? (
                            <><Loader2 size={16} className="animate-spin" /> Creating...</>
                          ) : (
                            <><Plus size={16} /> Create Organization</>
                          )}
                        </button>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* === INTEGRATIONS TAB === */}
            {activeTab === 'integrations' && (
              <Card className="p-5">
                <SectionHeader
                  icon={GitBranch}
                  title="Git Integrations"
                  description="Connect your Git accounts to push documentation to repositories"
                />
                <GitConnectionsPanel />
              </Card>
            )}

            {/* === APPEARANCE TAB === */}
            {activeTab === 'appearance' && (
              <Card className="p-5">
                <SectionHeader icon={Palette} title="Appearance" description="Customize how the app looks and feels" />

                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', icon: Sun, label: 'Light' },
                        { id: 'dark', icon: Moon, label: 'Dark' },
                        { id: 'system', icon: Monitor, label: 'System' },
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => setTheme(id as 'light' | 'dark' | 'system')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                            theme === id
                              ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                              : 'border-gray-200 dark:border-[#2E2E2E] hover:border-gray-300 dark:border-[#3E3E3E] bg-white dark:bg-[#0D0D0D]'
                          }`}
                        >
                          <Icon size={22} className={theme === id ? 'text-[#3B82F6]' : 'text-gray-400 dark:text-[#6B7280]'} />
                          <span className={`text-sm font-medium ${theme === id ? 'text-[#3B82F6]' : 'text-gray-500 dark:text-[#9CA3AF]'}`}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === DATABASE TAB === */}
            {activeTab === 'database' && (
              <>
                {/* Connection Status - Infinia Design */}
                <Card className={`overflow-hidden ${
                  connectionStatus === 'connected'
                    ? 'border-[#10B981]/30'
                    : 'border-[#EF4444]/30'
                }`}>
                  <div className={`p-4 ${
                    connectionStatus === 'connected'
                      ? 'bg-[#10B981]/10'
                      : 'bg-[#EF4444]/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          connectionStatus === 'connected'
                            ? 'bg-[#10B981]'
                            : 'bg-[#EF4444]'
                        }`}>
                          {connectionStatus === 'connected' ? <Wifi size={20} className="text-white" /> : <WifiOff size={20} className="text-white" />}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${connectionStatus === 'connected' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                          </h3>
                          <p className={`text-xs ${connectionStatus === 'connected' ? 'text-[#10B981]/70' : 'text-[#EF4444]/70'}`}>
                            {connectionStatus === 'connected' ? 'Database connection is healthy' : connectionError || 'Unable to connect'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => refreshData()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-xs font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-[#252525] transition-colors"
                      >
                        <RefreshCw size={14} /> Refresh
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Data Stats */}
                <Card className="p-4">
                  <SectionHeader icon={Database} title="Synced Data" description="Overview of data in your workspace" />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={Layers} value={projects.length} label="Projects" color="bg-[#3B82F6]" />
                    <StatCard icon={BarChart3} value={tasks.length} label="Tasks" color="bg-[#8B5CF6]" />
                    <StatCard icon={Calendar} value={sprints.length} label="Sprints" color="bg-[#F59E0B]" />
                    <StatCard icon={Users} value={teams.length} label="Teams" color="bg-[#10B981]" />
                  </div>
                </Card>
              </>
            )}

            {/* === NOTIFICATIONS TAB === */}
            {activeTab === 'notifications' && (
              <Card className="p-5">
                <SectionHeader icon={Bell} title="Notifications" description="Manage your notification preferences" />
                <div className="space-y-3">
                  {[
                    { label: 'Task assignments', desc: 'Get notified when a task is assigned to you' },
                    { label: 'Comments', desc: 'Get notified when someone comments on your tasks' },
                    { label: 'Sprint updates', desc: 'Get notified about sprint status changes' },
                    { label: 'Project updates', desc: 'Get notified about project milestones' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:border-gray-300 dark:border-[#3E3E3E] transition-colors">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{item.label}</div>
                        <div className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-0.5">{item.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-10 h-5 bg-[#2E2E2E] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3B82F6]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#6B7280] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6] peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* === SECURITY TAB === */}
            {activeTab === 'security' && (
              <Card className="p-5">
                <SectionHeader icon={Shield} title="Security" description="Manage your account security settings" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:border-gray-300 dark:border-[#3E3E3E] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
                        <Key size={16} className="text-[#3B82F6]" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">Password</div>
                        <div className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-0.5">Last changed 30 days ago</div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-semibold text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors border border-[#3B82F6]/30">
                      Change
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:border-gray-300 dark:border-[#3E3E3E] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
                        <Lock size={16} className="text-[#10B981]" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">Two-factor authentication</div>
                        <div className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-0.5">Add an extra layer of security</div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors">
                      Enable
                    </button>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {
            setShowInviteModal(false);
            refreshOrganization();
          }}
        />
      )}
    </div>
  );
};

export default SettingsView;
