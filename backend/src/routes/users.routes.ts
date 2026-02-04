import { Router, Response } from 'express';
import { usersService } from '../services/users.service.js';
import { organizationsService } from '../services/organizations.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import database from '../lib/database.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all users (filtered by user's organizations)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { team_id } = req.query;

  // If no user, return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // If team_id filter is provided, get users in that team
  if (team_id) {
    const users = await usersService.getByTeamId(team_id as string);
    return res.json({ success: true, data: users });
  }

  // Get user's organization memberships
  const userMemberships = await database.findMany<any>('organization_members', { user_id: user.id });
  const userOrgIds = userMemberships.map((m: any) => m.organization_id);

  // Get all members from user's organizations
  const orgMembers = await Promise.all(
    userOrgIds.map((orgId: string) => database.findMany<any>('organization_members', { organization_id: orgId }))
  );
  const allMemberUserIds = new Set(orgMembers.flat().map((m: any) => m.user_id));

  // Get all users
  const allUsers = await usersService.getAll();

  // Filter to only users in same organizations
  const users = allUsers.filter(u => allMemberUserIds.has(u.id));

  res.json({ success: true, data: users });
});

// Get user by ID
router.get('/:id', async (req, res) => {
  const user = await usersService.getById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

// Create user
router.post('/', async (req, res) => {
  const { name, email, password, avatar_url, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required',
    });
  }

  try {
    const user = await usersService.create({ name, email, password, avatar_url, role });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    throw error;
  }
});

// Update user
router.patch('/:id', async (req, res) => {
  const user = await usersService.update(req.params.id, req.body);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

// Delete user
router.delete('/:id', async (req, res) => {
  const deleted = await usersService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, message: 'User deleted' });
});

// Switch active organization
router.post('/switch-organization', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { organizationId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'organizationId is required' });
  }

  // Verify user is a member of this organization
  const membership = await organizationsService.getMember(organizationId, userId);
  if (!membership) {
    return res.status(403).json({ success: false, error: 'You are not a member of this organization' });
  }

  // Update user's active organization
  const updatedUser = await usersService.update(userId, { organization_id: organizationId });
  if (!updatedUser) {
    return res.status(500).json({ success: false, error: 'Failed to switch organization' });
  }

  res.json({
    success: true,
    data: {
      user: updatedUser,
      organizationId,
      role: membership.role,
    },
  });
});

export default router;
