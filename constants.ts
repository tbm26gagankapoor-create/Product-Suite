
import {
  FileText,
  Activity,
  Briefcase,
  Database,
  Layout,
  Server,
  Layers,
  GitBranch,
  Code,
  FileJson,
  Boxes,
  Palette,
  Route
} from 'lucide-react';
import { Column, User, Sprint, Team, Project } from './types';

/**
 * @deprecated DOC_NAV_ITEMS should be fetched from /api/v1/config/navigation
 * This constant is kept for backward compatibility during migration.
 * Use `useConfig().docNavItems` from ConfigContext instead.
 */
export const DOC_NAV_ITEMS = [
    { id: 'prd', label: 'PRD Requirements', icon: FileText },
    { id: 'roadmap', label: 'Roadmap', icon: Activity },
    { id: 'modules', label: 'Modules', icon: Boxes },
    { id: 'business', label: 'Business Architecture', icon: Briefcase },
    { id: 'data', label: 'Data Architecture', icon: Database },
    { id: 'app', label: 'Application Architecture', icon: Layout },
    { id: 'tech', label: 'Technology Architecture', icon: Server },
    { id: 'design-guidelines', label: 'Design Guidelines', icon: Palette },
    { id: 'design', label: 'Design Documents', icon: Layers },
    { id: 'adrs', label: 'ADRs', icon: GitBranch },
    { id: 'specs', label: 'Technical Specifications', icon: Code },
    { id: 'user-flows', label: 'User Flows', icon: Route },
    { id: 'biz-flow', label: 'Business Workflows', icon: GitBranch },
    { id: 'sys-flow', label: 'System Workflows', icon: Activity },
    { id: 'integrations', label: 'Integration Workflows', icon: FileJson },
];

/**
 * @deprecated COLUMNS should be fetched from /api/v1/config/statuses or /api/v1/columns
 * This constant is kept for backward compatibility during migration.
 * Use `useConfig().statuses` from ConfigContext for status configuration.
 */
export const COLUMNS: Column[] = [
  { id: 'idea', title: 'IDEA', count: 0 },
  { id: 'todo', title: 'TO DO', count: 0 },
  { id: 'inprogress', title: 'IN PROGRESS', count: 0 },
  { id: 'blocked', title: 'BLOCKED', count: 0 },
  { id: 'testing', title: 'TESTING', count: 0 },
  { id: 'done', title: 'DONE', count: 0 },
];

/**
 * @deprecated NAV_ITEMS should be fetched from /api/v1/config/navigation
 * This constant is kept for backward compatibility during migration.
 * Use `useConfig().navItems` from ConfigContext instead.
 */
export const NAV_ITEMS = [
  { name: 'Home', icon: 'Home' },
  { name: 'Products', icon: 'Folder' },
  { name: 'Sprints', icon: 'Zap' },
  { name: 'My Tasks', icon: 'CheckSquare' },
  { name: 'Teams', icon: 'Users' },
  { name: 'Settings', icon: 'Settings' },
];

/**
 * @deprecated USERS should be fetched from /api/v1/users
 * This constant is kept for backward compatibility during migration.
 * Use `useProjectData().organizationMembers` from ProjectDataContext instead.
 */
export const USERS: User[] = [
  { id: 'u0', name: 'Gagan Kapoor', avatarUrl: 'https://ui-avatars.com/api/?name=Gagan+Kapoor&background=0D8ABC&color=fff', role: 'Product Owner', email: 'gagan@example.com', isAdmin: true },
  { id: 'u1', name: 'Alice Chen', avatarUrl: 'https://i.pravatar.cc/150?u=1', role: 'Product Owner', email: 'alice@infinia.com', isAdmin: true },
  { id: 'u2', name: 'Bob Smith', avatarUrl: 'https://i.pravatar.cc/150?u=2', role: 'Frontend Lead', email: 'bob@infinia.com' },
  { id: 'u3', name: 'Charlie Kim', avatarUrl: 'https://i.pravatar.cc/150?u=3', role: 'Backend Lead', email: 'charlie@infinia.com' },
  { id: 'u4', name: 'Diana Prince', avatarUrl: 'https://i.pravatar.cc/150?u=4', role: 'Designer', email: 'diana@infinia.com' },
  { id: 'u5', name: 'Evan Wright', avatarUrl: 'https://i.pravatar.cc/150?u=5', role: 'QA Engineer', email: 'evan@infinia.com' },
];

/**
 * @deprecated SPRINTS should be fetched from /api/v1/sprints
 * This constant is kept for backward compatibility during migration.
 * Use `useProjectData().sprints` from ProjectDataContext instead.
 */
export const SPRINTS: Sprint[] = [
  { id: 's1', name: 'Sprint 23', startDate: '2023-10-01', endDate: '2023-10-14', goal: 'Core Features', status: 'completed', projectId: 'p1' },
  { id: 's2', name: 'Sprint 24', startDate: '2023-10-15', endDate: '2023-10-28', goal: 'Stability', status: 'active', projectId: 'p1' },
];

/**
 * @deprecated TEAMS should be fetched from /api/v1/teams
 * This constant is kept for backward compatibility during migration.
 * Use `useProjectData().teams` from ProjectDataContext instead.
 */
export const TEAMS: Team[] = [
  { id: 't1', name: 'Core Platform', description: 'Platform infrastructure', members: ['u1', 'u2', 'u3'], projectIds: ['p1'] },
  { id: 't2', name: 'Mobile App', description: 'iOS and Android', members: ['u4', 'u5'], projectIds: ['p1'] },
];

/**
 * @deprecated DETAILED_PROJECTS should be fetched from /api/v1/projects
 * This constant is kept for backward compatibility during migration.
 * Use `useProjectData().projects` from ProjectDataContext instead.
 */
export const DETAILED_PROJECTS: Project[] = [
    {
        id: 'p1',
        name: 'Infinia Platform',
        key: 'INF',
        description: 'Main product platform',
        status: 'In Progress',
        progress: 65,
        members: ['u1', 'u2', 'u3', 'u4', 'u5'],
        color: 'from-blue-600 to-cyan-500'
    }
];
