import { Router, Response } from 'express';
import { organizationsService } from '../services/organizations.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import database from '../lib/database.js';

const router = Router();

// Get organizations for the current user (requires auth)
router.get('/my-organizations', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  const organizations = await organizationsService.getUserOrganizations(userId);

  // Get user's membership details for each org
  const memberships = await Promise.all(organizations.map(async (org) => {
    const member = await organizationsService.getMember(org.id, userId);
    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        logoUrl: org.logo_url,
        ownerId: org.owner_id,
        memberCount: org.memberCount,
        projectCount: org.projectCount,
      },
      role: member?.role || 'member',
      joinedAt: member?.joined_at,
    };
  }));

  res.json({ success: true, data: memberships });
});

// Get all organizations (with optional filters)
router.get('/', async (req, res) => {
  const { slug, domain } = req.query;

  // If slug is provided, return the organization with that slug
  if (slug && typeof slug === 'string') {
    const organization = await organizationsService.getBySlug(slug);
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    return res.json({ success: true, data: [organization] });
  }

  // If domain is provided, return organizations matching that domain
  if (domain && typeof domain === 'string') {
    const organizations = await organizationsService.getByDomain(domain);
    return res.json({ success: true, data: organizations });
  }

  // Otherwise return all organizations
  const organizations = await organizationsService.getAll();
  res.json({ success: true, data: organizations });
});

// Get organization by ID
router.get('/:id', async (req, res) => {
  const organization = await organizationsService.getById(req.params.id);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: organization });
});

// Create organization
router.post('/', async (req, res) => {
  const { name, slug, domain, logo_url, owner_id } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Organization name is required',
    });
  }

  const organization = await organizationsService.create({ name, slug, domain, logo_url, owner_id });
  res.status(201).json({ success: true, data: organization });
});

// Update organization
router.patch('/:id', async (req, res) => {
  const organization = await organizationsService.update(req.params.id, req.body);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: organization });
});

// Delete organization
router.delete('/:id', async (req, res) => {
  const deleted = await organizationsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, message: 'Organization deleted' });
});

// --- Member Management ---

// Get organization members
router.get('/:organizationId/members', async (req, res) => {
  const members = await organizationsService.getMembers(req.params.organizationId);

  // Enrich members with user data
  const enrichedMembers = await Promise.all(members.map(async member => {
    const user = await database.findById<any>('users', member.user_id);
    return {
      ...member,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      } : null,
    };
  }));

  res.json({ success: true, data: enrichedMembers });
});

// Add member to organization
router.post('/:organizationId/members', async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const member = await organizationsService.addMember(req.params.organizationId, user_id, role || 'member');
  if (!member) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.status(201).json({ success: true, data: member });
});

// Update member role
router.patch('/:organizationId/members/:userId', async (req, res) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ success: false, error: 'role is required' });
  }

  const member = await organizationsService.updateMemberRole(req.params.organizationId, req.params.userId, role);
  if (!member) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, data: member });
});

// Remove member from organization
router.delete('/:organizationId/members/:userId', async (req, res) => {
  const removed = await organizationsService.removeMember(req.params.organizationId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

// --- Join Requests ---

// Create join request
router.post('/:organizationId/join-requests', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const request = await organizationsService.createJoinRequest(req.params.organizationId, user_id);
  if (!request) {
    return res.status(400).json({ success: false, error: 'Cannot create join request. Organization not found or user is already a member.' });
  }
  res.status(201).json({ success: true, data: request });
});

// Get join requests for organization
router.get('/:organizationId/join-requests', async (req, res) => {
  const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
  const requests = await organizationsService.getJoinRequests(req.params.organizationId, status);
  res.json({ success: true, data: requests });
});

// Approve/reject join request
router.patch('/:organizationId/join-requests/:requestId', async (req, res) => {
  const { approved, resolved_by } = req.body;
  if (approved === undefined) {
    return res.status(400).json({ success: false, error: 'approved field is required' });
  }

  const request = await organizationsService.resolveJoinRequest(req.params.requestId, approved, resolved_by);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Join request not found or already resolved' });
  }
  res.json({ success: true, data: request });
});

// --- Settings ---

// Update organization settings
router.patch('/:organizationId/settings', async (req, res) => {
  const organization = await organizationsService.getById(req.params.organizationId);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }

  const updatedSettings = { ...organization.settings, ...req.body };
  const updated = await organizationsService.update(req.params.organizationId, { settings: updatedSettings });
  res.json({ success: true, data: updated });
});

// --- Statistics ---

// Get organization statistics
router.get('/:organizationId/stats', async (req, res) => {
  const stats = await organizationsService.getStats(req.params.organizationId);
  if (!stats) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: stats });
});

export default router;
