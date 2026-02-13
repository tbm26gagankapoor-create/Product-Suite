import { Router, Response } from 'express';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest, requireAuth, requireOrgAdmin } from '../middleware/auth.middleware.js';
import { openfgaService } from '../services/openfga.service.js';
import { gitOperationsService } from '../services/git-operations.service.js';
import { userGitTokensRepository } from '../db/postgres/repositories/user-git-tokens.repository.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all projects (filtered by user access)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.json({ success: true, data: [] });
  }

  const projects = await projectsService.getAllForUser(user.tenantId!, user.id, user.isAdmin);
  res.json({ success: true, data: projects });
});

// Get project by ID (with access check)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (user && !(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const project = await projectsService.getById(user?.tenantId!, projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Get project by code (with access check)
router.get('/code/:code', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const project = await projectsService.getByCode(user?.tenantId!, req.params.code);

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (user && !(await projectsService.userHasAccess(user.tenantId!, project.id, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  res.json({ success: true, data: project });
});

// Create project (any authenticated user can create — they become the owner)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, description, code, owner_id } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      error: 'Name and code are required',
    });
  }

  try {
    const actualOwnerId = owner_id || user.id;
    const project = await projectsService.create(user.tenantId!, { name, description, code, owner_id: actualOwnerId });

    // Automatically add the creator as a project member
    try {
      await projectsService.addMember(user.tenantId!, project.id, user.id, 'owner');
    } catch (e) {
      // Ignore if already a member
    }

    // Set up OpenFGA permissions for the project
    if (user.tenantId) {
      try {
        await openfgaService.createProject(project.id, user.tenantId, user.id);
        console.log(`[Projects] Created OpenFGA permissions for project ${project.id}`);
      } catch (error) {
        console.error('[Projects] Failed to set up OpenFGA permissions:', error);
      }
    }

    res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'Project code already exists' });
    }
    throw error;
  }
});

// Update project (with access check)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (user && !(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const project = await projectsService.update(user?.tenantId!, projectId, req.body);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Delete project (with access check - only owner or admin)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = await projectsService.getById(user.tenantId!, projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can delete' });
  }

  const deleted = await projectsService.delete(user.tenantId!, projectId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted' });
});

// Get project members (with access check)
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (user && !(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const members = await projectsService.getMembers(user?.tenantId!, projectId);
  res.json({ success: true, data: members });
});

// Add project member (only owner or admin)
router.post('/:id/members', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = await projectsService.getById(user.tenantId!, projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!user.isAdmin && !user.isOrgAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can add members' });
  }

  const { user_id, role } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  try {
    const member = await projectsService.addMember(user.tenantId!, projectId, user_id, role);

    try {
      if (role === 'admin' || role === 'owner') {
        await openfgaService.addProjectAdmin(user_id, projectId);
      } else if (role === 'viewer') {
        await openfgaService.addProjectViewer(user_id, projectId);
      } else {
        await openfgaService.addProjectMember(user_id, projectId);
      }
    } catch (error) {
      console.error('[Projects] Failed to set OpenFGA permissions:', error);
    }

    res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }
    throw error;
  }
});

// Remove project member (only owner or admin)
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = await projectsService.getById(user.tenantId!, projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can remove members' });
  }

  const removed = await projectsService.removeMember(user.tenantId!, projectId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

// =====================================================
// GIT REPOSITORY INTEGRATION ROUTES
// =====================================================

interface ProjectGitSettings {
  enabled: boolean;
  provider_id: string;
  repository: {
    owner: string;
    name: string;
    full_name: string;
    url: string;
    default_branch: string;
  };
  docs_path: string;
  branch_strategy: 'direct' | 'pr';
  repo_mode?: 'shared' | 'dedicated' | 'code';
  linked_by_user_id: string;
  linked_at: string;
  last_sync_at?: string;
}

router.get('/:id/git', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const user = req.user!;

    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    res.json({ success: true, data: gitSettings || null });
  } catch (error: any) {
    console.error('[Projects] Error getting Git settings:', error);
    res.status(500).json({ success: false, error: 'Failed to get Git settings' });
  }
});

router.post('/:id/git/link', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const user = req.user!;
    const { provider_id, owner, repo, docs_path, branch_strategy, repo_mode } = req.body;

    if (!provider_id || !owner || !repo) {
      return res.status(400).json({ success: false, error: 'provider_id, owner, and repo are required' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!user.isAdmin && !user.isOrgAdmin && project.owner_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Only project owner or admin can link a repository' });
    }

    const accessCheck = await gitOperationsService.validateAccess(user.id, provider_id, owner, repo);
    if (!accessCheck.valid) {
      return res.status(400).json({ success: false, error: accessCheck.error || 'Cannot access repository' });
    }
    if (!accessCheck.hasWriteAccess) {
      return res.status(400).json({ success: false, error: 'You need write access to the repository to link it' });
    }

    const repository = await gitOperationsService.getRepository(user.id, provider_id, owner, repo);

    const gitSettings: ProjectGitSettings = {
      enabled: true,
      provider_id,
      repository: {
        owner,
        name: repo,
        full_name: repository.full_name,
        url: repository.html_url,
        default_branch: repository.default_branch,
      },
      docs_path: docs_path || 'docs/',
      branch_strategy: branch_strategy || 'direct',
      repo_mode: repo_mode || 'dedicated',
      linked_by_user_id: user.id,
      linked_at: new Date().toISOString(),
    };

    const currentSettings = (project.settings as any) || {};
    await projectsService.update(user.tenantId!, projectId, {
      settings: { ...currentSettings, git: gitSettings },
    });

    res.json({ success: true, data: gitSettings });
  } catch (error: any) {
    console.error('[Projects] Error linking Git repository:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to link repository' });
  }
});

router.delete('/:id/git/link', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const user = req.user!;

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!user.isAdmin && !user.isOrgAdmin && project.owner_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Only project owner or admin can unlink repository' });
    }

    const currentSettings = (project.settings as any) || {};
    delete currentSettings.git;
    await projectsService.update(user.tenantId!, projectId, { settings: currentSettings });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Projects] Error unlinking Git repository:', error);
    res.status(500).json({ success: false, error: 'Failed to unlink repository' });
  }
});

router.get('/:id/git/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const user = req.user!;
    const { provider_id } = req.query;

    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!provider_id) {
      return res.status(400).json({ success: false, error: 'provider_id is required' });
    }

    const connection = await userGitTokensRepository.findByUserAndProvider(user.id, String(provider_id));
    if (!connection || !connection.is_valid) {
      return res.status(400).json({ success: false, error: 'Not connected to this Git provider', code: 'NOT_CONNECTED' });
    }

    const repositories = await gitOperationsService.listRepositories(user.id, String(provider_id));
    const writableRepos = repositories.filter(r => r.permissions?.push || r.permissions?.admin);

    res.json({ success: true, data: writableRepos });
  } catch (error: any) {
    console.error('[Projects] Error listing repositories:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list repositories' });
  }
});

router.get('/:id/git/branches', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const user = req.user!;

    if (!(await projectsService.userHasAccess(user.tenantId!, projectId, user.id, user.isAdmin))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const project = await projectsService.getById(user.tenantId!, projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const gitSettings = (project.settings as any)?.git as ProjectGitSettings | undefined;
    if (!gitSettings?.enabled) {
      return res.status(400).json({ success: false, error: 'No repository linked to this project' });
    }

    const branches = await gitOperationsService.listBranches(
      user.id,
      gitSettings.provider_id,
      gitSettings.repository.owner,
      gitSettings.repository.name
    );

    res.json({ success: true, data: branches });
  } catch (error: any) {
    console.error('[Projects] Error listing branches:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list branches' });
  }
});

export default router;
