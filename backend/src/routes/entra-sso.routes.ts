/**
 * Entra ID SSO Routes
 * API endpoints for Enterprise SSO configuration and user provisioning
 */

import { Router, Request, Response } from 'express';
import { entraSSOService } from '../services/entra-sso.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { query } from '../db/postgres/client.js';

const router = Router();

/**
 * POST /api/v1/sso/entra/login
 * SSO login with auto-provisioning
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { code, organizationId } = req.body;

    if (!code || !organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'code and organizationId are required' }
      });
    }

    const result = await entraSSOService.ssoLogin({ code, organizationId });

    res.json({
      success: true,
      data: {
        user: result.user,
        // Don't expose access token to client for security
        // Access token should be stored server-side for Graph API calls
      }
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Login failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'SSO login failed' }
    });
  }
});

/**
 * POST /api/v1/sso/entra/admin-consent
 * Generate admin consent URL for organization-wide SSO
 */
router.post('/admin-consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { organizationId, redirectUri } = req.body;

    // Verify user has admin access to this organization
    const userOrgId = (req as any).user?.organizationId;
    const userRole = (req as any).user?.role;

    if (userOrgId !== organizationId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }

    const consentUrl = await entraSSOService.generateAdminConsentUrl({
      organizationId,
      redirectUri
    });

    res.json({
      success: true,
      data: { consentUrl }
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Admin consent failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to generate consent URL' }
    });
  }
});

/**
 * POST /api/v1/sso/entra/sync-directory
 * Sync users from Azure AD directory
 */
router.post('/sync-directory', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { organizationId, accessToken, filter } = req.body;

    // Verify user has admin access
    const userOrgId = (req as any).user?.organizationId;
    const userRole = (req as any).user?.role;

    if (userOrgId !== organizationId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }

    const result = await entraSSOService.syncUsersFromDirectory({
      accessToken,
      organizationId,
      filter
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Directory sync failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Directory sync failed' }
    });
  }
});

/**
 * GET /api/v1/sso/entra/config/:organizationId
 * Get SSO configuration for an organization
 */
router.get('/config/:organizationId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Verify user has access to this organization
    const userOrgId = (req as any).user?.organizationId;
    if (userOrgId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    const config = await entraSSOService.getOrganizationSSO(organizationId);

    res.json({
      success: true,
      data: config || null
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Failed to fetch config:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch SSO configuration' }
    });
  }
});

/**
 * POST /api/v1/sso/entra/config
 * Create or update SSO configuration for an organization
 */
router.post('/config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      tenantId,
      autoProvisionUsers,
      defaultRole,
      groupRoleMappings,
      allowedDomains
    } = req.body;

    // Verify user has admin access
    const userOrgId = (req as any).user?.organizationId;
    const userRole = (req as any).user?.role;

    if (userOrgId !== organizationId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }

    // Get Entra ID SSO provider ID
    const providerResult = await query(
      `SELECT id FROM sso_providers WHERE provider_type = 'entra_id' LIMIT 1`
    );

    if (providerResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Entra ID SSO provider not configured in system' }
      });
    }

    const ssoProviderId = providerResult.rows[0].id;

    // Upsert organization SSO config
    const result = await query(
      `INSERT INTO organization_sso (
        organization_id,
        sso_provider_id,
        tenant_id,
        auto_provision_users,
        default_role,
        group_role_mappings,
        allowed_domains
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, sso_provider_id)
      DO UPDATE SET
        tenant_id = $3,
        auto_provision_users = $4,
        default_role = $5,
        group_role_mappings = $6,
        allowed_domains = $7,
        updated_at = NOW()
      RETURNING *`,
      [
        organizationId,
        ssoProviderId,
        tenantId,
        autoProvisionUsers !== undefined ? autoProvisionUsers : true,
        defaultRole || 'member',
        JSON.stringify(groupRoleMappings || { admin: [], manager: [], member: [] }),
        allowedDomains || null
      ]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Failed to update config:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update SSO configuration' }
    });
  }
});

/**
 * DELETE /api/v1/sso/entra/config/:organizationId
 * Disable SSO for an organization
 */
router.delete('/config/:organizationId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Verify user has admin access
    const userOrgId = (req as any).user?.organizationId;
    const userRole = (req as any).user?.role;

    if (userOrgId !== organizationId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }

    await query(
      `UPDATE organization_sso SET is_enabled = false, updated_at = NOW() WHERE organization_id = $1`,
      [organizationId]
    );

    res.json({
      success: true,
      message: 'SSO disabled successfully'
    });
  } catch (error: any) {
    console.error('[Entra SSO API] Failed to disable SSO:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to disable SSO' }
    });
  }
});

export default router;
