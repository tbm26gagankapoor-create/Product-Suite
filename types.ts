
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  designation?: string;
  isAdmin?: boolean;
  email?: string;
  organizationId?: string; // Current active organization
  // Extended Profile Fields from Schema
  location?: string;
  bio?: string;
  website?: string;
  jobTitle?: string;
  socialLinks?: Record<string, string>;
  // Status & Metadata
  status?: UserStatus;
  createdAt?: string;
  lastActiveAt?: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string; // Email domain for auto-join (e.g., 'acme.com')
  logoUrl?: string;
  ownerId?: string;
  memberCount?: number;
  projectCount?: number;
  settings?: OrganizationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationSettings {
  allowDomainJoin: boolean; // Allow users with matching email domain to join
  requireApproval: boolean; // Require admin approval for domain joins
  defaultRole: OrganizationRole; // Default role for new members
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  user?: User;
  organization?: Organization;
  joinedAt?: string;
  invitedBy?: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  organization?: Organization;
  email: string;
  role: OrganizationRole;
  invitedBy?: string;
  inviter?: User;
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  createdAt: string;
  expiresAt: string;
}

// User's membership across multiple organizations
export interface UserOrganizationMembership {
  organization: Organization;
  role: OrganizationRole;
  joinedAt: string;
  isActive: boolean; // Is this the currently selected org
}

// Generic email domains that should not be used for organization matching
export const GENERIC_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'tutanota.com',
];

export type TagColor = 'purple' | 'blue' | 'yellow' | 'green' | 'red' | 'gray';

export interface Tag {
  label: string;
  color: TagColor;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export type TaskType = 'epic' | 'feature' | 'task' | 'bug' | 'story';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CustomerValue = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskResolution = 'DONE' | 'WONT_FIX' | 'DUPLICATE' | 'CANNOT_REPRODUCE';
export type LifecycleStage = 'discovery' | 'alpha' | 'beta' | 'ga' | 'sunset';
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';

// Subtask interface is deprecated in favor of flattened Task structure
export interface Subtask {
  id: string;
  title: string;
  type: 'task' | 'bug' | 'feature'; 
  status: string;
  isCompleted?: boolean;
  assignee?: User;
  sprintId?: string;
  dueDate?: string;
}

export interface Task {
  id: string; // This maps to task_key (e.g. INF-123)
  uuid?: string; // This maps to the DB primary key (uuid)
  projectId: string; // Made Required
  title: string;
  columnId: string;
  tags: Tag[];
  commentsCount: number;
  timeSpent?: string;
  estimate?: string;
  assignee: User;
  reporter: User; // Made Required
  imageUrl?: string;
  hasDescription?: boolean;
  startDate?: string;
  dueDate?: string;
  comments?: Comment[];
  type: TaskType; // Made Required, replaced string with union
  sprintId?: string;

  // Product Discovery fields
  impactScore?: number;
  productTheme?: string;
  description?: string;
  priority: Priority; // Made Required
  points?: number;

  // Linking - Flattened structure
  parentEpicId?: string;

  // Task Dependencies
  blockedBy?: string[];  // Task IDs that block this task
  blocks?: string[];     // Task IDs that this task blocks

  // New metadata fields
  actualStartDate?: string;
  completedDate?: string;
  acceptanceCriteria?: string[];
  customerValue?: CustomerValue;
  technicalDebt?: boolean;
  environment?: string[];
  labels?: string[];
  resolution?: TaskResolution;
  externalLinks?: string[];
}

export interface Column {
  id: string;
  title: string;
  count: number;
}

export interface DocVersion {
  id: string;
  sectionId: string;
  content: string;
  user: User;
  timestamp: string;
  summary?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string; // Made Required
  description: string;
  status: string;
  isFavorite?: boolean;
  progress?: number;
  members: string[];
  ownerId?: string;
  organizationId?: string;
  startDate?: string;
  dueDate?: string;
  createdAt?: string; // Mapped from DB created_at
  tags?: string[];
  color?: string;
  imageUrl?: string; // Custom image URL for product icon
  icon?: string; // Icon name from lucide-react (e.g., 'Rocket', 'Target')
  iconColor?: string; // Gradient class (e.g., 'from-violet-500 to-purple-600')
  prd?: string;
  docs?: Record<string, string>;
  docHistory?: DocVersion[];
  vision?: string;

  // New metadata fields
  targetReleaseDate?: string;
  budget?: number;
  spentBudget?: number;
  category?: string;
  lifecycleStage?: LifecycleStage;
  okrs?: Record<string, unknown>[];
  successMetrics?: Record<string, unknown>[];
  targetAudience?: string;
  competitors?: string[];
  risks?: Record<string, unknown>[];
  dependencies?: string[];
  healthStatus?: HealthStatus;
  priorityRank?: number;
  customerCount?: number;
  revenueImpact?: number;
}

export interface Sprint {
  id: string;
  projectId: string; // Required - ensures sprint-to-product uniqueness
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
  status: 'planned' | 'active' | 'completed';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  projectIds: string[];
  avatarUrl?: string;
  organizationId?: string;
}
