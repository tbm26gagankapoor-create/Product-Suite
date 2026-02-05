import { Router, Response } from 'express';
import { usersService } from '../services/users.service.js';
import { organizationsService } from '../services/organizations.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { createUserSchema, updateUserSchema, validate } from '../lib/validators.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all users (filtered by user's organizations)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { team_id, page, limit } = req.query;

  // If no user, return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // If team_id filter is provided, get users in that team
  if (team_id) {
    const users = await usersService.getByTeamId(team_id as string);
    return res.json({ success: true, data: users });
  }

  // Optimized: Get users by organization using a single aggregation
  const users = await usersService.getUsersByOrganizationMembership(
    user.id,
    {
      page: parseInt(page as string) || 1,
      limit: Math.min(parseInt(limit as string) || 50, 200),
    }
  );

  res.json({ success: true, data: users.data, pagination: users.pagination });
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
  // Validate request body
  const validation = validate(createUserSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  const { name, email, password, avatar_url, designation } = validation.data;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required',
    });
  }

  try {
    const user = await usersService.create({ name, email, password, avatar_url, designation });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate key')) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    throw error;
  }
});

// Update user
router.patch('/:id', async (req, res) => {
  // Validate request body
  const validation = validate(updateUserSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  // Filter out null values for the service
  const updates: Record<string, any> = {};
  for (const [key, value] of Object.entries(validation.data)) {
    if (value !== null && value !== undefined) {
      updates[key] = value;
    }
  }

  const user = await usersService.update(req.params.id, updates);
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
