import {
  TaskTypeConfig,
  PriorityConfig,
  StatusConfig,
  RoleConfig,
  NavItem,
  ThemeColor,
  ITaskTypeConfig,
  IPriorityConfig,
  IStatusConfig,
  IRoleConfig,
  INavItem,
  IThemeColor,
} from '../models';

export interface AppConfig {
  taskTypes: ITaskTypeConfig[];
  priorities: IPriorityConfig[];
  statuses: IStatusConfig[];
  roles: IRoleConfig[];
  navItems: INavItem[];
  docNavItems: INavItem[];
  themeColors: IThemeColor[];
}

class ConfigService {
  /**
   * Get all configuration data in a single call
   * Merges system defaults with organization-specific overrides
   */
  async getAll(organizationId?: string): Promise<AppConfig> {
    const [taskTypes, priorities, statuses, roles, navItems, themeColors] = await Promise.all([
      this.getTaskTypes(organizationId),
      this.getPriorities(organizationId),
      this.getStatuses(organizationId),
      this.getRoles(organizationId),
      this.getNavItems(organizationId),
      this.getThemeColors(organizationId),
    ]);

    return {
      taskTypes,
      priorities,
      statuses,
      roles,
      navItems: navItems.filter(item => item.type === 'main'),
      docNavItems: navItems.filter(item => item.type === 'doc'),
      themeColors,
    };
  }

  /**
   * Get task type configurations
   * Returns org-specific if exists, otherwise system defaults
   */
  async getTaskTypes(organizationId?: string): Promise<ITaskTypeConfig[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      // Get org-specific or system defaults (organization_id is null)
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const configs = await TaskTypeConfig.find(query).sort({ display_order: 1 }).lean();

    // If org has overrides, filter out system defaults for same names
    if (organizationId && configs.length > 0) {
      const orgConfigs = configs.filter(c => c.organization_id === organizationId);
      const orgNames = new Set(orgConfigs.map(c => c.name));
      const systemDefaults = configs.filter(c => !c.organization_id && !orgNames.has(c.name));
      return [...orgConfigs, ...systemDefaults].sort((a, b) => a.display_order - b.display_order);
    }

    return configs as ITaskTypeConfig[];
  }

  /**
   * Get priority configurations
   */
  async getPriorities(organizationId?: string): Promise<IPriorityConfig[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const configs = await PriorityConfig.find(query).sort({ display_order: 1 }).lean();

    if (organizationId && configs.length > 0) {
      const orgConfigs = configs.filter(c => c.organization_id === organizationId);
      const orgNames = new Set(orgConfigs.map(c => c.name));
      const systemDefaults = configs.filter(c => !c.organization_id && !orgNames.has(c.name));
      return [...orgConfigs, ...systemDefaults].sort((a, b) => a.display_order - b.display_order);
    }

    return configs as IPriorityConfig[];
  }

  /**
   * Get status configurations
   */
  async getStatuses(organizationId?: string): Promise<IStatusConfig[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const configs = await StatusConfig.find(query).sort({ display_order: 1 }).lean();

    if (organizationId && configs.length > 0) {
      const orgConfigs = configs.filter(c => c.organization_id === organizationId);
      const orgNames = new Set(orgConfigs.map(c => c.name));
      const systemDefaults = configs.filter(c => !c.organization_id && !orgNames.has(c.name));
      return [...orgConfigs, ...systemDefaults].sort((a, b) => a.display_order - b.display_order);
    }

    return configs as IStatusConfig[];
  }

  /**
   * Get role configurations
   */
  async getRoles(organizationId?: string): Promise<IRoleConfig[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const configs = await RoleConfig.find(query).sort({ display_order: 1 }).lean();

    if (organizationId && configs.length > 0) {
      const orgConfigs = configs.filter(c => c.organization_id === organizationId);
      const orgNames = new Set(orgConfigs.map(c => c.name));
      const systemDefaults = configs.filter(c => !c.organization_id && !orgNames.has(c.name));
      return [...orgConfigs, ...systemDefaults].sort((a, b) => a.display_order - b.display_order);
    }

    return configs as IRoleConfig[];
  }

  /**
   * Get navigation items (both main and doc types)
   */
  async getNavItems(organizationId?: string): Promise<INavItem[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const items = await NavItem.find(query).sort({ type: 1, display_order: 1 }).lean();

    if (organizationId && items.length > 0) {
      const orgItems = items.filter(i => i.organization_id === organizationId);
      const orgNames = new Set(orgItems.map(i => `${i.type}-${i.name}`));
      const systemDefaults = items.filter(i => !i.organization_id && !orgNames.has(`${i.type}-${i.name}`));
      return [...orgItems, ...systemDefaults].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.display_order - b.display_order;
      });
    }

    return items as INavItem[];
  }

  /**
   * Get theme colors
   */
  async getThemeColors(organizationId?: string): Promise<IThemeColor[]> {
    const query: Record<string, unknown> = { is_active: true };

    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organization_id: null }];
    } else {
      query.organization_id = null;
    }

    const colors = await ThemeColor.find(query).sort({ category: 1, display_order: 1 }).lean();

    if (organizationId && colors.length > 0) {
      const orgColors = colors.filter(c => c.organization_id === organizationId);
      const orgKeys = new Set(orgColors.map(c => `${c.category}-${c.name}`));
      const systemDefaults = colors.filter(c => !c.organization_id && !orgKeys.has(`${c.category}-${c.name}`));
      return [...orgColors, ...systemDefaults].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.display_order - b.display_order;
      });
    }

    return colors as IThemeColor[];
  }

  /**
   * Create a new task type config
   */
  async createTaskType(data: Partial<ITaskTypeConfig>): Promise<ITaskTypeConfig> {
    const id = `tasktype-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = new TaskTypeConfig({ ...data, id });
    await config.save();
    return config;
  }

  /**
   * Update a task type config
   */
  async updateTaskType(id: string, data: Partial<ITaskTypeConfig>): Promise<ITaskTypeConfig | null> {
    const config = await TaskTypeConfig.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return config;
  }

  /**
   * Create a new priority config
   */
  async createPriority(data: Partial<IPriorityConfig>): Promise<IPriorityConfig> {
    const id = `priority-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = new PriorityConfig({ ...data, id });
    await config.save();
    return config;
  }

  /**
   * Update a priority config
   */
  async updatePriority(id: string, data: Partial<IPriorityConfig>): Promise<IPriorityConfig | null> {
    const config = await PriorityConfig.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return config;
  }

  /**
   * Create a new status config
   */
  async createStatus(data: Partial<IStatusConfig>): Promise<IStatusConfig> {
    const id = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = new StatusConfig({ ...data, id });
    await config.save();
    return config;
  }

  /**
   * Update a status config
   */
  async updateStatus(id: string, data: Partial<IStatusConfig>): Promise<IStatusConfig | null> {
    const config = await StatusConfig.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return config;
  }

  /**
   * Create a new role config
   */
  async createRole(data: Partial<IRoleConfig>): Promise<IRoleConfig> {
    const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = new RoleConfig({ ...data, id });
    await config.save();
    return config;
  }

  /**
   * Update a role config
   */
  async updateRole(id: string, data: Partial<IRoleConfig>): Promise<IRoleConfig | null> {
    const config = await RoleConfig.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return config;
  }

  /**
   * Create a new nav item
   */
  async createNavItem(data: Partial<INavItem>): Promise<INavItem> {
    const id = `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item = new NavItem({ ...data, id });
    await item.save();
    return item;
  }

  /**
   * Update a nav item
   */
  async updateNavItem(id: string, data: Partial<INavItem>): Promise<INavItem | null> {
    const item = await NavItem.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return item;
  }

  /**
   * Create a new theme color
   */
  async createThemeColor(data: Partial<IThemeColor>): Promise<IThemeColor> {
    const id = `color-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const color = new ThemeColor({ ...data, id });
    await color.save();
    return color;
  }

  /**
   * Update a theme color
   */
  async updateThemeColor(id: string, data: Partial<IThemeColor>): Promise<IThemeColor | null> {
    const color = await ThemeColor.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return color;
  }

  /**
   * Delete a config by id (soft delete - sets is_active to false)
   */
  async deleteConfig(type: string, id: string): Promise<boolean> {
    let model;
    switch (type) {
      case 'task-types':
        model = TaskTypeConfig;
        break;
      case 'priorities':
        model = PriorityConfig;
        break;
      case 'statuses':
        model = StatusConfig;
        break;
      case 'roles':
        model = RoleConfig;
        break;
      case 'navigation':
        model = NavItem;
        break;
      case 'theme-colors':
        model = ThemeColor;
        break;
      default:
        return false;
    }

    const result = await model.findOneAndUpdate(
      { id },
      { is_active: false, updated_at: new Date() }
    );
    return !!result;
  }
}

export const configService = new ConfigService();
