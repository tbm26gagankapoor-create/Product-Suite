
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Task, Project, Sprint, User, Team, Comment, Organization, OrganizationMember } from '../types';
import { documentsService } from '../services/documents.service';

// Helper to get auth headers for API calls
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

// Map backend project to frontend Project type
function mapProject(data: any): Project {
  return {
    id: data.id,
    name: data.name,
    key: data.code,
    description: data.description,
    status: data.status,
    progress: data.progress_percentage || 0,
    members: [],
    ownerId: data.owner_id,
    createdAt: data.created_at,
    tags: [],
    prd: data.prd || undefined,
    docs: data.docs || undefined,
    docHistory: data.docHistory || undefined,
    color: data.color || undefined,
    vision: data.vision || undefined,
  };
}

// Map column title to frontend column ID
function mapColumnTitleToId(columnTitle: string | null): string {
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
}

// Map backend task to frontend Task type
function mapTask(data: any, users: User[]): Task {
  const assignee = users.find(u => u.id === data.assignee_id) || {
    id: data.assignee_id || 'unknown',
    name: data.assignee_name || 'Unassigned',
    avatarUrl: data.assignee_avatar || '',
    email: ''
  };
  const reporter = users.find(u => u.id === data.reporter_id) || {
    id: data.reporter_id || 'unknown',
    name: data.reporter_name || 'Unknown',
    avatarUrl: data.reporter_avatar || '',
    email: ''
  };

  // Map column_title from backend to frontend column ID
  const frontendColumnId = mapColumnTitleToId(data.column_title);

  return {
    id: data.task_key || data.id,
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
    tags: data.tags || [],
    commentsCount: data.comments_count || 0,
    startDate: data.start_date,
    dueDate: data.due_date,
    hasDescription: data.has_description,
  };
}

// Map backend sprint to frontend Sprint type
function mapSprint(data: any): Sprint {
  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    goal: data.goal,
    status: data.status,
  };
}

// Map backend user to frontend User type
function mapUser(data: any): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
    role: data.role || 'Member',
    isAdmin: data.role === 'Admin',
  };
}

interface ProjectDataContextType {
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  users: User[];
  teams: Team[];
  currentUser: User | null;
  currentOrganization: Organization | null;
  organizationMembers: OrganizationMember[];
  isOrgAdmin: boolean;
  isLoading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error';
  connectionError: string | null;
  refreshData: () => Promise<void>;
  addProject: (project: Project) => Promise<Project | null>;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => Promise<void>;
  addTask: (task: Task) => Promise<Task | null>;
  addEpic: (epic: Task) => Promise<Task | null>;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addSprint: (sprint: Sprint) => void;
  updateSprint: (sprint: Sprint) => void;
  addTeam: (team: Team) => void;
  addComment: (taskId: string, comment: Comment) => void;
  generateNextId: (projectId: string, type?: string) => string;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

export const ProjectDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      setConnectionStatus('connecting');
      setConnectionError(null);
      try {
        console.log("Fetching Data from local backend with auth...");

        // 1. Get Auth from localStorage (set by LoginView)
        const storedUser = localStorage.getItem('infinia_user');
        const storedToken = localStorage.getItem('infinia_token');

        // 2. Determine Current User Profile
        let profile: User | null = null;

        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser);
                profile = {
                    id: parsedUser.id,
                    name: parsedUser.name,
                    email: parsedUser.email,
                    avatarUrl: parsedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsedUser.name)}`,
                    role: parsedUser.role || 'Member',
                    isAdmin: parsedUser.role === 'Admin'
                };

                // Try to get fresh data from server
                try {
                    const response = await fetch('/api/v1/auth/me', {
                        headers: { 'Authorization': `Bearer ${storedToken}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            profile = {
                                id: data.data.id,
                                name: data.data.name,
                                email: data.data.email,
                                avatarUrl: data.data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.data.name)}`,
                                role: data.data.role || 'Member',
                                isAdmin: data.data.role === 'Admin' || data.data.role === 'org_admin',
                                isOrgAdmin: data.data.isOrgAdmin || false
                            };
                            localStorage.setItem('infinia_user', JSON.stringify(data.data));
                        }
                    }
                } catch (e) {
                    console.log('Could not refresh user from server, using cached data');
                }
            } catch (e) {
                console.error('Failed to parse stored user:', e);
            }
        }

        setCurrentUser(profile);

        // DEBUG: Log profile info
        console.log('=== DEBUG: User Profile ===');
        console.log('Profile:', profile);
        console.log('Is Admin:', profile?.isAdmin);

        // 3. For now, skip organization data
        setCurrentOrganization(null);
        setOrganizationMembers([]);
        setIsOrgAdmin(profile?.isOrgAdmin || false);

        // 4. Fetch all data from local backend WITH AUTH TOKEN
        // This ensures access control is applied on the server
        const headers = getAuthHeaders();

        const [usersRes, projectsRes, tasksRes, sprintsRes] = await Promise.all([
          fetch('/api/v1/users', { headers }),
          fetch('/api/v1/projects', { headers }),
          fetch('/api/v1/tasks', { headers }),
          fetch('/api/v1/sprints', { headers }),
        ]);

        const usersData = await usersRes.json();
        const projectsData = await projectsRes.json();
        const tasksData = await tasksRes.json();
        const sprintsData = await sprintsRes.json();

        // Map and set data
        const mappedUsers = (usersData.data || []).map(mapUser);
        const mappedProjects = (projectsData.data || []).map(mapProject);
        const mappedTasks = (tasksData.data || []).map((t: any) => mapTask(t, mappedUsers));
        const mappedSprints = (sprintsData.data || []).map(mapSprint);

        setUsers(mappedUsers);
        setProjects(mappedProjects);
        setTasks(mappedTasks);
        setSprints(mappedSprints);
        setTeams([]); // Teams not implemented in local backend yet

        setConnectionStatus('connected');
        console.log(`Loaded: ${mappedProjects.length} projects, ${mappedTasks.length} tasks, ${mappedSprints.length} sprints`);

      } catch (error: any) {
        console.error("Data Fetch Error:", error);
        setConnectionStatus('error');
        setConnectionError(error.message || "Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
  }, []);

  // --- Fetch Data on Mount ---
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Project Actions ---
  const addProject = useCallback(async (project: Project) => {
    setProjects(prev => [project, ...prev]);
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: project.name,
          code: project.key,
          description: project.description,
          owner_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const savedProject = mapProject(data.data);
        setProjects(prev => prev.map(p => p.id === project.id ? savedProject : p));

        // Persist wizard-generated docs to backend (triggers implicit git sync)
        if (project.docs && Object.keys(project.docs).length > 0) {
          for (const [sectionId, content] of Object.entries(project.docs)) {
            if (content) {
              documentsService.saveSection(savedProject.id, sectionId, content).catch(err =>
                console.error(`Failed to persist doc section ${sectionId}:`, err)
              );
            }
          }
        }

        return savedProject;
      }
      return null;
    } catch (e) {
      console.error("Failed to sync project", e);
      return null;
    }
  }, [currentUser]);

  const updateProject = useCallback(async (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    try {
      await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          status: project.status,
        }),
      });
    } catch (e) {
      console.error("Failed to sync project update", e);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setTasks(prev => prev.filter(t => t.projectId !== projectId));
      setSprints(prev => prev.filter(s => s.projectId !== projectId));

      try {
          await fetch(`/api/v1/projects/${projectId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
      } catch (e) {
          console.error("Failed to sync project deletion", e);
      }
  }, []);

  // --- Task Actions ---
  const addTask = useCallback(async (task: Task) => {
    setTasks(prev => [task, ...prev]);
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          project_id: task.projectId,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          points: task.points,
          assignee_id: task.assignee?.id,
          reporter_id: task.reporter?.id || currentUser?.id,
          sprint_id: task.sprintId,
          column_id: task.columnId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const savedTask = mapTask(data.data, users);
        setTasks(prev => prev.map(t => t.id === task.id ? savedTask : t));
        return savedTask;
      }
      return null;
    } catch (e) {
      console.error("Failed to sync task", e);
      return null;
    }
  }, [currentUser, users]);

  const addEpic = useCallback(async (epic: Task) => {
      setTasks(prev => [epic, ...prev]);
      try {
          const response = await fetch('/api/v1/tasks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              project_id: epic.projectId,
              title: epic.title,
              description: epic.description,
              type: 'feature',
              reporter_id: epic.reporter?.id || currentUser?.id,
            }),
          });
          const data = await response.json();
          if (data.success) {
            const savedEpic = mapTask(data.data, users);
            setTasks(prev => prev.map(t => t.id === epic.id ? savedEpic : t));
            return savedEpic;
          }
          return null;
      } catch (e) {
          console.error("Failed to sync epic", e);
          return null;
      }
  }, [currentUser, users]);

  const updateTask = useCallback(async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    try {
      await fetch(`/api/v1/tasks/${updatedTask.uuid || updatedTask.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: updatedTask.title,
          description: updatedTask.description,
          priority: updatedTask.priority,
          points: updatedTask.points,
          assignee_id: updatedTask.assignee?.id ?? null,
          sprint_id: updatedTask.sprintId,
          column_id: updatedTask.columnId,
        }),
      });
    } catch (e) {
      console.error("Failed to sync task update", e);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId && t.uuid !== taskId));
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      console.error("Failed to sync task deletion", e);
    }
  }, []);

  const addComment = useCallback(async (taskId: string, comment: Comment) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId || t.uuid === taskId) {
        const newComments = t.comments ? [...t.comments, comment] : [comment];
        return { ...t, comments: newComments, commentsCount: newComments.length };
      }
      return t;
    }));

    try {
      await fetch(`/api/v1/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          task_id: taskId,
          user_id: comment.userId,
          content: comment.text,
        }),
      });
    } catch (e) {
      console.error("Failed to sync comment", e);
    }
  }, []);

  // --- Sprint Actions ---
  const addSprint = useCallback(async (sprint: Sprint) => {
    setSprints(prev => [...prev, sprint]);
    try {
      const response = await fetch('/api/v1/sprints', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          project_id: sprint.projectId,
          name: sprint.name,
          goal: sprint.goal,
          start_date: sprint.startDate,
          end_date: sprint.endDate,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const savedSprint = mapSprint(data.data);
        setSprints(prev => prev.map(s => s.id === sprint.id ? savedSprint : s));
      }
    } catch (e) {
      console.error("Failed to sync sprint", e);
    }
  }, []);

  const updateSprint = useCallback(async (updatedSprint: Sprint) => {
    setSprints(prev => prev.map(s => s.id === updatedSprint.id ? updatedSprint : s));
    try {
      await fetch(`/api/v1/sprints/${updatedSprint.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: updatedSprint.name,
          goal: updatedSprint.goal,
          start_date: updatedSprint.startDate,
          end_date: updatedSprint.endDate,
          status: updatedSprint.status,
        }),
      });
    } catch (e) {
      console.error("Failed to sync sprint update", e);
    }
  }, []);

  // --- Team Actions ---
  const addTeam = useCallback(async (team: Team) => {
    setTeams(prev => [...prev, team]);
    // Teams not implemented in local backend yet
    console.log('Team creation not implemented in local backend');
  }, []);

  // --- User Actions ---
  const updateCurrentUser = useCallback(async (updates: Partial<User>) => {
      if (!currentUser) return;
      try {
          const response = await fetch(`/api/v1/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              name: updates.name,
              avatar_url: updates.avatarUrl,
            }),
          });
          const data = await response.json();
          if (data.success) {
            const updatedUser = mapUser(data.data);
            setCurrentUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          }
      } catch (e) {
          console.error("Failed to update user profile", e);
          throw e;
      }
  }, [currentUser]);

  // --- Organization Actions ---
  const refreshOrganization = useCallback(async () => {
      // Organization refresh is not implemented in local backend yet
      console.log('Organization refresh not implemented');
  }, [currentUser]);

  // --- Smart ID Generation ---
  const generateNextId = useCallback((projectId: string, type: string = 'task') => {
    const project = projects.find(p => p.id === projectId);
    const productKey = project?.key || 'PRD';

    let typeCode = 'TSK';
    const t = type.toLowerCase();
    if (t === 'bug') typeCode = 'BUG';
    else if (['feature', 'epic'].includes(t)) typeCode = 'FTR';
    
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    
    const numbers = projectTasks.map(task => {
      // Handle cases where ID might be UUID (new Epics)
      if (task.id.includes('-') && task.id.length > 20) return 0;

      const parts = task.id.split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      return isNaN(num) ? 0 : num;
    });

    const maxId = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxId + 1;
    const paddedNum = nextNum.toString().padStart(4, '0');

    return `${productKey}-${typeCode}-${paddedNum}`;
  }, [projects, tasks]);

  const value = useMemo(() => ({
    projects,
    tasks,
    sprints,
    users,
    teams,
    currentUser,
    currentOrganization,
    organizationMembers,
    isOrgAdmin,
    isLoading,
    connectionStatus,
    connectionError,
    refreshData: fetchData,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    addEpic,
    updateTask,
    deleteTask,
    addSprint,
    updateSprint,
    addTeam,
    addComment,
    generateNextId,
    updateCurrentUser,
    refreshOrganization
  }), [projects, tasks, sprints, users, teams, currentUser, currentOrganization, organizationMembers, isOrgAdmin, isLoading, connectionStatus, connectionError, fetchData, generateNextId, addComment, updateCurrentUser, refreshOrganization, addProject, updateProject, deleteProject, addTask, addEpic]);

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
};

export const useProjectData = () => {
  const context = useContext(ProjectDataContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
};
