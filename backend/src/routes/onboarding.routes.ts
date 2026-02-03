import { Router, Response } from 'express';
import { onboardingService } from '../services/onboarding.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /onboarding/organization
 * Creates a new organization along with its owner user.
 * This is the entry point for new tenant creation.
 *
 * Body:
 * {
 *   organization: { name, slug?, domain?, logo_url? },
 *   owner: { name, email, password, avatar_url?, designation? }
 * }
 */
router.post('/organization', async (req, res) => {
  try {
    const { organization, owner } = req.body;

    // Validate required fields
    if (!organization?.name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required',
      });
    }

    if (!owner?.name || !owner?.email || !owner?.password) {
      return res.status(400).json({
        success: false,
        error: 'Owner name, email, and password are required',
      });
    }

    if (owner.password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    const result = await onboardingService.createOrganizationWithOwner({
      organization,
      owner,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message?.includes('Email already exists')) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create organization',
    });
  }
});

/**
 * POST /onboarding/organization/:organizationId/users
 * Creates a new user under an existing organization.
 * Requires authentication from an admin/owner of the organization.
 *
 * Body:
 * {
 *   name, email, password, avatar_url?, designation?, role?
 * }
 */
router.post('/organization/:organizationId/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { name, email, password, avatar_url, designation, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    const result = await onboardingService.createUserUnderOrganization(organizationId, {
      name,
      email,
      password,
      avatar_url,
      designation,
      role,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message?.includes('Email already exists')) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }
    if (error.message?.includes('Organization not found')) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create user',
    });
  }
});

export default router;
