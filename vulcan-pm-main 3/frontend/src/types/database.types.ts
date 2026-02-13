
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TagColor = 'purple' | 'blue' | 'yellow' | 'green' | 'red' | 'gray';
export type TaskType = 'epic' | 'feature' | 'task' | 'bug' | 'story';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type SprintStatus = 'planned' | 'active' | 'completed';
export type OrganizationRole = 'admin' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'expired';
export type CustomerValue = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskResolution = 'DONE' | 'WONT_FIX' | 'DUPLICATE' | 'CANNOT_REPRODUCE';
export type LifecycleStage = 'discovery' | 'alpha' | 'beta' | 'ga' | 'sunset';
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      organization_members: {
        Row: OrganizationMember
        Insert: OrganizationMemberInsert
        Update: OrganizationMemberUpdate
      }
      organization_invites: {
        Row: OrganizationInvite
        Insert: OrganizationInviteInsert
        Update: OrganizationInviteUpdate
      }
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
      }
      sprints: {
        Row: Sprint
        Insert: SprintInsert
        Update: SprintUpdate
      }
      teams: {
        Row: Team
        Insert: TeamInsert
        Update: TeamUpdate
      }
      comments: {
        Row: Comment
        Insert: CommentInsert
        Update: CommentUpdate
      }
      project_members: {
        Row: ProjectMember
        Insert: ProjectMemberInsert
        Update: ProjectMemberUpdate
      }
      team_members: {
        Row: TeamMember
        Insert: TeamMemberInsert
        Update: TeamMemberUpdate
      }
      task_tags: {
        Row: TaskTag
        Insert: TaskTagInsert
        Update: TaskTagUpdate
      }
      task_attachments: {
        Row: TaskAttachment
        Insert: any // Placeholder if explicit insert type isn't strictly needed for now
        Update: any
      }
      project_documents: {
        Row: ProjectDocument
        Insert: ProjectDocumentInsert
        Update: ProjectDocumentUpdate
      }
      document_versions: {
        Row: DocumentVersion
        Insert: DocumentVersionInsert
        Update: DocumentVersionUpdate
      }
      activity_logs: {
        Row: ActivityLog
        Insert: ActivityLogInsert
        Update: any // Activity logs are generally append-only
      }
    }
  }
}

// --- Organization Interfaces ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInsert {
  id?: string;
  name: string;
  slug: string;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  owner_id?: string | null;
  updated_at?: string;
}

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMemberWithUser[];
}

// --- Organization Member Interfaces ---

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

export interface OrganizationMemberInsert {
  id?: string;
  organization_id: string;
  user_id: string;
  role?: OrganizationRole;
  joined_at?: string;
}

export interface OrganizationMemberUpdate {
  role?: OrganizationRole;
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: User;
}

// --- Organization Invite Interfaces ---

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invited_by: string | null;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}

export interface OrganizationInviteInsert {
  id?: string;
  organization_id: string;
  email: string;
  role?: OrganizationRole;
  invited_by?: string | null;
  status?: InviteStatus;
  created_at?: string;
  expires_at?: string;
}

export interface OrganizationInviteUpdate {
  status?: InviteStatus;
  expires_at?: string;
}

export interface OrganizationInviteWithInviter extends OrganizationInvite {
  inviter: User | null;
}

// --- Entity Interfaces ---

export interface User {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  is_admin: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id?: string;
  auth_user_id?: string | null;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_admin?: boolean;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  avatar_url?: string | null;
  role?: string | null;
  is_admin?: boolean;
  organization_id?: string | null;
  updated_at?: string;
}

// --- Team Interfaces ---

export interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamWithMembers extends Team {
  members: User[];
  projects: Project[];
}

export interface TeamInsert {
  name: string;
  description?: string;
  avatar_url?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
  avatar_url?: string;
  updated_at?: string;
}

// --- Project Interfaces ---

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: string;
  is_favorite: boolean;
  progress: number;
  owner_id: string | null;
  organization_id: string | null;
  start_date: string | null;
  due_date: string | null;
  tags: string[];
  color: string | null;
  image_url: string | null;
  prd: string | null;
  vision: string | null;
  target_release_date: string | null;
  budget: number | null;
  spent_budget: number | null;
  category: string | null;
  lifecycle_stage: LifecycleStage | null;
  okrs: Json[];
  success_metrics: Json[];
  target_audience: string | null;
  competitors: string[];
  risks: Json[];
  dependencies: string[];
  health_status: HealthStatus | null;
  priority_rank: number | null;
  customer_count: number | null;
  revenue_impact: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  owner: User | null;
  members: User[];
  task_count: number;
  completed_task_count: number;
  sprint_count: number;
}

export interface ProjectInsert {
  id?: string;
  name: string;
  key: string;
  description?: string;
  status?: string;
  is_favorite?: boolean;
  progress?: number;
  owner_id?: string;
  organization_id?: string;
  start_date?: string;
  due_date?: string;
  tags?: string[];
  color?: string;
  image_url?: string;
  prd?: string;
  vision?: string;
  target_release_date?: string;
  budget?: number;
  spent_budget?: number;
  category?: string;
  lifecycle_stage?: LifecycleStage;
  okrs?: Json[];
  success_metrics?: Json[];
  target_audience?: string;
  competitors?: string[];
  risks?: Json[];
  dependencies?: string[];
  health_status?: HealthStatus;
  priority_rank?: number;
  customer_count?: number;
  revenue_impact?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectUpdate {
  name?: string;
  key?: string;
  description?: string;
  status?: string;
  is_favorite?: boolean;
  progress?: number;
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  tags?: string[];
  color?: string;
  image_url?: string;
  prd?: string;
  vision?: string;
  target_release_date?: string;
  budget?: number;
  spent_budget?: number;
  category?: string;
  lifecycle_stage?: LifecycleStage;
  okrs?: Json[];
  success_metrics?: Json[];
  target_audience?: string;
  competitors?: string[];
  risks?: Json[];
  dependencies?: string[];
  health_status?: HealthStatus;
  priority_rank?: number;
  customer_count?: number;
  revenue_impact?: number;
  updated_at?: string;
}

// --- Task Interfaces ---

export interface Task {
  id: string;
  task_key: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  assignee_id: string | null;
  reporter_id: string;
  sprint_id: string | null;
  parent_epic_id: string | null;
  points: number | null;
  estimate: string | null;
  time_spent: string | null;
  start_date: string | null;
  due_date: string | null;
  impact_score: number | null;
  product_theme: string | null;
  image_url: string | null;
  has_description: boolean;
  actual_start_date: string | null;
  completed_date: string | null;
  acceptance_criteria: string[];
  customer_value: CustomerValue | null;
  technical_debt: boolean;
  environment: string[];
  labels: string[];
  resolution: TaskResolution | null;
  external_links: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  assignee: User | null;
  reporter: User;
  project: Project;
  sprint: Sprint | null;
  parent_epic: Task | null;
  children: Task[];
  tags: TaskTag[];
  comments: Comment[];
  comments_count: number;
  attachments: TaskAttachment[];
}

export interface TaskTag {
  id: string;
  task_id: string;
  label: string;
  color: TagColor;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskInsert {
  project_id: string;
  title: string;
  column_id?: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  assignee_id?: string;
  reporter_id: string;
  sprint_id?: string;
  parent_epic_id?: string;
  points?: number;
  estimate?: string;
  start_date?: string;
  due_date?: string;
  impact_score?: number;
  product_theme?: string;
  actual_start_date?: string;
  completed_date?: string;
  acceptance_criteria?: string[];
  customer_value?: CustomerValue;
  technical_debt?: boolean;
  environment?: string[];
  labels?: string[];
  resolution?: TaskResolution;
  external_links?: string[];
}

export interface TaskUpdate {
  title?: string;
  column_id?: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  assignee_id?: string | null;
  sprint_id?: string | null;
  parent_epic_id?: string | null;
  points?: number;
  estimate?: string;
  time_spent?: string;
  start_date?: string;
  due_date?: string;
  impact_score?: number;
  product_theme?: string;
  image_url?: string;
  actual_start_date?: string | null;
  completed_date?: string | null;
  acceptance_criteria?: string[];
  customer_value?: CustomerValue | null;
  technical_debt?: boolean;
  environment?: string[];
  labels?: string[];
  resolution?: TaskResolution | null;
  external_links?: string[];
}

// --- Sprint Interfaces ---

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal: string | null;
  status: SprintStatus;
  created_at: string;
  updated_at: string;
}

export interface SprintWithStats extends Sprint {
  project: Project;
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  completed_points: number;
}

export interface SprintInsert {
  id?: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal?: string;
  status?: SprintStatus;
  created_at?: string;
  updated_at?: string;
}

export interface SprintUpdate {
  project_id?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  goal?: string;
  status?: SprintStatus;
  updated_at?: string;
}

// --- Comment Interfaces ---

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  user: User;
}

export interface CommentInsert {
  task_id: string;
  user_id: string;
  text: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommentUpdate {
  text: string;
  updated_at?: string;
}

// --- Document Interfaces ---

export interface ProjectDocument {
  id: string;
  project_id: string;
  section_id: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocumentInsert {
  id?: string;
  project_id: string;
  section_id: string;
  content?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDocumentUpdate {
  content?: string | null;
  updated_at?: string;
}

export interface DocumentVersion {
  id: string;
  project_id: string;
  section_id: string;
  content: string;
  summary: string | null;
  user_id: string;
  created_at: string;
}

export interface DocumentVersionWithUser extends DocumentVersion {
  user: User;
}

export interface DocumentVersionInsert {
  id?: string;
  project_id: string;
  section_id: string;
  content: string;
  summary?: string | null;
  user_id: string;
  created_at?: string;
}

export interface DocumentVersionUpdate {
  content?: string;
  summary?: string | null;
}

// --- Activity Log Interfaces ---

export interface ActivityLog {
  id: string;
  entity_type: 'task' | 'project' | 'sprint' | 'comment' | 'document';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'commented';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
  user: User | null;
}

export interface ActivityLogInsert {
  id?: string;
  entity_type: 'task' | 'project' | 'sprint' | 'comment' | 'document';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'commented';
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  user_id?: string | null;
  created_at?: string;
}

// --- Relation Tables ---

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface ProjectMemberInsert {
  project_id: string;
  user_id: string;
  role?: string;
  joined_at?: string;
}

export interface ProjectMemberUpdate {
  role?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
}

export interface TeamMemberInsert {
  team_id: string;
  user_id: string;
  joined_at?: string;
}

export interface TeamMemberUpdate {
  team_id?: string;
  user_id?: string;
}

export interface TaskTagInsert {
  task_id: string;
  label: string;
  color?: string;
}

export interface TaskTagUpdate {
  label?: string;
  color?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
