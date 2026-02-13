/**
 * Centralized Icon Configuration
 *
 * Single source of truth for all icons, sizes, and theme configurations
 * across the Vulcan PM application.
 */

import {
  // Product Theme Icons (15 unique, conflict-free)
  Target, Sparkles, Lightbulb, Package, Briefcase,
  Compass, Gem, Flame, Globe, Shield,
  Cpu, Database, Telescope, Codesandbox, Binary,

  // Sprint Theme Icons (15 unique, whimsical)
  Bird, Fish, Rabbit, Turtle, Dog,
  Cat, Snail, Bug, Send, Rocket,
  Crown, Star, Heart, Ghost, Flower,

  // Task Type Icons (dedicated, no conflicts)
  Hexagon, Zap, BookOpen, CheckSquare,

  // Priority Icons
  SignalHigh, SignalMedium, SignalLow,

  // Navigation Icons
  LayoutGrid, FileText, Calendar, ListTodo, Layout, Users,
  Settings2, Shield as ShieldNav, UserCog,

  // Document Type Icons
  Activity, Briefcase as BriefcaseDoc, Database as DatabaseDoc,
  Layout as LayoutDoc, Server, Layers, GitBranch, Code, FileJson,

  // Utility type
  LucideIcon
} from 'lucide-react';

// ===========================================
// SIZE STANDARDS
// ===========================================
export const ICON_SIZES = {
  xs: 12,      // Inline badges, tiny indicators
  sm: 14,      // Task type badges, compact UI
  md: 16,      // Default sidebar nav, buttons
  lg: 18,      // Admin nav, card headers
  xl: 20,      // Modal headers, section titles
  '2xl': 24,   // Hero sections
  '3xl': 28,   // Product/Sprint theme cards
  '4xl': 32,   // Large CTAs
} as const;

// ===========================================
// PRODUCT THEME ICONS (15 unique)
// ===========================================
export const PRODUCT_THEME_ICONS = [
  Target, Sparkles, Lightbulb, Package, Briefcase,
  Compass, Gem, Flame, Globe, Shield,
  Cpu, Database, Telescope, Codesandbox, Binary
] as const;

export const PRODUCT_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
] as const;

// ===========================================
// SPRINT THEME ICONS (15 unique)
// ===========================================
export const SPRINT_THEME_ICONS = [
  Bird, Fish, Rabbit, Turtle, Dog,
  Cat, Snail, Bug, Send, Rocket,
  Crown, Star, Heart, Ghost, Flower
] as const;

export const SPRINT_GRADIENTS = [
  'from-orange-400 to-pink-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-emerald-500',
  'from-purple-400 to-fuchsia-500',
  'from-yellow-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-red-400 to-rose-500',
  'from-indigo-400 to-purple-500',
] as const;

// ===========================================
// TASK TYPE CONFIGURATION
// ===========================================
export const TASK_TYPE_CONFIG = {
  epic: {
    icon: Hexagon,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    label: 'Epic',
  },
  feature: {
    icon: Zap,  // Changed from Rocket to avoid conflict
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    label: 'Feature',
  },
  bug: {
    icon: Bug,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Bug',
  },
  story: {
    icon: BookOpen,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'Story',
  },
  task: {
    icon: CheckSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Task',
  },
} as const;

// ===========================================
// PRIORITY CONFIGURATION
// ===========================================
export const PRIORITY_CONFIG = {
  HIGH: {
    icon: SignalHigh,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'High',
  },
  MEDIUM: {
    icon: SignalMedium,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Medium',
  },
  LOW: {
    icon: SignalLow,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Low',
  },
} as const;

// ===========================================
// NAVIGATION ICONS (Frontend Sidebar)
// ===========================================
export const NAV_ICONS = {
  overview: LayoutGrid,
  documents: FileText,
  sprints: Calendar,    // Changed from Zap to avoid conflict
  tasks: ListTodo,
  boards: Layout,
  timeline: Calendar,
  teams: Users,
  settings: Settings2,
  orgAdmin: ShieldNav,
  users: UserCog,
} as const;

// ===========================================
// DOCUMENT TYPE ICONS
// ===========================================
export const DOC_TYPE_ICONS = {
  prd: FileText,
  roadmap: Activity,
  business: BriefcaseDoc,
  data: DatabaseDoc,
  app: LayoutDoc,
  tech: Server,
  design: Layers,      // Keep Layers for docs (dedicated context)
  adrs: GitBranch,
  specs: Code,
  bizFlow: GitBranch,
  sysFlow: Activity,
  integrations: FileJson,
} as const;

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get deterministic product theme based on project ID
 */
export function getProductTheme(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const iconIndex = Math.abs(hash) % PRODUCT_THEME_ICONS.length;
  const gradientIndex = Math.abs(hash) % PRODUCT_GRADIENTS.length;

  return {
    Icon: PRODUCT_THEME_ICONS[iconIndex],
    gradient: PRODUCT_GRADIENTS[gradientIndex],
  };
}

/**
 * Get deterministic sprint theme based on sprint ID
 */
export function getSprintTheme(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const iconIndex = Math.abs(hash) % SPRINT_THEME_ICONS.length;
  const gradientIndex = Math.abs(hash) % SPRINT_GRADIENTS.length;

  return {
    Icon: SPRINT_THEME_ICONS[iconIndex],
    gradient: SPRINT_GRADIENTS[gradientIndex],
  };
}

/**
 * Get task type configuration (icon, color, bg, label)
 */
export function getTaskTypeConfig(type?: string) {
  return TASK_TYPE_CONFIG[type as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.task;
}

/**
 * Get priority configuration (icon, color, bg, label)
 */
export function getPriorityConfig(priority?: string) {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
}

// ===========================================
// TYPE EXPORTS
// ===========================================
export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];
export type TaskType = keyof typeof TASK_TYPE_CONFIG;
export type PriorityLevel = keyof typeof PRIORITY_CONFIG;
