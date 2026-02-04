import { Router, Response } from 'express';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all projects (filtered by user access)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { member_id } = req.query;

  // If no user (not logged in), return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // If member_id filter is provided, get projects where that user is a member
  if (member_id) {
    const projects = await projectsService.getByMemberId(member_id as string);
    return res.json({ success: true, data: projects });
  }

  const projects = await projectsService.getAllForUser(user.id, user.isAdmin, user.organizationId);
  res.json({ success: true, data: projects });
});

// Get project by ID (with access check)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  // Check access
  if (user) {
    const hasAccess = await projectsService.userHasAccess(projectId, user.id, user.isAdmin);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  const project = await projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Get project by code (with access check)
router.get('/code/:code', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const project = await projectsService.getByCode(req.params.code);

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Check access
  if (user) {
    const hasAccess = await projectsService.userHasAccess(project.id, user.id, user.isAdmin);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  res.json({ success: true, data: project });
});

// Create project
router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { name, description, code, owner_id, organization_id, image_url, icon, icon_color, vision, prd, docs } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      error: 'Name and code are required',
    });
  }

  try {
    // Set owner to current user if not specified
    const actualOwnerId = owner_id || user?.id;
    // Set organization_id from request body, or fall back to user's organization
    const actualOrganizationId = organization_id || user?.organizationId;
    const project = await projectsService.create({
      name, description, code,
      owner_id: actualOwnerId,
      organization_id: actualOrganizationId,
      image_url, icon, icon_color,
      vision, prd, docs
    });

    // Automatically add the creator as a project member
    if (user && actualOwnerId === user.id) {
      try {
        await projectsService.addMember(project.id, user.id, 'owner');
      } catch (e) {
        // Ignore if already a member
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

  // Check access
  if (user) {
    const hasAccess = await projectsService.userHasAccess(projectId, user.id, user.isAdmin);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  const project = await projectsService.update(projectId, req.body);
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

  // Only allow owner or admin to delete
  const project = await projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can delete' });
  }

  const deleted = await projectsService.delete(projectId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted' });
});

// Get project members (with access check)
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  // Check access
  if (user) {
    const hasAccess = await projectsService.userHasAccess(projectId, user.id, user.isAdmin);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  const members = await projectsService.getMembers(projectId);
  res.json({ success: true, data: members });
});

// Add project member (only owner or admin)
router.post('/:id/members', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = await projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Only owner or admin can add members
  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can add members' });
  }

  const { user_id, role } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  try {
    const member = await projectsService.addMember(projectId, user_id, role);
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

  const project = await projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Only owner or admin can remove members
  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can remove members' });
  }

  const removed = await projectsService.removeMember(projectId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

export default router;
