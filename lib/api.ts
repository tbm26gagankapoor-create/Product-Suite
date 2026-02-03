/**
 * API Client - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { Project, Task, Sprint, User, Team, Comment } from '../types';

// Use environment variable or default to local backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// --- Auth Headers ---
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data as T;
}

// --- Mappers ---

const mapUserFromDB = (data: any): User => ({
  id: data.id,
  name: data.name || 'User',
  designation: data.designation || 'Member',
  avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name || 'User')}`,
  isAdmin: data.designation === 'Admin',
  email: data.email,
  organizationId: data.organization_id,
  location: data.location,
  bio: data.bio,
  website: data.website,
  jobTitle: data.job_title,
  socialLinks: data.social_links,
  status: data.status || 'active',
  createdAt: data.created_at,
  lastActiveAt: data.last_active_at,
});

const mapTeamFromDB = (data: any): Team => ({
  id: data.id,
  name: data.name,
  description: data.description,
  avatarUrl: data.avatar_url,
  organizationId: data.organization_id,
  projectIds: data.project_ids || [],
  members: data.members || []
});

const mapCommentFromDB = (data: any): Comment => ({
  id: data.id,
  userId: data.user_id,
  text: data.content || data.text,
  timestamp: data.created_at
});

const mapProjectFromDB = (data: any): Project => ({
  id: data.id,
  name: data.name,
  key: data.code || data.key,
  description: data.description,
  status: data.status,
  progress: data.progress_percentage || data.progress || 0,
  members: [],
  ownerId: data.owner_id,
  organizationId: data.organization_id,
  startDate: data.start_date,
  dueDate: data.due_date,
  createdAt: data.created_at,
  tags: data.tags || [],
  color: data.color,
  imageUrl: data.image_url,
  vision: data.vision,
  prd: data.prd,
  docs: {},
  targetReleaseDate: data.target_release_date,
  budget: data.budget,
  spentBudget: data.spent_budget,
  category: data.category,
  lifecycleStage: data.lifecycle_stage,
  okrs: data.okrs || [],
  successMetrics: data.success_metrics || [],
  targetAudience: data.target_audience,
  competitors: data.competitors || [],
  risks: data.risks || [],
  dependencies: data.dependencies || [],
  healthStatus: data.health_status,
  priorityRank: data.priority_rank,
  customerCount: data.customer_count,
  revenueImpact: data.revenue_impact
});

// Map column title to frontend column ID
const mapColumnTitleToId = (columnTitle: string | null): string => {
  if (!columnTitle) return 'todo';
  const titleMap: Record<string, string> = {
    'IDEA': 'idea',
    'TO DO': 'todo',
    'IN PROGRESS': 'inprogress',
    'BLOCKED': 'blocked',
    'TESTING': 'testing',
    'DONE': 'done',
  };
  return titleMap[columnTitle.toUpperCase()] || 'todo';
};

const mapTaskFromDB = (data: any, allUsers: User[]): Task => {
  const unknownUser: User = {
    id: 'unknown',
    name: 'Unknown User',
    avatarUrl: 'https://ui-avatars.com/api/?name=Unknown',
    email: ''
  };

  const assignee = allUsers.find(u => u.id === data.assignee_id) || {
    id: data.assignee_id || 'unknown',
    name: data.assignee_name || 'Unassigned',
    avatarUrl: data.assignee_avatar || '',
    email: ''
  };
  const reporter = allUsers.find(u => u.id === data.reporter_id) || unknownUser;

  // Map the column_title from backend to frontend column ID format
  const frontendColumnId = mapColumnTitleToId(data.column_title);

  return {
    id: data.task_key || `${data.project_code || 'TSK'}-${data.task_number}`,
    uuid: data.id,
    projectId: data.project_id,
    title: data.title,
    description: data.description,
    columnId: frontendColumnId,
    type: data.type || 'task',
    priority: data.priority || 'MEDIUM',
    points: data.points,
    assignee,
    reporter,
    sprintId: data.sprint_id,
    parentEpicId: data.parent_epic_id,
    tags: (data.tags || []).map((t: any) => ({ label: t.label, color: t.color || 'blue' })),
    commentsCount: data.comments_count || 0,
    comments: data.comments ? data.comments.map(mapCommentFromDB) : [],
    startDate: data.start_date,
    dueDate: data.due_date,
    hasDescription: data.has_description || !!data.description,
    imageUrl: data.image_url,
    actualStartDate: data.actual_start_date,
    completedDate: data.completed_date,
    acceptanceCriteria: data.acceptance_criteria || [],
    customerValue: data.customer_value,
    technicalDebt: data.technical_debt || false,
    environment: data.environment || [],
    labels: data.labels || [],
    resolution: data.resolution,
    externalLinks: data.external_links || []
  };
};

const mapSprintFromDB = (data: any): Sprint => ({
  id: data.id,
  projectId: data.project_id,
  name: data.name,
  startDate: data.start_date,
  endDate: data.end_date,
  goal: data.goal,
  status: data.status,
});

// Helper to validate UUID format
const isValidUUID = (id?: string) => {
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// --- API Functions ---

export const api = {
  // Auth - now uses local backend
  auth: {
    async signUp(email: string, password: string, fullName: string) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: fullName }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { data: null, error: new Error(data.error || 'Registration failed') };
      }
      // Store token
      localStorage.setItem('infinia_token', data.data.token);
      localStorage.setItem('infinia_user', JSON.stringify(data.data.user));
      return { data: { user: data.data.user }, error: null };
    },

    async signIn(email: string, password: string) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { data: null, error: new Error(data.error || 'Login failed') };
      }
      // Store token
      localStorage.setItem('infinia_token', data.data.token);
      localStorage.setItem('infinia_user', JSON.stringify(data.data.user));
      return { data: { user: data.data.user, session: { access_token: data.data.token } }, error: null };
    },

    async signOut() {
      localStorage.removeItem('infinia_token');
      localStorage.removeItem('infinia_user');
      localStorage.removeItem('infinia_session_user');
      return { error: null };
    },

    async getSession() {
      const token = localStorage.getItem('infinia_token');
      const userStr = localStorage.getItem('infinia_user');
      if (!token || !userStr) {
        return { data: { session: null }, error: null };
      }
      try {
        const user = JSON.parse(userStr);
        return { data: { session: { access_token: token, user } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    }
  },

  // Users
  async getUsers(filters?: { team_id?: string }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.team_id) params.append('team_id', filters.team_id);
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/users?${queryString}` : `${API_BASE}/users`;

    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return (data.data || []).map(mapUserFromDB);
  },

  // Get users in a specific team
  async getUsersInTeam(teamId: string): Promise<User[]> {
    return this.getUsers({ team_id: teamId });
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.designation) dbUpdates.designation = updates.designation;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.bio) dbUpdates.bio = updates.bio;
    if (updates.website) dbUpdates.website = updates.website;
    if (updates.jobTitle) dbUpdates.job_title = updates.jobTitle;
    if (updates.organizationId) dbUpdates.organization_id = updates.organizationId;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.isAdmin !== undefined) dbUpdates.designation = updates.isAdmin ? 'Admin' : updates.designation || 'Member';

    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dbUpdates),
    });
    const result = await handleResponse<any>(response);
    return mapUserFromDB(result);
  },

  // Teams
  async getTeams(filters?: { member_id?: string }): Promise<Team[]> {
    const params = new URLSearchParams();
    if (filters?.member_id) params.append('member_id', filters.member_id);
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/teams?${queryString}` : `${API_BASE}/teams`;

    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return (data.data || []).map(mapTeamFromDB);
  },

  // Get teams where a specific user is a member
  async getTeamsForUser(userId: string): Promise<Team[]> {
    return this.getTeams({ member_id: userId });
  },

  async createTeam(team: Team): Promise<Team> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: team.name,
        description: team.description,
        organization_id: team.organizationId,
        member_ids: team.members,
      }),
    });
    const result = await handleResponse<any>(response);
    return mapTeamFromDB(result);
  },

  // Projects
  async getProjects(filters?: { member_id?: string }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.member_id) params.append('member_id', filters.member_id);
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/projects?${queryString}` : `${API_BASE}/projects`;

    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return (data.data || []).map(mapProjectFromDB);
  },

  // Get projects where a specific user is a member
  async getProjectsForUser(userId: string): Promise<Project[]> {
    return this.getProjects({ member_id: userId });
  },

  async createProject(project: Project): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: project.name,
        code: project.key,
        description: project.description,
        owner_id: isValidUUID(project.ownerId) ? project.ownerId : null,
      }),
    });
    const result = await handleResponse<any>(response);
    return mapProjectFromDB(result);
  },

  async updateProject(project: Project): Promise<Project> {
    await fetch(`${API_BASE}/projects/${project.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: project.name,
        description: project.description,
        status: project.status,
      }),
    });
    return project;
  },

  async deleteProject(projectId: string): Promise<void> {
    await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Tasks & Epics
  async getTasks(users: User[], filters?: { project_id?: string; sprint_id?: string; assignee_id?: string; reporter_id?: string; user_id?: string }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.sprint_id) params.append('sprint_id', filters.sprint_id);
    if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
    if (filters?.reporter_id) params.append('reporter_id', filters.reporter_id);
    if (filters?.user_id) params.append('user_id', filters.user_id);

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/tasks?${queryString}` : `${API_BASE}/tasks`;

    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return (data.data || []).map((t: any) => mapTaskFromDB(t, users));
  },

  async createTask(task: Task): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        project_id: task.projectId,
        title: task.title,
        description: task.description,
        column_id: task.columnId,
        type: task.type,
        priority: task.priority,
        points: task.points,
        assignee_id: isValidUUID(task.assignee?.id) ? task.assignee.id : null,
        reporter_id: isValidUUID(task.reporter?.id) ? task.reporter.id : null,
        sprint_id: task.sprintId,
      }),
    });
    const data = await response.json();
    if (data.success) {
      return { ...task, uuid: data.data.id };
    }
    throw new Error(data.error || 'Failed to create task');
  },

  async createEpic(epic: Task): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        project_id: epic.projectId,
        title: epic.title,
        description: epic.description,
        type: 'feature',
        reporter_id: isValidUUID(epic.reporter?.id) ? epic.reporter.id : null,
      }),
    });
    const data = await response.json();
    if (data.success) {
      return { ...epic, id: data.data.id, uuid: data.data.id };
    }
    throw new Error(data.error || 'Failed to create epic');
  },

  async updateTask(task: Task): Promise<Task> {
    const taskId = task.uuid || task.id;
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        column_id: task.columnId,
        priority: task.priority,
        points: task.points,
        assignee_id: isValidUUID(task.assignee?.id) ? task.assignee.id : null,
        sprint_id: task.sprintId,
        due_date: task.dueDate,
      }),
    });
    return task;
  },

  async deleteTask(taskId: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Comments
  async createComment(taskId: string, comment: Comment): Promise<Comment> {
    await fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        task_id: taskId,
        user_id: comment.userId,
        content: comment.text,
      }),
    });
    return comment;
  },

  // Sprints
  async getSprints(): Promise<Sprint[]> {
    const response = await fetch(`${API_BASE}/sprints`, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return (data.data || []).map(mapSprintFromDB);
  },

  async createSprint(sprint: Sprint): Promise<Sprint> {
    const response = await fetch(`${API_BASE}/sprints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        project_id: sprint.projectId,
        name: sprint.name,
        start_date: sprint.startDate,
        end_date: sprint.endDate,
        goal: sprint.goal,
      }),
    });
    const data = await response.json();
    if (data.success) {
      return { ...sprint, id: data.data.id };
    }
    throw new Error(data.error || 'Failed to create sprint');
  },

  // Columns
  async getColumns(projectId?: string): Promise<any[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetch(`${API_BASE}/columns${params}`, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return data.data || [];
  },

  // Tags
  async getTags(projectId?: string): Promise<any[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetch(`${API_BASE}/tags${params}`, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return data.data || [];
  },

  // Project Members
  async getProjectMembers(projectId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/members`, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!data.success) return [];
    return data.data || [];
  },

  async addProjectMember(projectId: string, userId: string, role: string = 'member'): Promise<any> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, role }),
    });
    return handleResponse<any>(response);
  },

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await fetch(`${API_BASE}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Invites
  async sendInvite(email: string, role: 'admin' | 'member', organizationId: string): Promise<{
    invite: {
      id: string;
      email: string;
      role: string;
      status: string;
      expiresAt: string;
      inviteLink: string;
    };
    emailSent: boolean;
    emailError?: string;
  }> {
    const response = await fetch(`${API_BASE}/invites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role, organizationId }),
    });
    return handleResponse<any>(response);
  },

  async getInvite(inviteId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/invites/${inviteId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  async acceptInvite(inviteId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/invites/${inviteId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  async getOrganizationInvites(organizationId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/invites/organization/${organizationId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) return [];
    return data.data || [];
  },

  async resendInvite(inviteId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/invites/${inviteId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  async revokeInvite(inviteId: string): Promise<void> {
    await fetch(`${API_BASE}/invites/${inviteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};
