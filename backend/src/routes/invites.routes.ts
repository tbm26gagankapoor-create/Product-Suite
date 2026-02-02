import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { invitesService } from '../services/invites.service.js';
import { organizationsService } from '../services/organizations.service.js';
import { emailService } from '../services/email.service.js';
import database from '../lib/database.js';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * POST /api/v1/invites
 * Create an invite and send email
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, role, organizationId } = req.body;
    const inviterId = req.user?.id;

    // Validate inputs
    if (!email || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Email and organization ID are required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Validate role
    const inviteRole = role === 'admin' ? 'admin' : 'member';

    // Verify organization exists
    const organization = await organizationsService.getById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Check if inviter is a member of the organization
    const inviterMembership = await organizationsService.getMember(organizationId, inviterId!);
    if (!inviterMembership) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member of this organization to invite others',
      });
    }

    // Check if user is already a member
    const existingUsers = await database.findMany<any>('users', { email: email.toLowerCase() });
    for (const existingUser of existingUsers) {
      const existingMembership = await organizationsService.getMember(organizationId, existingUser.id);
      if (existingMembership) {
        return res.status(400).json({
          success: false,
          error: 'This user is already a member of the organization',
        });
      }
    }

    // Create the invite
    const invite = await invitesService.create({
      organizationId,
      email,
      role: inviteRole,
      invitedBy: inviterId!,
    });

    // Get inviter info for email
    const inviter = await database.findById<any>('users', inviterId!);
    const inviterName = inviter?.name || inviter?.email || 'A team member';

    // Generate invite link
    const inviteLink = invitesService.getInviteLink(invite.id);

    // Send email
    const emailResult = await emailService.sendInviteEmail({
      toEmail: email,
      inviterName,
      organizationName: organization.name,
      inviteLink,
      role: inviteRole,
    });

    res.status(201).json({
      success: true,
      data: {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expires_at,
          inviteLink,
        },
        emailSent: emailResult.success,
        emailError: emailResult.error,
      },
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invitation',
    });
  }
});

/**
 * GET /api/v1/invites/:id
 * Get invite details (for accept page)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invite = await invitesService.getById(id);

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    // Check if expired
    if (!invitesService.isValid(invite)) {
      return res.status(410).json({
        success: false,
        error: 'This invitation has expired or is no longer valid',
      });
    }

    // Get organization info
    const organization = await organizationsService.getById(invite.organization_id);

    // Get inviter info
    const inviter = await database.findById<any>('users', invite.invited_by);

    res.json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expires_at,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          logoUrl: organization.logo_url,
        } : null,
        invitedBy: inviter ? {
          name: inviter.name,
          avatarUrl: inviter.avatar_url,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invitation',
    });
  }
});

/**
 * POST /api/v1/invites/:id/accept
 * Accept an invitation
 */
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    const invite = await invitesService.getById(id);

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    // Verify the invite is for this user's email
    if (invite.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'This invitation is for a different email address',
      });
    }

    // Check if valid
    if (!invitesService.isValid(invite)) {
      return res.status(410).json({
        success: false,
        error: 'This invitation has expired or is no longer valid',
      });
    }

    // Accept the invite
    const updatedInvite = await invitesService.accept(id);
    if (!updatedInvite) {
      return res.status(400).json({
        success: false,
        error: 'Failed to accept invitation',
      });
    }

    // Add user to organization
    const memberRole = invite.role === 'admin' ? 'admin' : 'member';
    const membership = await organizationsService.addMember(invite.organization_id, userId!, memberRole);

    if (!membership) {
      return res.status(400).json({
        success: false,
        error: 'Failed to add user to organization',
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Invitation accepted successfully',
        organizationId: invite.organization_id,
        role: memberRole,
      },
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation',
    });
  }
});

/**
 * DELETE /api/v1/invites/:id
 * Revoke an invitation
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const invite = await invitesService.getById(id);

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    // Check if user can revoke (must be admin/owner of org)
    const membership = await organizationsService.getMember(invite.organization_id, userId!);
    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can revoke invitations',
      });
    }

    const revoked = await invitesService.revoke(id);
    if (!revoked) {
      return res.status(400).json({
        success: false,
        error: 'Failed to revoke invitation',
      });
    }

    res.json({
      success: true,
      data: { message: 'Invitation revoked successfully' },
    });
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke invitation',
    });
  }
});

/**
 * GET /api/v1/invites/organization/:orgId
 * Get all invites for an organization
 */
router.get('/organization/:orgId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.id;

    // Check if user is a member of the organization
    const membership = await organizationsService.getMember(orgId, userId!);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member of this organization',
      });
    }

    const invites = await invitesService.getByOrganization(orgId);

    // Enrich with inviter info
    const enrichedInvites = await Promise.all(invites.map(async invite => {
      const inviter = await database.findById<any>('users', invite.invited_by);
      return {
        ...invite,
        invitedByName: inviter?.name || 'Unknown',
        isValid: invitesService.isValid(invite),
      };
    }));

    res.json({
      success: true,
      data: enrichedInvites,
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invitations',
    });
  }
});

/**
 * POST /api/v1/invites/:id/resend
 * Resend invitation email
 */
router.post('/:id/resend', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const invite = await invitesService.getById(id);

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
    }

    // Check if user can resend (must be member of org)
    const membership = await organizationsService.getMember(invite.organization_id, userId!);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member of this organization',
      });
    }

    // Refresh the invite expiration
    const refreshedInvite = await invitesService.create({
      organizationId: invite.organization_id,
      email: invite.email,
      role: invite.role,
      invitedBy: userId!,
    });

    // Get organization and inviter info
    const organization = await organizationsService.getById(invite.organization_id);
    const inviter = await database.findById<any>('users', userId!);
    const inviterName = inviter?.name || inviter?.email || 'A team member';
    const inviteLink = invitesService.getInviteLink(refreshedInvite.id);

    // Send email
    const emailResult = await emailService.sendInviteEmail({
      toEmail: invite.email,
      inviterName,
      organizationName: organization?.name || 'Your Organization',
      inviteLink,
      role: invite.role,
    });

    res.json({
      success: true,
      data: {
        message: 'Invitation resent successfully',
        emailSent: emailResult.success,
        emailError: emailResult.error,
      },
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend invitation',
    });
  }
});

export default router;
