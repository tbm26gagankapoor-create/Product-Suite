import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  configApi,
  TaskTypeConfig,
  PriorityConfig,
  StatusConfig,
  RoleConfig,
  NavItemConfig,
  ThemeColorConfig,
  AppConfig,
} from '../services/api';

// Default fallback values (used only if API fails)
const DEFAULT_TASK_TYPES: TaskTypeConfig[] = [
  { id: 'tasktype-001', name: 'epic', label: 'Epic', icon: 'Hexagon', color: 'text-purple-500', bg_color: 'bg-purple-500/10', display_order: 1, is_active: true },
  { id: 'tasktype-002', name: 'feature', label: 'Feature', icon: 'Rocket', color: 'text-pink-500', bg_color: 'bg-pink-500/10', display_order: 2, is_active: true },
  { id: 'tasktype-003', name: 'bug', label: 'Bug', icon: 'Bug', color: 'text-red-500', bg_color: 'bg-red-500/10', display_order: 3, is_active: true },
  { id: 'tasktype-004', name: 'story', label: 'Story', icon: 'Bookmark', color: 'text-emerald-500', bg_color: 'bg-emerald-500/10', display_order: 4, is_active: true },
  { id: 'tasktype-005', name: 'task', label: 'Task', icon: 'CheckSquare', color: 'text-blue-500', bg_color: 'bg-blue-500/10', display_order: 5, is_active: true },
];

const DEFAULT_PRIORITIES: PriorityConfig[] = [
  { id: 'priority-001', name: 'HIGH', label: 'High', icon: 'SignalHigh', color: 'text-red-500', bg_color: 'bg-red-500/10', display_order: 1, is_active: true },
  { id: 'priority-002', name: 'MEDIUM', label: 'Medium', icon: 'SignalMedium', color: 'text-amber-500', bg_color: 'bg-amber-500/10', display_order: 2, is_active: true },
  { id: 'priority-003', name: 'LOW', label: 'Low', icon: 'SignalLow', color: 'text-blue-500', bg_color: 'bg-blue-500/10', display_order: 3, is_active: true },
];

const DEFAULT_STATUSES: StatusConfig[] = [
  { id: 'status-001', name: 'idea', label: 'IDEA', icon: 'Lightbulb', color: 'gray', bg_color: 'bg-gray-500/10', is_default: false, is_done_state: false, display_order: 1, is_active: true },
  { id: 'status-002', name: 'todo', label: 'TO DO', icon: 'Circle', color: 'blue', bg_color: 'bg-blue-500/10', is_default: true, is_done_state: false, display_order: 2, is_active: true },
  { id: 'status-003', name: 'inprogress', label: 'IN PROGRESS', icon: 'Clock', color: 'yellow', bg_color: 'bg-yellow-500/10', is_default: false, is_done_state: false, display_order: 3, is_active: true },
  { id: 'status-004', name: 'blocked', label: 'BLOCKED', icon: 'AlertTriangle', color: 'red', bg_color: 'bg-red-500/10', is_default: false, is_done_state: false, display_order: 4, is_active: true },
  { id: 'status-005', name: 'testing', label: 'TESTING', icon: 'FlaskConical', color: 'purple', bg_color: 'bg-purple-500/10', is_default: false, is_done_state: false, display_order: 5, is_active: true },
  { id: 'status-006', name: 'done', label: 'DONE', icon: 'CheckCircle', color: 'green', bg_color: 'bg-green-500/10', is_default: false, is_done_state: true, display_order: 6, is_active: true },
];

const DEFAULT_ROLES: RoleConfig[] = [
  { id: 'role-001', name: 'owner', label: 'Owner', color: 'text-purple-700 dark:text-purple-400', bg_color: 'bg-purple-100 dark:bg-purple-900/30', permissions: ['all'], display_order: 1, is_active: true },
  { id: 'role-002', name: 'admin', label: 'Admin', color: 'text-blue-700 dark:text-blue-400', bg_color: 'bg-blue-100 dark:bg-blue-900/30', permissions: ['manage_members', 'manage_projects', 'manage_settings'], display_order: 2, is_active: true },
  { id: 'role-003', name: 'member', label: 'Member', color: 'text-gray-600 dark:text-gray-400', bg_color: 'bg-gray-100 dark:bg-gray-800', permissions: ['view', 'create', 'edit'], display_order: 3, is_active: true },
  { id: 'role-004', name: 'viewer', label: 'Viewer', color: 'text-gray-500 dark:text-gray-500', bg_color: 'bg-gray-100 dark:bg-gray-800', permissions: ['view'], display_order: 4, is_active: true },
];

const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'nav-001', type: 'main', name: 'home', label: 'Home', icon: 'Home', route: 'home', display_order: 1, is_active: true, requires_admin: false },
  { id: 'nav-002', type: 'main', name: 'products', label: 'Products', icon: 'Folder', route: 'project-list', display_order: 2, is_active: true, requires_admin: false },
  { id: 'nav-003', type: 'main', name: 'sprints', label: 'Sprints', icon: 'Zap', route: 'sprints', display_order: 3, is_active: true, requires_admin: false },
  { id: 'nav-004', type: 'main', name: 'my-tasks', label: 'My Tasks', icon: 'CheckSquare', route: 'my-tasks', display_order: 4, is_active: true, requires_admin: false },
  { id: 'nav-005', type: 'main', name: 'teams', label: 'Teams', icon: 'Users', route: 'teams', display_order: 5, is_active: true, requires_admin: false },
  { id: 'nav-006', type: 'main', name: 'settings', label: 'Settings', icon: 'Settings', route: 'settings', display_order: 6, is_active: true, requires_admin: false },
];

const DEFAULT_DOC_NAV_ITEMS: NavItemConfig[] = [
  { id: 'nav-007', type: 'doc', name: 'prd', label: 'PRD Requirements', icon: 'FileText', display_order: 1, is_active: true, requires_admin: false },
  { id: 'nav-008', type: 'doc', name: 'roadmap', label: 'Roadmap', icon: 'Activity', display_order: 2, is_active: true, requires_admin: false },
  { id: 'nav-009', type: 'doc', name: 'modules', label: 'Modules & Features', icon: 'Layers', display_order: 3, is_active: true, requires_admin: false },
  { id: 'nav-010', type: 'doc', name: 'business', label: 'Business Logic', icon: 'Network', display_order: 4, is_active: true, requires_admin: false },
  { id: 'nav-011', type: 'doc', name: 'data', label: 'Data Schema', icon: 'Database', display_order: 5, is_active: true, requires_admin: false },
  { id: 'nav-012', type: 'doc', name: 'app', label: 'App Structure', icon: 'FolderTree', display_order: 6, is_active: true, requires_admin: false },
  { id: 'nav-013', type: 'doc', name: 'tech', label: 'Tech Stack', icon: 'Cpu', display_order: 7, is_active: true, requires_admin: false },
  { id: 'nav-014', type: 'doc', name: 'design-guidelines', label: 'Design Guidelines', icon: 'Palette', display_order: 8, is_active: true, requires_admin: false },
  { id: 'nav-015', type: 'doc', name: 'design', label: 'Design System', icon: 'SwatchBook', display_order: 9, is_active: true, requires_admin: false },
  { id: 'nav-016', type: 'doc', name: 'adrs', label: 'ADRs', icon: 'FileCheck', display_order: 10, is_active: true, requires_admin: false },
  { id: 'nav-017', type: 'doc', name: 'specs', label: 'Specs', icon: 'FileCode', display_order: 11, is_active: true, requires_admin: false },
  { id: 'nav-018', type: 'doc', name: 'user-flows', label: 'User Flows', icon: 'GitBranch', display_order: 12, is_active: true, requires_admin: false },
  { id: 'nav-019', type: 'doc', name: 'biz-flow', label: 'Business Flows', icon: 'Workflow', display_order: 13, is_active: true, requires_admin: false },
  { id: 'nav-020', type: 'doc', name: 'sys-flow', label: 'System Flows', icon: 'CircuitBoard', display_order: 14, is_active: true, requires_admin: false },
  { id: 'nav-021', type: 'doc', name: 'integrations', label: 'Integrations', icon: 'Plug', display_order: 15, is_active: true, requires_admin: false },
];

const DEFAULT_THEME_COLORS: ThemeColorConfig[] = [
  { id: 'color-001', category: 'team_avatar', name: 'blue', light_classes: 'bg-blue-100 text-blue-600', dark_classes: 'bg-blue-900/30 text-blue-400', display_order: 1, is_active: true },
  { id: 'color-002', category: 'team_avatar', name: 'purple', light_classes: 'bg-purple-100 text-purple-600', dark_classes: 'bg-purple-900/30 text-purple-400', display_order: 2, is_active: true },
  { id: 'color-003', category: 'team_avatar', name: 'green', light_classes: 'bg-green-100 text-green-600', dark_classes: 'bg-green-900/30 text-green-400', display_order: 3, is_active: true },
  { id: 'color-004', category: 'team_avatar', name: 'amber', light_classes: 'bg-amber-100 text-amber-600', dark_classes: 'bg-amber-900/30 text-amber-400', display_order: 4, is_active: true },
  { id: 'color-005', category: 'team_avatar', name: 'pink', light_classes: 'bg-pink-100 text-pink-600', dark_classes: 'bg-pink-900/30 text-pink-400', display_order: 5, is_active: true },
  { id: 'color-006', category: 'team_avatar', name: 'indigo', light_classes: 'bg-indigo-100 text-indigo-600', dark_classes: 'bg-indigo-900/30 text-indigo-400', display_order: 6, is_active: true },
];

interface ConfigContextType {
  // Data
  taskTypes: TaskTypeConfig[];
  priorities: PriorityConfig[];
  statuses: StatusConfig[];
  roles: RoleConfig[];
  navItems: NavItemConfig[];
  docNavItems: NavItemConfig[];
  themeColors: ThemeColorConfig[];

  // State
  isLoading: boolean;
  error: string | null;

  // Helper functions
  getTaskTypeConfig: (type: string) => TaskTypeConfig | undefined;
  getPriorityConfig: (priority: string) => PriorityConfig | undefined;
  getStatusConfig: (status: string) => StatusConfig | undefined;
  getRoleConfig: (role: string) => RoleConfig | undefined;
  getThemeColor: (category: string, index: number) => ThemeColorConfig | undefined;
  getThemeColorByName: (category: string, name: string) => ThemeColorConfig | undefined;

  // Actions
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode; organizationId?: string }> = ({
  children,
  organizationId
}) => {
  const [taskTypes, setTaskTypes] = useState<TaskTypeConfig[]>(DEFAULT_TASK_TYPES);
  const [priorities, setPriorities] = useState<PriorityConfig[]>(DEFAULT_PRIORITIES);
  const [statuses, setStatuses] = useState<StatusConfig[]>(DEFAULT_STATUSES);
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [navItems, setNavItems] = useState<NavItemConfig[]>(DEFAULT_NAV_ITEMS);
  const [docNavItems, setDocNavItems] = useState<NavItemConfig[]>(DEFAULT_DOC_NAV_ITEMS);
  const [themeColors, setThemeColors] = useState<ThemeColorConfig[]>(DEFAULT_THEME_COLORS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = await configApi.getAll(organizationId);

      if (config.taskTypes?.length > 0) setTaskTypes(config.taskTypes);
      if (config.priorities?.length > 0) setPriorities(config.priorities);
      if (config.statuses?.length > 0) setStatuses(config.statuses);
      if (config.roles?.length > 0) setRoles(config.roles);
      if (config.navItems?.length > 0) setNavItems(config.navItems);
      if (config.docNavItems?.length > 0) setDocNavItems(config.docNavItems);
      if (config.themeColors?.length > 0) setThemeColors(config.themeColors);
    } catch (err) {
      console.warn('Failed to load config from API, using defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Keep using defaults
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Helper functions
  const getTaskTypeConfig = useCallback((type: string) => {
    return taskTypes.find(t => t.name === type);
  }, [taskTypes]);

  const getPriorityConfig = useCallback((priority: string) => {
    return priorities.find(p => p.name === priority);
  }, [priorities]);

  const getStatusConfig = useCallback((status: string) => {
    return statuses.find(s => s.name === status);
  }, [statuses]);

  const getRoleConfig = useCallback((role: string) => {
    return roles.find(r => r.name === role);
  }, [roles]);

  const getThemeColor = useCallback((category: string, index: number) => {
    const categoryColors = themeColors.filter(c => c.category === category);
    return categoryColors[index % categoryColors.length];
  }, [themeColors]);

  const getThemeColorByName = useCallback((category: string, name: string) => {
    return themeColors.find(c => c.category === category && c.name === name);
  }, [themeColors]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return (
    <ConfigContext.Provider
      value={{
        taskTypes,
        priorities,
        statuses,
        roles,
        navItems,
        docNavItems,
        themeColors,
        isLoading,
        error,
        getTaskTypeConfig,
        getPriorityConfig,
        getStatusConfig,
        getRoleConfig,
        getThemeColor,
        getThemeColorByName,
        refreshConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// Re-export types for convenience
export type {
  TaskTypeConfig,
  PriorityConfig,
  StatusConfig,
  RoleConfig,
  NavItemConfig,
  ThemeColorConfig,
  AppConfig,
};
