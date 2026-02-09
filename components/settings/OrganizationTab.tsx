import React, { useState, useEffect } from 'react';
import {
  Building2, Crown, Users, Plus, Loader2,
  Globe, Layers, BarChart3, Pencil, Check, Save, AlertTriangle
} from 'lucide-react';
import { useProjectData } from '../../context/ProjectDataContext';
import { useToast } from '../../context/ToastContext';
import { organizationsService } from '../../services/organizations.service';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import SettingRow from './SettingRow';
import Toggle from './Toggle';
import StatCard from './StatCard';

const OrganizationTab: React.FC = () => {
  const {
    currentUser, currentOrganization, organizationMembers, isOrgAdmin,
    refreshOrganization, refreshData, projects, tasks, userOrganizations, switchOrganization
  } = useProjectData();
  const { error: showError, success } = useToast();

  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Organization edit state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgSlug, setEditOrgSlug] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgEditError, setOrgEditError] = useState<string | null>(null);

  // Organization switching state
  const [switchingOrg, setSwitchingOrg] = useState(false);

  // Initialize edit form when organization changes or edit mode starts
  useEffect(() => {
    if (currentOrganization && isEditingOrg) {
      setEditOrgName(currentOrganization.name);
      setEditOrgSlug(currentOrganization.slug);
      setOrgEditError(null);
    }
  }, [currentOrganization, isEditingOrg]);

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

  return (
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
                    <StatCard icon={BarChart3} value={tasks.filter(t => t.type !== 'epic').length} label="Tasks" color="bg-amber-500" />
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
  );
};

export default OrganizationTab;
