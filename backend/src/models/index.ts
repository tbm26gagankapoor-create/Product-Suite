import mongoose, { Schema, Document } from 'mongoose';

// ===================
// User Model
// ===================
export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url?: string;
  role?: string;
  organization_id?: string;
  oauth_provider?: 'microsoft' | 'google' | 'github';
  oauth_provider_id?: string;
  location?: string;
  bio?: string;
  website?: string;
  job_title?: string;
  social_links?: Record<string, string>;
  status?: string;
  last_active_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password_hash: String,
  avatar_url: String,
  role: { type: String, default: 'Member' },
  organization_id: { type: String, index: true },
  oauth_provider: String,
  oauth_provider_id: String,
  location: String,
  bio: String,
  website: String,
  job_title: String,
  social_links: Schema.Types.Mixed,
  status: { type: String, default: 'active' },
  last_active_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Organization Model
// ===================
export interface IOrganization extends Document {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  owner_id: string;
  settings?: {
    allowDomainJoin: boolean;
    requireApproval: boolean;
    defaultRole: string;
  };
  created_at: Date;
  updated_at: Date;
}

const organizationSchema = new Schema<IOrganization>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  domain: String,
  logo_url: String,
  owner_id: { type: String, required: true, index: true },
  settings: {
    allowDomainJoin: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: true },
    defaultRole: { type: String, default: 'member' },
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Organization Member Model
// ===================
export interface IOrganizationMember extends Document {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
  invited_by?: string;
}

const organizationMemberSchema = new Schema<IOrganizationMember>({
  id: { type: String, required: true, unique: true, index: true },
  organization_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, default: 'member' },
  joined_at: { type: Date, default: Date.now },
  invited_by: String,
});

organizationMemberSchema.index({ organization_id: 1, user_id: 1 }, { unique: true });

// ===================
// Organization Invite Model
// ===================
export interface IOrganizationInvite extends Document {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  created_at: Date;
  expires_at: Date;
  accepted_at?: Date;
}

const organizationInviteSchema = new Schema<IOrganizationInvite>({
  id: { type: String, required: true, unique: true, index: true },
  organization_id: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  role: { type: String, default: 'member' },
  invited_by: { type: String, required: true },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  accepted_at: Date,
});

// ===================
// Organization Join Request Model
// ===================
export interface IOrganizationJoinRequest extends Document {
  id: string;
  organization_id: string;
  user_id: string;
  status: string;
  created_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
}

const organizationJoinRequestSchema = new Schema<IOrganizationJoinRequest>({
  id: { type: String, required: true, unique: true, index: true },
  organization_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  reviewed_at: Date,
  reviewed_by: String,
});

// ===================
// Project Model
// ===================
export interface IProject extends Document {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: string;
  progress_percentage: number;
  is_favorite: boolean;
  owner_id?: string;
  organization_id?: string;
  image_url?: string;
  icon?: string;
  icon_color?: string;
  prd?: string;
  docs?: Record<string, string>;
  vision?: string;
  target_release_date?: Date;
  budget?: number;
  spent_budget?: number;
  category?: string;
  lifecycle_stage?: string;
  target_audience?: string;
  competitors?: string[];
  health_status?: string;
  priority_rank?: number;
  customer_count?: number;
  revenue_impact?: number;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  code: { type: String, required: true, unique: true, index: true },
  status: { type: String, default: 'active' },
  progress_percentage: { type: Number, default: 0 },
  is_favorite: { type: Boolean, default: false },
  owner_id: { type: String, index: true },
  organization_id: { type: String, index: true },
  image_url: String,
  icon: String,
  icon_color: String,
  prd: String,
  docs: Schema.Types.Mixed,
  vision: String,
  target_release_date: Date,
  budget: Number,
  spent_budget: Number,
  category: String,
  lifecycle_stage: String,
  target_audience: String,
  competitors: [String],
  health_status: String,
  priority_rank: Number,
  customer_count: Number,
  revenue_impact: Number,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Project Member Model
// ===================
export interface IProjectMember extends Document {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

const projectMemberSchema = new Schema<IProjectMember>({
  id: { type: String, required: true, unique: true, index: true },
  project_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, default: 'member' },
  joined_at: { type: Date, default: Date.now },
});

projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

// ===================
// Column Status Model
// ===================
export interface IColumnStatus extends Document {
  id: string;
  project_id: string;
  title: string;
  display_order: number;
  color: string;
  is_default: boolean;
  created_at: Date;
}

const columnStatusSchema = new Schema<IColumnStatus>({
  id: { type: String, required: true, unique: true, index: true },
  project_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  color: { type: String, default: 'gray' },
  is_default: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// ===================
// Sprint Model
// ===================
export interface ISprint extends Document {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: Date;
  end_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const sprintSchema = new Schema<ISprint>({
  id: { type: String, required: true, unique: true, index: true },
  project_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  goal: String,
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: { type: String, default: 'planned' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Tag Model
// ===================
export interface ITag extends Document {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: Date;
}

const tagSchema = new Schema<ITag>({
  id: { type: String, required: true, unique: true, index: true },
  project_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  color: { type: String, default: 'gray' },
  created_at: { type: Date, default: Date.now },
});

// ===================
// Task Model
// ===================
export interface ITask extends Document {
  id: string;
  task_key: string;
  project_id: string;
  column_id: string;
  sprint_id?: string;
  parent_epic_id?: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  points?: number;
  assignee_id?: string;
  reporter_id?: string;
  due_date?: Date;
  start_date?: Date;
  actual_start_date?: Date;
  completed_date?: Date;
  time_spent?: string;
  estimate?: string;
  impact_score?: number;
  product_theme?: string;
  acceptance_criteria?: string[];
  customer_value?: string;
  technical_debt?: boolean;
  environment?: string[];
  labels?: string[];
  resolution?: string;
  external_links?: string[];
  blocked_by?: string[];
  blocks?: string[];
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

const taskSchema = new Schema<ITask>({
  id: { type: String, required: true, unique: true, index: true },
  task_key: { type: String, required: true, index: true },
  project_id: { type: String, required: true, index: true },
  column_id: { type: String, required: true, index: true },
  sprint_id: { type: String, index: true },
  parent_epic_id: { type: String, index: true },
  title: { type: String, required: true },
  description: String,
  type: { type: String, default: 'task' },
  priority: { type: String, default: 'MEDIUM' },
  status: String,
  points: Number,
  assignee_id: { type: String, index: true },
  reporter_id: { type: String, index: true },
  due_date: Date,
  start_date: Date,
  actual_start_date: Date,
  completed_date: Date,
  time_spent: String,
  estimate: String,
  impact_score: Number,
  product_theme: String,
  acceptance_criteria: [String],
  customer_value: String,
  technical_debt: Boolean,
  environment: [String],
  labels: [String],
  resolution: String,
  external_links: [String],
  blocked_by: [String],
  blocks: [String],
  image_url: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Subtask Model
// ===================
export interface ISubtask extends Document {
  id: string;
  task_id: string;
  title: string;
  type: string;
  status: string;
  is_completed: boolean;
  assignee_id?: string;
  sprint_id?: string;
  due_date?: Date;
  created_at: Date;
}

const subtaskSchema = new Schema<ISubtask>({
  id: { type: String, required: true, unique: true, index: true },
  task_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  type: { type: String, default: 'task' },
  status: { type: String, default: 'pending' },
  is_completed: { type: Boolean, default: false },
  assignee_id: String,
  sprint_id: String,
  due_date: Date,
  created_at: { type: Date, default: Date.now },
});

// ===================
// Task Tag Model
// ===================
export interface ITaskTag extends Document {
  id: string;
  task_id: string;
  tag_id: string;
}

const taskTagSchema = new Schema<ITaskTag>({
  id: { type: String, required: true, unique: true, index: true },
  task_id: { type: String, required: true, index: true },
  tag_id: { type: String, required: true, index: true },
});

taskTagSchema.index({ task_id: 1, tag_id: 1 }, { unique: true });

// ===================
// Comment Model
// ===================
export interface IComment extends Document {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
}

const commentSchema = new Schema<IComment>({
  id: { type: String, required: true, unique: true, index: true },
  task_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Attachment Model
// ===================
export interface IAttachment extends Document {
  id: string;
  task_id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: Date;
}

const attachmentSchema = new Schema<IAttachment>({
  id: { type: String, required: true, unique: true, index: true },
  task_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true },
  filename: { type: String, required: true },
  file_url: { type: String, required: true },
  file_type: String,
  file_size: Number,
  created_at: { type: Date, default: Date.now },
});

// ===================
// Activity Log Model
// ===================
export interface IActivityLog extends Document {
  id: string;
  project_id?: string;
  task_id?: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  id: { type: String, required: true, unique: true, index: true },
  project_id: { type: String, index: true },
  task_id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  action: { type: String, required: true },
  details: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
});

// ===================
// User Preferences Model
// ===================
export interface IUserPreferences extends Document {
  id: string;
  user_id: string;
  theme?: string;
  notifications?: Record<string, boolean>;
  default_project_id?: string;
  created_at: Date;
  updated_at: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, unique: true, index: true },
  theme: { type: String, default: 'light' },
  notifications: Schema.Types.Mixed,
  default_project_id: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Team Model
// ===================
export interface ITeam extends Document {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  organization_id?: string;
  created_at: Date;
  updated_at: Date;
}

const teamSchema = new Schema<ITeam>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  avatar_url: String,
  organization_id: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Team Member Model
// ===================
export interface ITeamMember extends Document {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

const teamMemberSchema = new Schema<ITeamMember>({
  id: { type: String, required: true, unique: true, index: true },
  team_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, default: 'member' },
  joined_at: { type: Date, default: Date.now },
});

teamMemberSchema.index({ team_id: 1, user_id: 1 }, { unique: true });

// ===================
// Team Project Model
// ===================
export interface ITeamProject extends Document {
  id: string;
  team_id: string;
  project_id: string;
  assigned_at: Date;
}

const teamProjectSchema = new Schema<ITeamProject>({
  id: { type: String, required: true, unique: true, index: true },
  team_id: { type: String, required: true, index: true },
  project_id: { type: String, required: true, index: true },
  assigned_at: { type: Date, default: Date.now },
});

teamProjectSchema.index({ team_id: 1, project_id: 1 }, { unique: true });

// ===================
// OAuth State Model
// ===================
export interface IOAuthState extends Document {
  id: string;
  state: string;
  provider: string;
  redirect_uri?: string;
  created_at: Date;
  expires_at: Date;
}

const oauthStateSchema = new Schema<IOAuthState>({
  id: { type: String, required: true, unique: true, index: true },
  state: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true },
  redirect_uri: String,
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
});

// ===================
// Export Models
// ===================
export const User = mongoose.model<IUser>('User', userSchema);
export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
export const OrganizationMember = mongoose.model<IOrganizationMember>('OrganizationMember', organizationMemberSchema);
export const OrganizationInvite = mongoose.model<IOrganizationInvite>('OrganizationInvite', organizationInviteSchema);
export const OrganizationJoinRequest = mongoose.model<IOrganizationJoinRequest>('OrganizationJoinRequest', organizationJoinRequestSchema);
export const Project = mongoose.model<IProject>('Project', projectSchema);
export const ProjectMember = mongoose.model<IProjectMember>('ProjectMember', projectMemberSchema);
export const ColumnStatus = mongoose.model<IColumnStatus>('ColumnStatus', columnStatusSchema);
export const Sprint = mongoose.model<ISprint>('Sprint', sprintSchema);
export const Tag = mongoose.model<ITag>('Tag', tagSchema);
export const Task = mongoose.model<ITask>('Task', taskSchema);
export const Subtask = mongoose.model<ISubtask>('Subtask', subtaskSchema);
export const TaskTag = mongoose.model<ITaskTag>('TaskTag', taskTagSchema);
export const Comment = mongoose.model<IComment>('Comment', commentSchema);
export const Attachment = mongoose.model<IAttachment>('Attachment', attachmentSchema);
export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
export const UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', userPreferencesSchema);
export const Team = mongoose.model<ITeam>('Team', teamSchema);
export const TeamMember = mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);
export const TeamProject = mongoose.model<ITeamProject>('TeamProject', teamProjectSchema);
export const OAuthState = mongoose.model<IOAuthState>('OAuthState', oauthStateSchema);

// Model map for database abstraction
export const models: Record<string, mongoose.Model<any>> = {
  users: User,
  organizations: Organization,
  organization_members: OrganizationMember,
  organization_invites: OrganizationInvite,
  organization_join_requests: OrganizationJoinRequest,
  projects: Project,
  project_members: ProjectMember,
  columns_status: ColumnStatus,
  sprints: Sprint,
  tags: Tag,
  tasks: Task,
  subtasks: Subtask,
  task_tags: TaskTag,
  comments: Comment,
  attachments: Attachment,
  activity_log: ActivityLog,
  user_preferences: UserPreferences,
  teams: Team,
  team_members: TeamMember,
  team_projects: TeamProject,
  oauth_states: OAuthState,
};
