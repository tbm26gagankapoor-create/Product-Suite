
import { supabase } from './supabaseClient';
import { Project, Task, Sprint, User, Team, Comment } from '../types';

// --- Mappers ---

const mapUserFromDB = (data: any): User => ({
  id: data.id, // UUID
  name: data.name || 'User',
  role: data.role || 'Member',
  avatarUrl: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random`,
  isAdmin: data.is_admin,
  email: data.email,
  organizationId: data.organization_id,
  // Extended fields from schema
  location: data.location,
  bio: data.bio,
  website: data.website,
  jobTitle: data.job_title,
  socialLinks: data.social_links
});

const mapTeamFromDB = (data: any): Team => ({
  id: data.id,
  name: data.name,
  description: data.description,
  avatarUrl: data.avatar_url,
  organizationId: data.organization_id,
  projectIds: data.team_projects ? data.team_projects.map((tp: any) => tp.project_id) : [],
  members: data.team_members ? data.team_members.map((tm: any) => tm.user_id) : []
});

const mapCommentFromDB = (data: any): Comment => ({
  id: data.id,
  userId: data.user_id,
  text: data.text,
  timestamp: data.created_at
});

const mapProjectFromDB = (data: any): Project => ({
  id: data.id,
  name: data.name,
  key: data.key,
  description: data.description,
  status: data.status,
  progress: data.progress,
  members: data.project_members ? data.project_members.map((pm: any) => pm.user_id) : [],
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
  docs: {}, // Docs content is usually fetched on demand via documentsService to save bandwidth
  // New metadata fields
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

const mapTaskFromDB = (data: any, allUsers: User[]): Task => {
  // Graceful fallback if user not found (e.g. deleted user)
  const unknownUser: User = {
      id: 'unknown',
      name: 'Unknown User',
      avatarUrl: 'https://ui-avatars.com/api/?name=Unknown',
      email: ''
  };

  const assignee = allUsers.find(u => u.id === data.assignee_id) || unknownUser;
  const reporter = allUsers.find(u => u.id === data.reporter_id) || unknownUser;

  return {
    id: data.task_key, // Human-readable key
    uuid: data.id,     // DB UUID
    projectId: data.project_id,
    title: data.title,
    description: data.description,
    columnId: data.column_id,
    type: data.type,
    priority: data.priority,
    points: data.points,
    assignee: assignee,
    reporter: reporter,
    sprintId: data.sprint_id,
    parentEpicId: data.parent_epic_id, // Now using UUID directly for linking
    tags: (data.task_tags || []).map((t: any) => ({ label: t.label, color: t.color || 'blue' })),
    commentsCount: data.comments ? data.comments.length : 0,
    comments: data.comments ? data.comments.map(mapCommentFromDB) : [],
    startDate: data.start_date,
    dueDate: data.due_date,
    hasDescription: data.has_description,
    imageUrl: data.image_url,
    // New metadata fields
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

const mapEpicFromDB = (data: any, allUsers: User[], childTasks: any[] = []): Task => {
    const unknownUser: User = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://ui-avatars.com/api/?name=Unknown', email: '' };
    const assignee = allUsers.find(u => u.id === data.assignee_id) || unknownUser;
    const reporter = allUsers.find(u => u.id === data.reporter_id) || unknownUser;

    // Calculate cumulative points
    const points = childTasks.reduce((acc, t) => acc + (t.points || 0), 0);

    return {
        id: data.id, // Epics use UUID as ID in frontend for now since they lack a key column
        uuid: data.id,
        projectId: data.project_id,
        title: data.title,
        description: data.description,
        columnId: data.status === 'closed' ? 'done' : 'todo', // Simple mapping
        type: 'epic',
        priority: 'MEDIUM', // Default
        points: points,
        assignee: assignee,
        reporter: reporter,
        tags: [],
        commentsCount: 0,
        startDate: data.created_at,
        dueDate: undefined
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
  // Auth
  auth: {
    async signUp(email: string, password: string, fullName: string) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      
      if (data.user && !error) {
          // Attempt to create public profile immediately
          const { error: profileError } = await supabase.from('users').insert({
              id: data.user.id,
              auth_user_id: data.user.id,
              name: fullName,
              email: email,
              role: 'Member',
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
          });
          if (profileError) console.warn("User profile creation warning:", profileError);
      }
      return { data, error };
    },

    async signIn(email: string, password: string) {
      return supabase.auth.signInWithPassword({ email, password });
    },

    async signOut() {
      return supabase.auth.signOut();
    },
    
    async getSession() {
        return supabase.auth.getSession();
    }
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }
    return data.map(mapUserFromDB);
  },

  async updateUser(id: string, updates: Partial<User>) {
      // Map frontend fields to DB columns
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
      
      // Extended schema fields
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.bio) dbUpdates.bio = updates.bio;
      if (updates.website) dbUpdates.website = updates.website;
      if (updates.jobTitle) dbUpdates.job_title = updates.jobTitle;
      if (updates.socialLinks) dbUpdates.social_links = updates.socialLinks;

      const { data, error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      return mapUserFromDB(data);
  },

  // Teams
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(user_id), team_projects(project_id)');
      
    if (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
    return data.map(mapTeamFromDB);
  },

  async createTeam(team: Team) {
    const { data: teamData, error } = await supabase.from('teams').insert({
      name: team.name,
      description: team.description,
      avatar_url: team.avatarUrl
    }).select().single();
    
    if (error) throw error;

    if (team.members.length > 0) {
        const memberRows = team.members.map(uid => ({ team_id: teamData.id, user_id: uid }));
        await supabase.from('team_members').insert(memberRows);
    }

    if (team.projectIds.length > 0) {
        const projectRows = team.projectIds.map(pid => ({ team_id: teamData.id, project_id: pid }));
        await supabase.from('team_projects').insert(projectRows);
    }

    return { ...team, id: teamData.id };
  },

  // Projects
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_members(user_id)')
      .is('deleted_at', null) // Only fetch active projects
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data.map(mapProjectFromDB);
  },

  async createProject(project: Project) {
    const { data, error } = await supabase.from('projects').insert({
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status,
      progress: project.progress,
      owner_id: isValidUUID(project.ownerId) ? project.ownerId : null,
      start_date: project.startDate,
      due_date: project.dueDate,
      tags: project.tags,
      color: project.color,
      image_url: project.imageUrl,
      vision: project.vision,
      prd: project.prd,
      // New metadata fields
      target_release_date: project.targetReleaseDate,
      budget: project.budget,
      spent_budget: project.spentBudget,
      category: project.category,
      lifecycle_stage: project.lifecycleStage,
      okrs: project.okrs || [],
      success_metrics: project.successMetrics || [],
      target_audience: project.targetAudience,
      competitors: project.competitors || [],
      risks: project.risks || [],
      dependencies: project.dependencies || [],
      health_status: project.healthStatus,
      priority_rank: project.priorityRank,
      customer_count: project.customerCount,
      revenue_impact: project.revenueImpact
    }).select().single();

    if (error) {
        console.error("Create Project Error:", error);
        throw error;
    }

    // Insert Members
    if (project.members.length > 0) {
        const memberRows = project.members.filter(isValidUUID).map(uid => ({ project_id: data.id, user_id: uid }));
        if (memberRows.length > 0) {
            await supabase.from('project_members').insert(memberRows);
        }
    }

    // Insert Docs & Initial Versions
    if (project.docs && Object.keys(project.docs).length > 0) {
        const docRows: any[] = [];
        const versionRows: any[] = [];
        const userId = isValidUUID(project.ownerId) ? project.ownerId : null;

        for (const [key, content] of Object.entries(project.docs)) {
            if (content && typeof content === 'string') {
                docRows.push({
                    project_id: data.id,
                    section_id: key,
                    content: content
                });

                if (userId) {
                    versionRows.push({
                        project_id: data.id,
                        section_id: key,
                        content: content,
                        summary: 'Initial version - AI generated',
                        user_id: userId
                    });
                }
            }
        }
        
        if (docRows.length > 0) {
            await supabase.from('project_documents').insert(docRows);
        }

        if (versionRows.length > 0) {
            await supabase.from('document_versions').insert(versionRows);
        }
    }

    return mapProjectFromDB(data);
  },

  async updateProject(project: Project) {
    const { error } = await supabase.from('projects').update({
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      due_date: project.dueDate,
      vision: project.vision,
      prd: project.prd,
      tags: project.tags,
      // New metadata fields
      target_release_date: project.targetReleaseDate,
      budget: project.budget,
      spent_budget: project.spentBudget,
      category: project.category,
      lifecycle_stage: project.lifecycleStage,
      okrs: project.okrs || [],
      success_metrics: project.successMetrics || [],
      target_audience: project.targetAudience,
      competitors: project.competitors || [],
      risks: project.risks || [],
      dependencies: project.dependencies || [],
      health_status: project.healthStatus,
      priority_rank: project.priorityRank,
      customer_count: project.customerCount,
      revenue_impact: project.revenueImpact
    }).eq('id', project.id);
    
    if (error) throw error;
    
    if (project.docs) {
        for (const [key, content] of Object.entries(project.docs)) {
            if (content) {
                await supabase.from('project_documents').upsert(
                    { project_id: project.id, section_id: key, content: content },
                    { onConflict: 'project_id,section_id' }
                );
            }
        }
    }

    return project;
  },

  async deleteProject(projectId: string) {
      const timestamp = new Date().toISOString();
      
      // Cascade Soft Delete:
      
      // 1. Soft delete tasks related to this project
      await supabase
        .from('tasks')
        .update({ is_deleted: true, deleted_at: timestamp })
        .eq('project_id', projectId);

      // 2. Soft delete epics related to this project
      await supabase
        .from('epics')
        .update({ is_deleted: true, deleted_at: timestamp })
        .eq('project_id', projectId);

      // 3. Soft delete sprints related to this project
      await supabase
        .from('sprints')
        .update({ is_deleted: true, deleted_at: timestamp })
        .eq('project_id', projectId);

      // 4. Soft delete the project itself
      const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true, deleted_at: timestamp })
        .eq('id', projectId);
        
      if (error) throw error;
  },

  // Tasks & Epics
  async getTasks(users: User[]) {
    // 1. Fetch Tasks
    const { data: tasksData, error: taskError } = await supabase
      .from('tasks')
      .select('*, task_tags(*), comments(*)')
      .is('deleted_at', null); // Active only
      
    if (taskError) throw taskError;

    // 2. Fetch Epics
    const { data: epicsData, error: epicError } = await supabase
        .from('epics')
        .select('*')
        .is('deleted_at', null); // Active only
        
    if (epicError) throw epicError;
    
    // Map Tasks first
    const mappedTasks = tasksData.map((d: any) => mapTaskFromDB(d, users));

    // Map Epics
    const mappedEpics = epicsData.map((e: any) => {
        const children = mappedTasks.filter(t => t.parentEpicId === e.id);
        return mapEpicFromDB(e, users, children);
    });

    return [...mappedEpics, ...mappedTasks];
  },

  async createTask(task: Task) {
    const payload = {
      task_key: task.id,
      project_id: task.projectId,
      title: task.title,
      description: task.description,
      column_id: task.columnId,
      type: task.type,
      priority: task.priority,
      points: task.points,
      assignee_id: isValidUUID(task.assignee.id) ? task.assignee.id : null,
      reporter_id: isValidUUID(task.reporter.id) ? task.reporter.id : null,
      sprint_id: task.sprintId,
      parent_epic_id: isValidUUID(task.parentEpicId) ? task.parentEpicId : null,
      start_date: task.startDate,
      due_date: task.dueDate,
      has_description: !!task.description,
      // New metadata fields
      actual_start_date: task.actualStartDate,
      completed_date: task.completedDate,
      acceptance_criteria: task.acceptanceCriteria || [],
      customer_value: task.customerValue,
      technical_debt: task.technicalDebt || false,
      environment: task.environment || [],
      labels: task.labels || [],
      resolution: task.resolution,
      external_links: task.externalLinks || []
    };

    const { data: taskData, error } = await supabase.from('tasks').insert(payload).select().single();

    if (error) {
        console.error("Create Task Error:", error);
        throw error;
    }

    if (task.tags.length > 0) {
        const tagRows = task.tags.map(t => ({
            task_id: taskData.id,
            label: t.label,
            color: t.color
        }));
        await supabase.from('task_tags').insert(tagRows);
    }

    return { ...task, uuid: taskData.id };
  },

  async createEpic(epic: Task) {
      const payload = {
          project_id: epic.projectId,
          title: epic.title,
          description: epic.description,
          reporter_id: isValidUUID(epic.reporter.id) ? epic.reporter.id : null,
          assignee_id: isValidUUID(epic.assignee.id) ? epic.assignee.id : null,
          status: 'open'
      };

      const { data, error } = await supabase.from('epics').insert(payload).select().single();

      if (error) {
          console.error("Create Epic Error:", error);
          throw error;
      }
      
      return { ...epic, id: data.id, uuid: data.id };
  },

  async updateTask(task: Task) {
    if (task.type === 'epic') {
        const { error } = await supabase.from('epics').update({
            title: task.title,
            description: task.description,
            status: task.columnId === 'done' ? 'closed' : 'open',
            assignee_id: isValidUUID(task.assignee.id) ? task.assignee.id : null
        }).eq('id', task.uuid || task.id);
        if (error) throw error;
        return task;
    }

    const updatePayload: any = {
      title: task.title,
      description: task.description,
      column_id: task.columnId,
      priority: task.priority,
      points: task.points,
      assignee_id: isValidUUID(task.assignee.id) ? task.assignee.id : null,
      sprint_id: task.sprintId,
      due_date: task.dueDate,
      has_description: !!task.description,
      parent_epic_id: isValidUUID(task.parentEpicId) ? task.parentEpicId : null,
      // New metadata fields
      actual_start_date: task.actualStartDate,
      completed_date: task.completedDate,
      acceptance_criteria: task.acceptanceCriteria || [],
      customer_value: task.customerValue,
      technical_debt: task.technicalDebt || false,
      environment: task.environment || [],
      labels: task.labels || [],
      resolution: task.resolution,
      external_links: task.externalLinks || []
    };

    let matchQuery = supabase.from('tasks').update(updatePayload);
    if (task.uuid) {
        matchQuery = matchQuery.eq('id', task.uuid);
    } else {
        matchQuery = matchQuery.eq('task_key', task.id);
    }

    const { error, data: updatedData } = await matchQuery.select().single();
    if (error) throw error;

    const targetId = task.uuid || updatedData.id;
    if (targetId) {
        await supabase.from('task_tags').delete().eq('task_id', targetId);
        if (task.tags.length > 0) {
            const tagRows = task.tags.map(t => ({
                task_id: targetId,
                label: t.label,
                color: t.color
            }));
            await supabase.from('task_tags').insert(tagRows);
        }
    }

    return task;
  },

  async deleteTask(taskId: string) {
    const timestamp = new Date().toISOString();

    // 1. Try to find if it's a task (by key)
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('task_key', taskId)
      .maybeSingle();

    if (task) {
        const { error } = await supabase
            .from('tasks')
            .update({ is_deleted: true, deleted_at: timestamp })
            .eq('id', task.id);
        if (error) throw error;
        return;
    }

    // 2. If not found by key, try as UUID (Epic or Task UUID)
    if (isValidUUID(taskId)) {
        // Check if it's a task UUID
        const { data: taskByUuid } = await supabase.from('tasks').select('id').eq('id', taskId).maybeSingle();
        if (taskByUuid) {
             const { error } = await supabase
                .from('tasks')
                .update({ is_deleted: true, deleted_at: timestamp })
                .eq('id', taskId);
             if (error) throw error;
             return;
        }

        // Check if it's an Epic
        const { data: epic } = await supabase.from('epics').select('id').eq('id', taskId).maybeSingle();
        if (epic) {
             const { error } = await supabase
                .from('epics')
                .update({ is_deleted: true, deleted_at: timestamp })
                .eq('id', taskId);
             if (error) throw error;
        }
    }
  },

  // Comments
  async createComment(taskId: string, comment: Comment) {
    let uuid = taskId;
    if (taskId.length < 20) { 
        const { data } = await supabase.from('tasks').select('id').eq('task_key', taskId).single();
        if (data) uuid = data.id;
    }

    const { error } = await supabase.from('comments').insert({
      task_id: uuid,
      user_id: comment.userId,
      text: comment.text,
      created_at: comment.timestamp
    });
    if (error) throw error;
    return comment;
  },

  // Sprints
  async getSprints() {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .is('deleted_at', null); 
      
    if (error) throw error;
    return data.map(mapSprintFromDB);
  },

  async createSprint(sprint: Sprint) {
    const { data, error } = await supabase.from('sprints').insert({
      project_id: sprint.projectId,
      name: sprint.name,
      start_date: sprint.startDate,
      end_date: sprint.endDate,
      goal: sprint.goal,
      status: sprint.status
    }).select().single();
    
    if (error) throw error;
    return { ...sprint, id: data.id };
  }
};
