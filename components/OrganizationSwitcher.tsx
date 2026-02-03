import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Users,
  LogOut
} from 'lucide-react';
import { Organization, UserOrganizationMembership, OrganizationRole } from '../types';

interface OrganizationSwitcherProps {
  currentOrganization: Organization | null;
  memberships: UserOrganizationMembership[];
  onSwitchOrganization: (orgId: string) => void;
  onCreateOrganization: () => void;
  onManageOrganization?: () => void;
  compact?: boolean;
}

const getRoleBadgeColor = (role: OrganizationRole) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    case 'admin':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'member':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    case 'viewer':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  currentOrganization,
  memberships,
  onSwitchOrganization,
  onCreateOrganization,
  onManageOrganization,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Get deterministic color for org avatar
  const getOrgColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-violet-600',
      'from-pink-500 to-rose-600',
      'from-orange-500 to-amber-600',
      'from-green-500 to-emerald-600',
      'from-cyan-500 to-teal-600',
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[#2D2F36] bg-white dark:bg-[#15171E] hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-all ${
          compact ? 'p-2' : 'px-4 py-3'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
      >
        {currentOrganization ? (
          <>
            {currentOrganization.logoUrl ? (
              <img
                src={currentOrganization.logoUrl}
                alt={currentOrganization.name}
                className={`rounded-lg object-cover ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
              />
            ) : (
              <div className={`rounded-lg bg-gradient-to-br ${getOrgColor(currentOrganization.name)} flex items-center justify-center text-white font-bold ${compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}`}>
                {getOrgInitials(currentOrganization.name)}
              </div>
            )}
            {!compact && (
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-[#172B4D] dark:text-white truncate">
                  {currentOrganization.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {currentOrganization.memberCount || 0} members
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={`rounded-lg bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
              <Building2 size={compact ? 16 : 20} className="text-gray-400" />
            </div>
            {!compact && (
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  No Organization
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Select or create one
                </div>
              </div>
            )}
          </>
        )}
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] shadow-xl z-50 overflow-hidden min-w-[280px]">
          {/* Organizations List */}
          <div className="p-2">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Your Organizations
            </div>

            {memberships.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <Building2 size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No organizations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {memberships.map((membership) => (
                  <button
                    key={membership.organization.id}
                    onClick={() => {
                      onSwitchOrganization(membership.organization.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      membership.isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-[#1F2128]'
                    }`}
                  >
                    {membership.organization.logoUrl ? (
                      <img
                        src={membership.organization.logoUrl}
                        alt={membership.organization.name}
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getOrgColor(membership.organization.name)} flex items-center justify-center text-white font-bold text-xs`}>
                        {getOrgInitials(membership.organization.name)}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold text-[#172B4D] dark:text-white truncate">
                        {membership.organization.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${getRoleBadgeColor(membership.role)}`}>
                          {membership.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {membership.organization.memberCount || 0} members
                        </span>
                      </div>
                    </div>
                    {membership.isActive && (
                      <Check size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-[#2D2F36]" />

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                onCreateOrganization();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#172B4D] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center">
                <Plus size={18} className="text-gray-500 dark:text-gray-400" />
              </div>
              Create Organization
            </button>

            {currentOrganization && onManageOrganization && (
              <button
                onClick={() => {
                  onManageOrganization();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#172B4D] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center">
                  <Settings size={18} className="text-gray-500 dark:text-gray-400" />
                </div>
                Organization Settings
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSwitcher;
