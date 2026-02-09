import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import { OrganizationRole } from '../../types';

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

export default RoleBadge;
