
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Task, Project, Sprint, User, Team, Comment, Organization, OrganizationMember } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { organizationsService } from '../services/organizations.service';

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
        console.log("Fetching Data from Supabase...");
        
        // 1. Get Auth Session First
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const customSessionEmail = localStorage.getItem('infinia_session_user');

        // 2. Fetch Public Users
        let dbUsers = await api.getUsers();
        
        // 3. Determine Current User Profile
        let profile: User | null = null;

        if (authUser) {
            // Logged In via Supabase Auth
            // Case-insensitive email check to prevent duplicates
            profile = dbUsers.find(u => u.email?.toLowerCase() === authUser.email?.toLowerCase()) || null;

            if (!profile) {
                // Check if user exists by ID before creating virtual one
                const existingById = dbUsers.find(u => u.id === authUser.id);
                
                if (existingById) {
                    profile = existingById;
                } else {
                    // If not found in DB (e.g. trigger failed), construct from Auth Metadata
                    const virtualProfile: User = {
                        id: authUser.id,
                        name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
                        email: authUser.email || '',
                        avatarUrl: authUser.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email || 'U')}&background=random`,
                        role: 'Member',
                        isAdmin: false
                    };
                    profile = virtualProfile;
                    // Append this "virtual" profile to the users list so assignments work
                    dbUsers = [...dbUsers, virtualProfile];
                }
            }
        } else if (customSessionEmail) {
            // Logged In via Custom Bcrypt Auth
            profile = dbUsers.find(u => u.email?.toLowerCase() === customSessionEmail.toLowerCase()) || null;
            if (!profile) {
                // If the user was deleted but session remains, or specific demo fallback
                if (customSessionEmail === 'gagan@example.com') {
                     // Try to find ANY admin or just pick the first user as a fallback to ensure dashboard loads
                     profile = dbUsers.find(u => u.email === 'gagan@example.com') || dbUsers[0];
                }
            }
        } else {
            // No Session
            profile = null;
        }

        // Final Deduplication of Users Array based on ID
        const uniqueUsers: User[] = Array.from(new Map<string, User>(dbUsers.map(u => [u.id, u])).values());

        setUsers(uniqueUsers);
        setCurrentUser(profile);

        // DEBUG: Log profile info
        console.log('=== DEBUG: User Profile ===');
        console.log('Profile:', profile);
        console.log('Organization ID:', profile?.organizationId);

        // 4. Fetch Organization Data
        let org: Organization | null = null;
        let orgMembers: OrganizationMember[] = [];
        let userIsAdmin = false;

        if (profile?.organizationId) {
          console.log('=== DEBUG: Fetching Organization ===');
          try {
            const orgData = await organizationsService.getWithMembers(profile.organizationId);
            console.log('Org Data from service:', orgData);
            if (orgData) {
              org = {
                id: orgData.id,
                name: orgData.name,
                slug: orgData.slug,
                ownerId: orgData.owner_id || undefined,
                createdAt: orgData.created_at
              };
              orgMembers = orgData.members?.map((m: any) => ({
                id: m.id,
                organizationId: m.organization_id,
                userId: m.user_id,
                role: m.role,
                user: m.user ? {
                  id: m.user.id,
                  name: m.user.name,
                  email: m.user.email,
                  avatarUrl: m.user.avatar_url,
                  role: m.user.role,
                  isAdmin: m.user.is_admin
                } : undefined,
                joinedAt: m.joined_at
              })) || [];
              // Check if current user is admin
              console.log('Org Members:', orgMembers);
              console.log('Current User ID:', profile.id);
              userIsAdmin = orgMembers.some(m => m.userId === profile.id && m.role === 'admin');
              console.log('Is Org Admin:', userIsAdmin);
            }
          } catch (e) {
            console.error('Error fetching organization:', e);
          }
        } else {
          console.log('=== DEBUG: No organizationId on profile ===');
        }

        setCurrentOrganization(org);
        setOrganizationMembers(orgMembers);
        setIsOrgAdmin(userIsAdmin);
        console.log('=== DEBUG: Final State ===');
        console.log('isOrgAdmin set to:', userIsAdmin);

        // 5. Fetch Data (Projects, Tasks, etc.) - filtered by organization via RLS
        const [dbProjects, dbTasks, dbSprints, dbTeams] = await Promise.all([
          api.getProjects(),
          api.getTasks(uniqueUsers),
          api.getSprints(),
          api.getTeams()
        ]);

        setProjects(dbProjects);
        setTasks(dbTasks);
        setSprints(dbSprints);
        setTeams(dbTeams);
        setConnectionStatus('connected');
        
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
      const savedProject = await api.createProject(project);
      setProjects(prev => prev.map(p => p.id === project.id ? savedProject : p));
      return savedProject;
    } catch (e) {
      console.error("Failed to sync project", e);
      return null;
    }
  }, []);

  const updateProject = useCallback(async (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    try {
      await api.updateProject(project);
    } catch (e) {
      console.error("Failed to sync project update", e);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
      // Optimistically update local state to remove project AND associated tasks/sprints
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setTasks(prev => prev.filter(t => t.projectId !== projectId));
      setSprints(prev => prev.filter(s => s.projectId !== projectId));
      
      try {
          await api.deleteProject(projectId);
      } catch (e) {
          console.error("Failed to sync project deletion", e);
          // In a real app, we might want to revert local state here or show an error
      }
  }, []);

  // --- Task Actions ---
  const addTask = useCallback(async (task: Task) => {
    setTasks(prev => [task, ...prev]);
    try {
      const savedTask = await api.createTask(task);
      setTasks(prev => prev.map(t => t.id === task.id ? savedTask : t));
      return savedTask;
    } catch (e) {
      console.error("Failed to sync task", e);
      return null;
    }
  }, []);

  const addEpic = useCallback(async (epic: Task) => {
      setTasks(prev => [epic, ...prev]);
      try {
          const savedEpic = await api.createEpic(epic);
          setTasks(prev => prev.map(t => t.id === epic.id ? savedEpic : t));
          return savedEpic;
      } catch (e) {
          console.error("Failed to sync epic", e);
          return null;
      }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    try {
      await api.updateTask(updatedTask);
    } catch (e) {
      console.error("Failed to sync task update", e);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (e) {
      console.error("Failed to sync task deletion", e);
    }
  }, []);

  const addComment = useCallback(async (taskId: string, comment: Comment) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newComments = t.comments ? [...t.comments, comment] : [comment];
        return { ...t, comments: newComments, commentsCount: newComments.length };
      }
      return t;
    }));

    try {
      await api.createComment(taskId, comment);
    } catch (e) {
      console.error("Failed to sync comment", e);
    }
  }, []);

  // --- Sprint Actions ---
  const addSprint = useCallback(async (sprint: Sprint) => {
    setSprints(prev => [...prev, sprint]);
    try {
      const savedSprint = await api.createSprint(sprint);
      setSprints(prev => prev.map(s => s.id === sprint.id ? savedSprint : s));
    } catch (e) {
      console.error("Failed to sync sprint", e);
    }
  }, []);

  const updateSprint = useCallback((updatedSprint: Sprint) => {
    setSprints(prev => prev.map(s => s.id === updatedSprint.id ? updatedSprint : s));
  }, []);

  // --- Team Actions ---
  const addTeam = useCallback(async (team: Team) => {
    setTeams(prev => [...prev, team]);
    try {
      const savedTeam = await api.createTeam(team);
      setTeams(prev => prev.map(t => t.id === team.id ? savedTeam : t));
    } catch (e) {
        console.error("Failed to sync team", e);
    }
  }, []);

  // --- User Actions ---
  const updateCurrentUser = useCallback(async (updates: Partial<User>) => {
      if (!currentUser) return;
      try {
          const updatedUser = await api.updateUser(currentUser.id, updates);
          setCurrentUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } catch (e) {
          console.error("Failed to update user profile", e);
          throw e;
      }
  }, [currentUser]);

  // --- Organization Actions ---
  const refreshOrganization = useCallback(async () => {
      if (!currentUser?.organizationId) return;
      try {
          const orgData = await organizationsService.getWithMembers(currentUser.organizationId);
          if (orgData) {
              setCurrentOrganization({
                  id: orgData.id,
                  name: orgData.name,
                  slug: orgData.slug,
                  logoUrl: orgData.logo_url || undefined,
                  createdAt: orgData.created_at
              });
              const orgMembers = orgData.members?.map((m: any) => ({
                  id: m.id,
                  organizationId: m.organization_id,
                  userId: m.user_id,
                  role: m.role,
                  user: m.user ? {
                      id: m.user.id,
                      name: m.user.name,
                      email: m.user.email,
                      avatarUrl: m.user.avatar_url,
                      role: m.user.role,
                      isAdmin: m.user.is_admin
                  } : undefined,
                  joinedAt: m.joined_at
              })) || [];
              setOrganizationMembers(orgMembers);
              setIsOrgAdmin(orgMembers.some(m => m.userId === currentUser.id && m.role === 'admin'));
          }
      } catch (e) {
          console.error("Failed to refresh organization", e);
      }
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
