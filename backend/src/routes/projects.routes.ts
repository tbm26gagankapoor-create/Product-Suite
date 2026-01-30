import { Router, Response } from 'express';
import { projectsService } from '../services/projects.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all projects (filtered by user access)
router.get('/', (req: AuthRequest, res: Response) => {
  const user = req.user;

  // If no user (not logged in), return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  const projects = projectsService.getAllForUser(user.id, user.isAdmin);
  res.json({ success: true, data: projects });
});

// Get project by ID (with access check)
router.get('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  // Check access
  if (user && !projectsService.userHasAccess(projectId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const project = projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Get project by code (with access check)
router.get('/code/:code', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const project = projectsService.getByCode(req.params.code);

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Check access
  if (user && !projectsService.userHasAccess(project.id, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  res.json({ success: true, data: project });
});

// Create project
router.post('/', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { name, description, code, owner_id } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      error: 'Name and code are required',
    });
  }

  try {
    // Set owner to current user if not specified
    const actualOwnerId = owner_id || user?.id;
    const project = projectsService.create({ name, description, code, owner_id: actualOwnerId });

    // Automatically add the creator as a project member
    if (user && actualOwnerId === user.id) {
      try {
        projectsService.addMember(project.id, user.id, 'owner');
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
router.patch('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  // Check access
  if (user && !projectsService.userHasAccess(projectId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const project = projectsService.update(projectId, req.body);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Delete project (with access check - only owner or admin)
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Only allow owner or admin to delete
  const project = projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can delete' });
  }

  const deleted = projectsService.delete(projectId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted' });
});

// Get project members (with access check)
router.get('/:id/members', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  // Check access
  if (user && !projectsService.userHasAccess(projectId, user.id, user.isAdmin)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const members = projectsService.getMembers(projectId);
  res.json({ success: true, data: members });
});

// Add project member (only owner or admin)
router.post('/:id/members', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = projectsService.getById(projectId);
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
    const member = projectsService.addMember(projectId, user_id, role);
    res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }
    throw error;
  }
});

// Remove project member (only owner or admin)
router.delete('/:id/members/:userId', (req: AuthRequest, res: Response) => {
  const user = req.user;
  const projectId = req.params.id;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const project = projectsService.getById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Only owner or admin can remove members
  if (!user.isAdmin && project.owner_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can remove members' });
  }

  const removed = projectsService.removeMember(projectId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

export default router;
