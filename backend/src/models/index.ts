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
  designation?: string;
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

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password_hash: String,
  avatar_url: String,
  designation: { type: String, default: 'Member' },
  organization_id: { type: Schema.Types.Mixed, index: true },
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

  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  domain: { type: String, index: true }, // Index for domain-based lookup
  logo_url: String,
  owner_id: { type: Schema.Types.Mixed, required: true, index: true },
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

  organization_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
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

  organization_id: { type: Schema.Types.Mixed, required: true, index: true },
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
  requested_at: Date;
  resolved_at?: Date;
  resolved_by?: string;
}

const organizationJoinRequestSchema = new Schema<IOrganizationJoinRequest>({

  organization_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  status: { type: String, default: 'pending' },
  requested_at: { type: Date, default: Date.now },
  resolved_at: Date,
  resolved_by: String,
});

// ===================
// Project Model
// ===================
export interface IProjectDraftData {
  productName: string;
  description: string;
  tags: string;
  startDate: string;
  targetDate: string;
  ownerId: string;
  selectedTeam: string[];
  refinedVision: string;
  suggestions: Array<{
    title: string;
    description: string;
    type: 'feature' | 'monetization' | 'market' | 'ux';
    selected?: boolean;
  }>;
  generatedDocs: Record<string, string>;
  generatedEpics: Array<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description: string;
      type: string;
      priority: string;
      points: number;
    }>;
  }>;
  inputMode: 'scratch' | 'import';
  fileText?: string;
  productImage?: string;
}

export interface IProject extends Document {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: string;
  progress_percentage: number;
  is_favorite: boolean;
  owner_id?: string;
  owner_ids?: string[];
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
  // Draft fields for saving incomplete product wizard state
  draft_step?: number;
  draft_data?: IProjectDraftData;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>({

  name: { type: String, required: true },
  description: String,
  code: { type: String, required: true, index: true },
  status: { type: String, default: 'active' },
  progress_percentage: { type: Number, default: 0 },
  is_favorite: { type: Boolean, default: false },
  owner_id: { type: Schema.Types.Mixed, index: true },
  owner_ids: [{ type: Schema.Types.Mixed }],
  organization_id: { type: Schema.Types.Mixed, index: true },
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
  // Draft fields for saving incomplete product wizard state
  draft_step: Number,
  draft_data: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Unique code per organization (not globally unique)
projectSchema.index({ code: 1, organization_id: 1 }, { unique: true });

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

  project_id: { type: Schema.Types.Mixed, required: true },
  user_id: { type: Schema.Types.Mixed, required: true },
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
  // Note: 'id' is not stored - MongoDB's _id is used and transformed to 'id' by the database layer
  project_id: { type: Schema.Types.Mixed, required: true },
  title: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  color: { type: String, default: 'gray' },
  is_default: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Index for finding DONE columns quickly
columnStatusSchema.index({ project_id: 1, title: 1 });
columnStatusSchema.index({ title: 1 }); // For batch DONE column lookup

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

  project_id: { type: Schema.Types.Mixed, required: true },
  name: { type: String, required: true },
  goal: String,
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: { type: String, default: 'planned' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Compound indexes for common sprint queries
sprintSchema.index({ project_id: 1, status: 1 });
sprintSchema.index({ project_id: 1, start_date: -1 });

// ===================
// Tag Model
// ===================
export interface ITag extends Document {
  id: string;
  project_id: string;
  label: string;
  color: string;
  created_at: Date;
}

const tagSchema = new Schema<ITag>({

  project_id: { type: Schema.Types.Mixed, required: true, index: true },
  label: { type: String, required: true },
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

  task_key: { type: String, required: true, index: true },
  project_id: { type: Schema.Types.Mixed, required: true },
  column_id: { type: Schema.Types.Mixed, required: true },
  sprint_id: { type: Schema.Types.Mixed },
  parent_epic_id: { type: Schema.Types.Mixed, index: true },
  title: { type: String, required: true },
  description: String,
  type: { type: String, default: 'task' },
  priority: { type: String, default: 'MEDIUM' },
  status: String,
  points: Number,
  assignee_id: { type: Schema.Types.Mixed },
  reporter_id: { type: Schema.Types.Mixed, index: true },
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

// Compound indexes for common query patterns
taskSchema.index({ project_id: 1, sprint_id: 1 });
taskSchema.index({ project_id: 1, column_id: 1 });
taskSchema.index({ project_id: 1, updated_at: -1 });
taskSchema.index({ project_id: 1, created_at: -1 });
taskSchema.index({ assignee_id: 1, updated_at: -1 });
taskSchema.index({ sprint_id: 1, column_id: 1 });

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

  task_id: { type: Schema.Types.Mixed, required: true, index: true },
  title: { type: String, required: true },
  type: { type: String, default: 'task' },
  status: { type: String, default: 'pending' },
  is_completed: { type: Boolean, default: false },
  assignee_id: String,
  sprint_id: String,
  due_date: Date,
  created_at: { type: Date, default: Date.now, index: true },
});

// Index for subtasks per task
subtaskSchema.index({ task_id: 1, created_at: 1 });

// ===================
// Task Tag Model
// ===================
export interface ITaskTag extends Document {
  id: string;
  task_id: string;
  tag_id: string;
}

const taskTagSchema = new Schema<ITaskTag>({

  task_id: { type: Schema.Types.Mixed, required: true, index: true },
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
  content: string;
  parent_comment_id?: string;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

const commentSchema = new Schema<IComment>({

  task_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  content: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.Mixed, default: null },
  is_edited: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
});

// Index for sorted comments per task
commentSchema.index({ task_id: 1, created_at: -1 });

// ===================
// Document Comment Model (for PRD/Documents view)
// ===================
export interface IDocumentComment extends Document {
  id: string;
  project_id: string;
  section_id: string;
  user_id: string;
  parent_comment_id?: string;  // For threaded replies
  text: string;
  mentions: string[];  // Array of mentioned user IDs
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: Date;
  is_edited: boolean;
  // Inline text selection fields (Google Docs style)
  selected_text?: string;       // The text that was selected
  selection_id?: string;        // Unique ID for highlighting in document
  created_at: Date;
  updated_at: Date;
}

const documentCommentSchema = new Schema<IDocumentComment>({

  project_id: { type: Schema.Types.Mixed, required: true },
  section_id: { type: String, required: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  parent_comment_id: { type: String },
  text: { type: String, required: true },
  mentions: [String],
  is_resolved: { type: Boolean, default: false },
  resolved_by: String,
  resolved_at: Date,
  is_edited: { type: Boolean, default: false },
  // Inline text selection fields
  selected_text: String,
  selection_id: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Compound indexes for document comment queries
documentCommentSchema.index({ project_id: 1, section_id: 1, created_at: -1 });
documentCommentSchema.index({ project_id: 1, is_resolved: 1 });
documentCommentSchema.index({ parent_comment_id: 1, created_at: 1 });

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

  task_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true },
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

  project_id: { type: Schema.Types.Mixed, index: true },
  task_id: { type: Schema.Types.Mixed, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
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

  user_id: { type: Schema.Types.Mixed, required: true, unique: true, index: true },
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

  name: { type: String, required: true },
  description: String,
  avatar_url: String,
  organization_id: { type: Schema.Types.Mixed, index: true },
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

  team_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
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

  team_id: { type: Schema.Types.Mixed, required: true },
  project_id: { type: Schema.Types.Mixed, required: true },
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
  project_id?: string;  // For GitHub integration OAuth
  user_id?: string;     // For GitHub integration OAuth
  created_at: Date;
  expires_at: Date;
}

const oauthStateSchema = new Schema<IOAuthState>({

  state: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true },
  redirect_uri: String,
  project_id: String,
  user_id: String,
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
});

// ===================
// Task Link Model (Dependencies)
// ===================
export interface ITaskLink extends Document {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  link_type: string;
  created_by?: string;
  created_at: Date;
}

const taskLinkSchema = new Schema<ITaskLink>({

  blocking_task_id: { type: Schema.Types.Mixed, required: true, index: true },
  blocked_task_id: { type: Schema.Types.Mixed, required: true, index: true },
  link_type: { type: String, default: 'blocks' },
  created_by: String,
  created_at: { type: Date, default: Date.now },
});

taskLinkSchema.index({ blocking_task_id: 1, blocked_task_id: 1 }, { unique: true });

// ===================
// Task Type Config Model
// ===================
export interface ITaskTypeConfig extends Document {
  id: string;
  organization_id?: string;
  name: string;
  label: string;
  icon: string;
  color: string;
  bg_color: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const taskTypeConfigSchema = new Schema<ITaskTypeConfig>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  bg_color: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

taskTypeConfigSchema.index({ organization_id: 1, name: 1 }, { unique: true });

// ===================
// Priority Config Model
// ===================
export interface IPriorityConfig extends Document {
  id: string;
  organization_id?: string;
  name: string;
  label: string;
  icon: string;
  color: string;
  bg_color: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const priorityConfigSchema = new Schema<IPriorityConfig>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  bg_color: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

priorityConfigSchema.index({ organization_id: 1, name: 1 }, { unique: true });

// ===================
// Status Config Model
// ===================
export interface IStatusConfig extends Document {
  id: string;
  organization_id?: string;
  name: string;
  label: string;
  icon?: string;
  color: string;
  bg_color?: string;
  is_default: boolean;
  is_done_state: boolean;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const statusConfigSchema = new Schema<IStatusConfig>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  icon: String,
  color: { type: String, required: true },
  bg_color: String,
  is_default: { type: Boolean, default: false },
  is_done_state: { type: Boolean, default: false },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

statusConfigSchema.index({ organization_id: 1, name: 1 }, { unique: true });

// ===================
// Role Config Model
// ===================
export interface IRoleConfig extends Document {
  id: string;
  organization_id?: string;
  name: string;
  label: string;
  color: string;
  bg_color: string;
  permissions: string[];
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const roleConfigSchema = new Schema<IRoleConfig>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, required: true },
  bg_color: { type: String, required: true },
  permissions: [String],
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

roleConfigSchema.index({ organization_id: 1, name: 1 }, { unique: true });

// ===================
// Nav Item Model
// ===================
export interface INavItem extends Document {
  id: string;
  organization_id?: string;
  type: 'main' | 'doc';
  name: string;
  label: string;
  icon: string;
  route?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  requires_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

const navItemSchema = new Schema<INavItem>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  type: { type: String, required: true, enum: ['main', 'doc'] },
  name: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  route: String,
  parent_id: String,
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  requires_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

navItemSchema.index({ organization_id: 1, type: 1, name: 1 }, { unique: true });

// ===================
// Theme Color Model
// ===================
export interface IThemeColor extends Document {
  id: string;
  organization_id?: string;
  category: string;
  name: string;
  light_classes: string;
  dark_classes: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const themeColorSchema = new Schema<IThemeColor>({

  organization_id: { type: Schema.Types.Mixed, index: true },
  category: { type: String, required: true },
  name: { type: String, required: true },
  light_classes: { type: String, required: true },
  dark_classes: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

themeColorSchema.index({ organization_id: 1, category: 1, name: 1 }, { unique: true });

// ===================
// User Notification Preferences Model
// ===================
export interface IUserNotificationPreferences extends Document {
  id: string;
  user_id: string;

  // Email notification preferences
  email_enabled: boolean;
  email_digest_frequency: 'instant' | 'daily' | 'weekly' | 'none';

  // Per-type email preferences
  email_task_assigned: boolean;
  email_task_mentioned: boolean;
  email_comment_added: boolean;
  email_comment_reply: boolean;
  email_sprint_reminder: boolean;
  email_project_updates: boolean;
  email_due_date_reminder: boolean;

  // In-app notification preferences
  inapp_enabled: boolean;
  inapp_task_assigned: boolean;
  inapp_task_mentioned: boolean;
  inapp_comment_added: boolean;
  inapp_comment_reply: boolean;
  inapp_sprint_reminder: boolean;
  inapp_project_updates: boolean;
  inapp_status_change: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;

  created_at: Date;
  updated_at: Date;
}

const userNotificationPreferencesSchema = new Schema<IUserNotificationPreferences>({

  user_id: { type: Schema.Types.Mixed, required: true, unique: true, index: true },

  // Email preferences
  email_enabled: { type: Boolean, default: true },
  email_digest_frequency: { type: String, default: 'instant', enum: ['instant', 'daily', 'weekly', 'none'] },

  email_task_assigned: { type: Boolean, default: true },
  email_task_mentioned: { type: Boolean, default: true },
  email_comment_added: { type: Boolean, default: true },
  email_comment_reply: { type: Boolean, default: true },
  email_sprint_reminder: { type: Boolean, default: true },
  email_project_updates: { type: Boolean, default: false },
  email_due_date_reminder: { type: Boolean, default: true },

  // In-app preferences
  inapp_enabled: { type: Boolean, default: true },
  inapp_task_assigned: { type: Boolean, default: true },
  inapp_task_mentioned: { type: Boolean, default: true },
  inapp_comment_added: { type: Boolean, default: true },
  inapp_comment_reply: { type: Boolean, default: true },
  inapp_sprint_reminder: { type: Boolean, default: true },
  inapp_project_updates: { type: Boolean, default: true },
  inapp_status_change: { type: Boolean, default: true },

  // Quiet hours
  quiet_hours_enabled: { type: Boolean, default: false },
  quiet_hours_start: { type: String, default: '22:00' },
  quiet_hours_end: { type: String, default: '08:00' },
  quiet_hours_timezone: { type: String, default: 'UTC' },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ===================
// Notification Model (Backend storage for in-app notifications)
// ===================
export type NotificationType =
  | 'task_assigned'
  | 'task_mentioned'
  | 'comment_added'
  | 'comment_reply'
  | 'sprint_reminder'
  | 'project_update'
  | 'status_change'
  | 'due_date_reminder'
  | 'document_mentioned'
  | 'system';

export interface INotification extends Document {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  metadata?: {
    task_id?: string;
    project_id?: string;
    sprint_id?: string;
    comment_id?: string;
    actor_id?: string;
    actor_name?: string;
  };
  read: boolean;
  email_sent: boolean;
  email_sent_at?: Date;
  created_at: Date;
}

const notificationSchema = new Schema<INotification>({

  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ['task_assigned', 'task_mentioned', 'comment_added', 'comment_reply', 'sprint_reminder', 'project_update', 'status_change', 'due_date_reminder', 'document_mentioned', 'system'],
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  action_url: String,
  metadata: {
    task_id: String,
    project_id: String,
    sprint_id: String,
    comment_id: String,
    actor_id: String,
    actor_name: String,
  },
  read: { type: Boolean, default: false, index: true },
  email_sent: { type: Boolean, default: false },
  email_sent_at: Date,
  created_at: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, read: 1 });

// ===================
// Email Log Model (Audit trail for sent emails)
// ===================
export interface IEmailLog extends Document {
  id: string;
  to_email: string;
  to_user_id?: string;
  template_type: string;
  subject: string;
  resend_id?: string;
  status: 'sent' | 'failed' | 'bounced' | 'delivered';
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

const emailLogSchema = new Schema<IEmailLog>({

  to_email: { type: String, required: true, index: true },
  to_user_id: { type: Schema.Types.Mixed, index: true },
  template_type: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  resend_id: String,
  status: { type: String, required: true, enum: ['sent', 'failed', 'bounced', 'delivered'], default: 'sent' },
  error_message: String,
  metadata: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now, index: true },
});

// ===================
// GitHub Integration Model
// ===================
export interface IGitHubIntegration extends Document {
  id: string;
  project_id: string;
  // GitHub Connection
  github_access_token: string;  // Encrypted
  github_refresh_token?: string; // Encrypted (if available)
  github_token_expires_at?: Date;
  github_username: string;
  github_user_id: string;
  // Repository Settings
  repo_owner: string;
  repo_name: string;
  branch: string;
  file_path: string;  // e.g., "docs/PRD.md" or "docs/{{section}}.md"
  // Sync Settings
  auto_sync_enabled: boolean;
  sync_sections: string[];  // Which sections to sync, empty = all
  last_sync_at?: Date;
  last_sync_status?: 'success' | 'failed' | 'pending';
  last_sync_error?: string;
  last_commit_sha?: string;
  // Metadata
  connected_by: string;  // User ID who set up integration
  created_at: Date;
  updated_at: Date;
}

const gitHubIntegrationSchema = new Schema<IGitHubIntegration>({

  project_id: { type: Schema.Types.Mixed, required: true },
  github_access_token: { type: String, required: true },
  github_refresh_token: String,
  github_token_expires_at: Date,
  github_username: { type: String, required: true },
  github_user_id: { type: Schema.Types.Mixed, required: true },
  repo_owner: { type: String, default: '' },  // Empty until user selects/creates repo
  repo_name: { type: String, default: '' },   // Empty until user selects/creates repo
  branch: { type: String, default: 'main' },
  file_path: { type: String, default: 'docs/PRD.md' },
  auto_sync_enabled: { type: Boolean, default: true },
  sync_sections: [String],
  last_sync_at: Date,
  last_sync_status: { type: String, enum: ['success', 'failed', 'pending'] },
  last_sync_error: String,
  last_commit_sha: String,
  connected_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

gitHubIntegrationSchema.index({ project_id: 1 }, { unique: true });

// ===================
// GitHub Sync Log Model (Audit Trail)
// ===================
export interface IGitHubSyncLog extends Document {
  id: string;
  integration_id: string;
  project_id: string;
  section_id: string;
  action: 'sync' | 'manual_push' | 'disconnect';
  status: 'success' | 'failed';
  commit_sha?: string;
  commit_url?: string;
  error_message?: string;
  triggered_by: string;  // User ID
  created_at: Date;
}

const gitHubSyncLogSchema = new Schema<IGitHubSyncLog>({

  integration_id: { type: String, required: true, index: true },
  project_id: { type: Schema.Types.Mixed, required: true },
  section_id: { type: String, required: true },
  action: { type: String, required: true, enum: ['sync', 'manual_push', 'disconnect'] },
  status: { type: String, required: true, enum: ['success', 'failed'] },
  commit_sha: String,
  commit_url: String,
  error_message: String,
  triggered_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

gitHubSyncLogSchema.index({ project_id: 1, created_at: -1 });

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
export const DocumentComment = mongoose.model<IDocumentComment>('DocumentComment', documentCommentSchema);
export const Attachment = mongoose.model<IAttachment>('Attachment', attachmentSchema);
export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
export const UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', userPreferencesSchema);
export const Team = mongoose.model<ITeam>('Team', teamSchema);
export const TeamMember = mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);
export const TeamProject = mongoose.model<ITeamProject>('TeamProject', teamProjectSchema);
export const OAuthState = mongoose.model<IOAuthState>('OAuthState', oauthStateSchema);
export const TaskLink = mongoose.model<ITaskLink>('TaskLink', taskLinkSchema);
export const TaskTypeConfig = mongoose.model<ITaskTypeConfig>('TaskTypeConfig', taskTypeConfigSchema);
export const PriorityConfig = mongoose.model<IPriorityConfig>('PriorityConfig', priorityConfigSchema);
export const StatusConfig = mongoose.model<IStatusConfig>('StatusConfig', statusConfigSchema);
export const RoleConfig = mongoose.model<IRoleConfig>('RoleConfig', roleConfigSchema);
export const NavItem = mongoose.model<INavItem>('NavItem', navItemSchema);
export const ThemeColor = mongoose.model<IThemeColor>('ThemeColor', themeColorSchema);
export const UserNotificationPreferences = mongoose.model<IUserNotificationPreferences>('UserNotificationPreferences', userNotificationPreferencesSchema);
export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export const EmailLog = mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
export const GitHubIntegration = mongoose.model<IGitHubIntegration>('GitHubIntegration', gitHubIntegrationSchema);
export const GitHubSyncLog = mongoose.model<IGitHubSyncLog>('GitHubSyncLog', gitHubSyncLogSchema);

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
  task_links: TaskLink,
  comments: Comment,
  document_comments: DocumentComment,
  attachments: Attachment,
  activity_log: ActivityLog,
  user_preferences: UserPreferences,
  teams: Team,
  team_members: TeamMember,
  team_projects: TeamProject,
  oauth_states: OAuthState,
  task_type_configs: TaskTypeConfig,
  priority_configs: PriorityConfig,
  status_configs: StatusConfig,
  role_configs: RoleConfig,
  nav_items: NavItem,
  theme_colors: ThemeColor,
  user_notification_preferences: UserNotificationPreferences,
  notifications: Notification,
  email_logs: EmailLog,
  github_integrations: GitHubIntegration,
  github_sync_logs: GitHubSyncLog,
};
