import { Router, Response } from 'express';
import { organizationsService } from '../services/organizations.service.js';
import { authMiddleware, requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { createOrganizationSchema, updateOrganizationSchema, addOrganizationMemberSchema, validate } from '../lib/validators.js';

const router = Router();

// Get organizations for the current user (requires auth) - optimized
router.get('/my-organizations', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  // Get user's memberships with org data in optimized way
  const userMemberships = await organizationsService.getUserOrganizationsWithMembership(userId);

  res.json({ success: true, data: userMemberships });
});

// Get all organizations (with optional filters) - auth required for listing
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { slug, domain } = req.query;

  // If slug is provided, return the organization with that slug (needed for onboarding lookup)
  if (slug && typeof slug === 'string') {
    const organization = await organizationsService.getBySlug(slug);
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    return res.json({ success: true, data: [organization] });
  }

  // If domain is provided, return organizations matching that domain (needed for onboarding)
  if (domain && typeof domain === 'string') {
    const organizations = await organizationsService.getByDomain(domain);
    return res.json({ success: true, data: organizations });
  }

  // Full listing requires authentication
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const organizations = await organizationsService.getAll();
  res.json({ success: true, data: organizations });
});

// Get organization by ID - requires auth
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const organization = await organizationsService.getById(req.params.id);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: organization });
});

// Create organization - requires auth
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  // Validate request body
  const validation = validate(createOrganizationSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  const { name, slug, domain, logo_url } = validation.data;
  // Use authenticated user as owner, ignore owner_id from body for security
  const effectiveOwnerId = req.user!.id;

  const organization = await organizationsService.create({
    name,
    slug,
    domain,
    logo_url,
    owner_id: effectiveOwnerId,
  });
  res.status(201).json({ success: true, data: organization });
});

// Update organization - requires auth + ownership check
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner of this organization
  const membership = await organizationsService.getMember(req.params.id, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only organization admins can update organization settings' });
  }

  const organization = await organizationsService.update(req.params.id, req.body);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: organization });
});

// Delete organization - requires auth + owner only
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  // Only org owner can delete
  const membership = await organizationsService.getMember(req.params.id, req.user!.id);
  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Only the organization owner can delete the organization' });
  }

  const deleted = await organizationsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, message: 'Organization deleted' });
});

// --- Member Management ---

// Get organization members - requires auth
router.get('/:organizationId/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const enrichedMembers = await organizationsService.getMembersWithUsers(req.params.organizationId);
  res.json({ success: true, data: enrichedMembers });
});

// Add member to organization - requires auth + admin
router.post('/:organizationId/members', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can add members' });
  }

  // Validate request body
  const validation = validate(addOrganizationMemberSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      details: validation.details,
    });
  }

  const { user_id, role } = validation.data;

  const member = await organizationsService.addMember(req.params.organizationId, user_id, role || 'member');
  if (!member) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.status(201).json({ success: true, data: member });
});

// Update member role - requires auth + admin
router.patch('/:organizationId/members/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can change member roles' });
  }

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

// Remove member from organization - requires auth + admin
router.delete('/:organizationId/members/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can remove members' });
  }

  const removed = await organizationsService.removeMember(req.params.organizationId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

// --- Join Requests ---

// Create join request - requires auth (user requests for themselves)
router.post('/:organizationId/join-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  // User can only create join requests for themselves
  const userId = req.user!.id;

  const request = await organizationsService.createJoinRequest(req.params.organizationId, userId);
  if (!request) {
    return res.status(400).json({ success: false, error: 'Cannot create join request. Organization not found or user is already a member.' });
  }
  res.status(201).json({ success: true, data: request });
});

// Get join requests for organization - requires auth + admin
router.get('/:organizationId/join-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can view join requests' });
  }

  const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
  const requests = await organizationsService.getJoinRequests(req.params.organizationId, status);
  res.json({ success: true, data: requests });
});

// Approve/reject join request - requires auth + admin
router.patch('/:organizationId/join-requests/:requestId', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can resolve join requests' });
  }

  const { approved } = req.body;
  if (approved === undefined) {
    return res.status(400).json({ success: false, error: 'approved field is required' });
  }

  const request = await organizationsService.resolveJoinRequest(req.params.requestId, approved, req.user!.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Join request not found or already resolved' });
  }
  res.json({ success: true, data: request });
});

// --- Settings ---

// Update organization settings - requires auth + admin
router.patch('/:organizationId/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify user is admin/owner
  const membership = await organizationsService.getMember(req.params.organizationId, req.user!.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, error: 'Only admins can update organization settings' });
  }

  const organization = await organizationsService.getById(req.params.organizationId);
  if (!organization) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }

  const updatedSettings = { ...organization.settings, ...req.body };
  const updated = await organizationsService.update(req.params.organizationId, { settings: updatedSettings });
  res.json({ success: true, data: updated });
});

// --- Statistics ---

// Get organization statistics - requires auth
router.get('/:organizationId/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  const stats = await organizationsService.getStats(req.params.organizationId);
  if (!stats) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  res.json({ success: true, data: stats });
});

export default router;
