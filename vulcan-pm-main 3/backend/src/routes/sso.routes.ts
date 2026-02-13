import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { entraSsoService, type EntraUserInfo } from '../services/entra-sso.service.js';
import { googleSsoService, type GoogleUserInfo } from '../services/google-sso.service.js';
import { ssoRepository } from '../db/postgres/repositories/sso.repository.js';
import { tenantsRepository } from '../db/postgres/repositories/tenants.repository.js';
import { openfgaService } from '../services/openfga.service.js';
import { domainWhitelistRepository } from '../db/postgres/repositories/domain-whitelist.repository.js';
import { adminRepository } from '../db/postgres/repositories/admin.repository.js';
import { initializeTenantDb } from '../db/mongo/tenant-router.js';

const router = Router();

// State storage (in production, use Redis or database)
const stateStore = new Map<string, { nonce: string; redirectUrl?: string; createdAt: number }>();

// Clean up expired states (older than 10 minutes)
function cleanupStates() {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      stateStore.delete(key);
    }
  }
}
setInterval(cleanupStates, 60 * 1000);

// =====================================================
// SSO PROVIDER INFO
// =====================================================

/**
 * GET /api/v1/sso/providers
 * Get enabled SSO providers (for login page)
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await ssoRepository.findEnabledProviders();

    res.json({
      success: true,
      data: providers.map(p => ({
        type: p.provider_type,
        name: p.name,
        displayName: p.display_name,
      })),
    });
  } catch (error) {
    console.error('[SSO] Get providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SSO providers' });
  }
});

// =====================================================
// ENTRA ID AUTHENTICATION FLOW
// =====================================================

/**
 * GET /api/v1/sso/entra/login
 * Initiate Entra ID login flow
 */
router.get('/entra/login', async (req: Request, res: Response) => {
  try {
    // Check if Entra ID is configured (reads from database)
    const isConfigured = await entraSsoService.isConfigured();
    if (!isConfigured) {
      return res.status(500).json({
        success: false,
        error: 'Entra ID is not configured. Please configure it in the admin panel.',
      });
    }

    // Generate state and nonce for security
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const redirectUrl = req.query.redirect as string | undefined;

    stateStore.set(state, { nonce, redirectUrl, createdAt: Date.now() });

    const authUrl = await entraSsoService.getAuthorizationUrl(state, nonce);

    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error('[SSO] Entra login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to initiate login' });
  }
});

/**
 * POST /api/v1/sso/entra/callback
 * Handle Entra ID OAuth callback (called by frontend after redirect)
 */
router.post('/entra/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing code or state' });
    }

    // Validate state
    const storedState = stateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ success: false, error: 'Invalid or expired state' });
    }
    stateStore.delete(state);

    // Exchange code for tokens
    const tokens = await entraSsoService.exchangeCodeForTokens(code);

    // Extract user info from ID token
    const userInfo = await entraSsoService.getUserInfoFromToken(tokens.id_token);

    // Check for existing consent/tenant by Entra tenant ID
    let consent = await ssoRepository.findConsentByEntraTenant(userInfo.tid);

    // Track if this is a new tenant (first user should be admin)
    let isFirstUserForTenant = false;

    // Auto-create tenant and consent on first login from an organization
    if (!consent) {
      const provider = await ssoRepository.findEntraProvider();
      if (!provider) {
        return res.status(500).json({ success: false, error: 'SSO provider not configured' });
      }

      // Check domain whitelist if enabled
      let preAssignedTenantId: string | null = null;
      const whitelistEnabled = await adminRepository.getSetting('signup_domain_whitelist_enabled');
      if (whitelistEnabled === 'true') {
        const emailDomain = userInfo.email.split('@')[1]?.toLowerCase();
        const { allowed, matchedEntry } = await domainWhitelistRepository.isWhitelisted(
          emailDomain,
          userInfo.tid
        );

        if (!allowed) {
          console.log(`[SSO] Domain not whitelisted: ${emailDomain} (Entra tenant: ${userInfo.tid})`);
          return res.status(403).json({
            success: false,
            error: 'Your organization is not authorized to sign up. Please contact the administrator.',
            code: 'DOMAIN_NOT_WHITELISTED',
          });
        }

        console.log(`[SSO] Domain whitelisted: ${emailDomain} matched entry: ${matchedEntry?.domain}`);

        // Use pre-assigned tenant from whitelist if configured
        if (matchedEntry?.tenant_id) {
          preAssignedTenantId = matchedEntry.tenant_id;
          console.log(`[SSO] Using pre-assigned tenant from whitelist: ${preAssignedTenantId}`);
        }
      }

      // Use pre-assigned tenant or create a new one
      let tenant;
      if (preAssignedTenantId) {
        tenant = await tenantsRepository.findById(preAssignedTenantId);
        if (!tenant) {
          console.warn(`[SSO] Pre-assigned tenant ${preAssignedTenantId} not found, creating new one`);
          tenant = await tenantsRepository.create({
            name: userInfo.email.split('@')[1] || 'Organization',
            slug: userInfo.tid,
          });
          await initializeTenantDb(tenant.id);
        }
      } else {
        // Create a new tenant using the Entra tenant ID
        tenant = await tenantsRepository.create({
          name: userInfo.email.split('@')[1] || 'Organization',
          slug: userInfo.tid,
        });
        await initializeTenantDb(tenant.id);
      }

      // Create consent record linked to the new tenant
      consent = await ssoRepository.createOrUpdateConsent({
        provider_id: provider.id,
        entra_tenant_id: userInfo.tid,
        organization_name: userInfo.email.split('@')[1],
        tenant_id: tenant.id,
        consented_by_email: userInfo.email,
        consented_by_name: userInfo.name,
        consented_by_oid: userInfo.oid,
      });

      isFirstUserForTenant = true;
      console.log(`[SSO] Created new tenant for organization: ${userInfo.email.split('@')[1]}`);
    }

    if (!consent.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Organization SSO access has been revoked',
        code: 'CONSENT_REVOKED',
      });
    }

    // Find or provision the user
    let user = await ssoRepository.findUserBySso('entra_id', userInfo.oid);

    if (!user && consent.tenant_id) {
      // Check if user exists by email in the tenant
      const existingUser = await ssoRepository.findUserByEmailAndTenant(
        userInfo.email,
        consent.tenant_id
      );

      if (existingUser) {
        // Link SSO to existing user
        await ssoRepository.linkSsoToUser(
          existingUser.id,
          'entra_id',
          userInfo.oid,
          userInfo.tid
        );
        user = { ...existingUser, sso_provider: 'entra_id', sso_subject_id: userInfo.oid, sso_tenant_id: userInfo.tid };
      } else {
        // Auto-provision new user
        user = await ssoRepository.createSsoUser({
          tenant_id: consent.tenant_id,
          email: userInfo.email,
          name: userInfo.name,
          sso_provider: 'entra_id',
          sso_subject_id: userInfo.oid,
          sso_tenant_id: userInfo.tid,
          role: consent.default_role || 'member',
        });
      }
    }

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Failed to provision user',
        code: 'USER_PROVISION_FAILED',
      });
    }

    // Update last login
    await ssoRepository.updateSsoUserLastLogin(user.id);

    // Check Azure AD directory roles to determine if user should be org admin
    let isOrgAdmin = false;
    try {
      const { isDirectoryAdmin } = await entraSsoService.getUserDirectoryRoles(tokens.access_token);
      isOrgAdmin = isDirectoryAdmin;
      console.log(`[SSO] User ${user.email} Azure AD admin status:`, isOrgAdmin);
    } catch (error) {
      console.error('[SSO] Failed to check Azure AD roles:', error);
    }

    // First user for a new tenant becomes org admin regardless of Azure AD role
    if (isFirstUserForTenant) {
      isOrgAdmin = true;
      console.log(`[SSO] User ${user.email} is first user for tenant, setting as org admin`);
    }

    // Persist org admin status to user record
    try {
      await ssoRepository.updateUserOrgAdminStatus(user.id, isOrgAdmin);
    } catch (error) {
      console.error('[SSO] Failed to update org admin status:', error);
    }

    // Set up OpenFGA permissions
    try {
      if (consent.tenant_id) {
        if (isOrgAdmin) {
          // Azure AD admin or first user becomes org admin
          await openfgaService.addOrgAdmin(user.id, consent.tenant_id);
          console.log(`[SSO] Set user ${user.email} as org admin via OpenFGA`);
        } else {
          // Regular user becomes org member
          await openfgaService.addOrgMember(user.id, consent.tenant_id);
          console.log(`[SSO] Set user ${user.email} as org member via OpenFGA`);
        }
      }
    } catch (error) {
      console.error('[SSO] Failed to set OpenFGA permissions:', error);
      // Don't fail login if OpenFGA is unavailable
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenant_id, isOrgAdmin },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenant_id,
          isOrgAdmin,
        },
        redirectUrl: storedState.redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('[SSO] Entra callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
});

// =====================================================
// GOOGLE WORKSPACE AUTHENTICATION FLOW
// =====================================================

/**
 * GET /api/v1/sso/google/login
 * Initiate Google Workspace login flow
 */
router.get('/google/login', async (req: Request, res: Response) => {
  try {
    const isConfigured = await googleSsoService.isConfigured();
    if (!isConfigured) {
      return res.status(500).json({
        success: false,
        error: 'Google Workspace SSO is not configured. Please configure it in the admin panel.',
      });
    }

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const redirectUrl = req.query.redirect as string | undefined;

    // Prefix state with 'google_' so callback can identify the provider
    stateStore.set(state, { nonce, redirectUrl, createdAt: Date.now() });

    const authUrl = await googleSsoService.getAuthorizationUrl(state, nonce);

    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error('[SSO] Google login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to initiate login' });
  }
});

/**
 * POST /api/v1/sso/google/callback
 * Handle Google OAuth callback
 */
router.post('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing code or state' });
    }

    // Validate state
    const storedState = stateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ success: false, error: 'Invalid or expired state' });
    }
    stateStore.delete(state);

    // Exchange code for tokens
    const tokens = await googleSsoService.exchangeCodeForTokens(code);

    // Extract user info from ID token
    const userInfo = await googleSsoService.getUserInfoFromToken(tokens.id_token);

    // Use Google Workspace domain (hd) as organization identifier
    // For personal Gmail accounts, use email domain
    const orgDomain = userInfo.hd || userInfo.email.split('@')[1];
    const orgIdentifier = `google_${orgDomain}`;

    // Check for existing consent/tenant
    let consent = await ssoRepository.findConsentByEntraTenant(orgIdentifier);

    let isFirstUserForTenant = false;

    if (!consent) {
      const provider = await ssoRepository.findProviderByType('google_workspace');
      if (!provider) {
        return res.status(500).json({ success: false, error: 'Google SSO provider not configured' });
      }

      // Check domain whitelist if enabled
      let preAssignedTenantId: string | null = null;
      const whitelistEnabled = await adminRepository.getSetting('signup_domain_whitelist_enabled');
      if (whitelistEnabled === 'true') {
        const emailDomain = userInfo.email.split('@')[1]?.toLowerCase();
        const { allowed, matchedEntry } = await domainWhitelistRepository.isWhitelisted(
          emailDomain,
          orgIdentifier
        );

        if (!allowed) {
          console.log(`[SSO] Domain not whitelisted: ${emailDomain} (Google org: ${orgIdentifier})`);
          return res.status(403).json({
            success: false,
            error: 'Your organization is not authorized to sign up. Please contact the administrator.',
            code: 'DOMAIN_NOT_WHITELISTED',
          });
        }

        if (matchedEntry?.tenant_id) {
          preAssignedTenantId = matchedEntry.tenant_id;
        }
      }

      // Create or use pre-assigned tenant
      let tenant;
      if (preAssignedTenantId) {
        tenant = await tenantsRepository.findById(preAssignedTenantId);
        if (!tenant) {
          tenant = await tenantsRepository.create({
            name: orgDomain,
            slug: orgIdentifier,
          });
          await initializeTenantDb(tenant.id);
        }
      } else {
        tenant = await tenantsRepository.create({
          name: orgDomain,
          slug: orgIdentifier,
        });
        await initializeTenantDb(tenant.id);
      }

      consent = await ssoRepository.createOrUpdateConsent({
        provider_id: provider.id,
        entra_tenant_id: orgIdentifier,
        organization_name: orgDomain,
        tenant_id: tenant.id,
        consented_by_email: userInfo.email,
        consented_by_name: userInfo.name,
        consented_by_oid: userInfo.sub,
      });

      isFirstUserForTenant = true;
      console.log(`[SSO] Created new tenant for Google org: ${orgDomain}`);
    }

    if (!consent.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Organization SSO access has been revoked',
        code: 'CONSENT_REVOKED',
      });
    }

    // Find or provision the user
    let user = await ssoRepository.findUserBySso('google_workspace', userInfo.sub);

    if (!user && consent.tenant_id) {
      const existingUser = await ssoRepository.findUserByEmailAndTenant(
        userInfo.email,
        consent.tenant_id
      );

      if (existingUser) {
        await ssoRepository.linkSsoToUser(
          existingUser.id,
          'google_workspace',
          userInfo.sub,
          orgIdentifier
        );
        user = { ...existingUser, sso_provider: 'google_workspace', sso_subject_id: userInfo.sub, sso_tenant_id: orgIdentifier };
      } else {
        user = await ssoRepository.createSsoUser({
          tenant_id: consent.tenant_id,
          email: userInfo.email,
          name: userInfo.name,
          sso_provider: 'google_workspace',
          sso_subject_id: userInfo.sub,
          sso_tenant_id: orgIdentifier,
          role: consent.default_role || 'member',
          avatar_url: userInfo.picture,
        });
      }
    }

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Failed to provision user',
        code: 'USER_PROVISION_FAILED',
      });
    }

    // Update last login
    await ssoRepository.updateSsoUserLastLogin(user.id);

    // First user becomes org admin
    let isOrgAdmin = isFirstUserForTenant;

    if (isOrgAdmin) {
      try {
        await ssoRepository.updateUserOrgAdminStatus(user.id, true);
      } catch (error) {
        console.error('[SSO] Failed to update org admin status:', error);
      }
    }

    // Set up OpenFGA permissions
    try {
      if (consent.tenant_id) {
        if (isOrgAdmin) {
          await openfgaService.addOrgAdmin(user.id, consent.tenant_id);
          console.log(`[SSO] Set Google user ${user.email} as org admin via OpenFGA`);
        } else {
          await openfgaService.addOrgMember(user.id, consent.tenant_id);
          console.log(`[SSO] Set Google user ${user.email} as org member via OpenFGA`);
        }
      }
    } catch (error) {
      console.error('[SSO] Failed to set OpenFGA permissions:', error);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenant_id, isOrgAdmin },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenant_id,
          isOrgAdmin,
        },
        redirectUrl: storedState.redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('[SSO] Google callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
});

// =====================================================
// ADMIN CONSENT FLOW
// =====================================================

/**
 * GET /api/v1/sso/entra/admin-consent
 * Get admin consent URL for organization onboarding
 */
router.get('/entra/admin-consent', async (req: Request, res: Response) => {
  try {
    if (!config.entra.clientId) {
      return res.status(500).json({ success: false, error: 'Entra ID is not configured' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    stateStore.set(state, { nonce: '', createdAt: Date.now() });

    const adminConsentUrl = entraSsoService.getAdminConsentUrl(state);

    res.json({
      success: true,
      data: { adminConsentUrl, state },
    });
  } catch (error) {
    console.error('[SSO] Admin consent URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate admin consent URL' });
  }
});

/**
 * POST /api/v1/sso/entra/admin-consent/callback
 * Handle admin consent callback
 */
router.post('/entra/admin-consent/callback', async (req: Request, res: Response) => {
  try {
    const { admin_consent, tenant: entraTenantId, state, error, error_description } = req.body;

    // Handle consent denied
    if (error) {
      return res.status(400).json({
        success: false,
        error: error_description || 'Admin consent was denied',
        code: error,
      });
    }

    // Validate state
    const storedState = stateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ success: false, error: 'Invalid or expired state' });
    }
    stateStore.delete(state);

    if (admin_consent !== 'True' && admin_consent !== true) {
      return res.status(400).json({ success: false, error: 'Admin consent was not granted' });
    }

    if (!entraTenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant ID' });
    }

    // Get the Entra provider
    const provider = await ssoRepository.findEntraProvider();
    if (!provider) {
      return res.status(500).json({ success: false, error: 'Entra ID provider not configured' });
    }

    // Create or update the consent record
    const consent = await ssoRepository.createOrUpdateConsent({
      provider_id: provider.id,
      entra_tenant_id: entraTenantId,
    });

    res.json({
      success: true,
      data: {
        message: 'Admin consent recorded successfully',
        entraTenantId,
        consentId: consent.id,
      },
    });
  } catch (error) {
    console.error('[SSO] Admin consent callback error:', error);
    res.status(500).json({ success: false, error: 'Failed to process admin consent' });
  }
});

/**
 * POST /api/v1/sso/entra/link-tenant
 * Link an Entra tenant consent to an application tenant
 * (Called by admin portal to map organizations)
 */
router.post('/entra/link-tenant', async (req: Request, res: Response) => {
  try {
    const { entraTenantId, tenantId, organizationName } = req.body;

    if (!entraTenantId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'entraTenantId and tenantId are required',
      });
    }

    // Verify the tenant exists
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Update the consent to link it to the tenant
    const consent = await ssoRepository.linkConsentToTenant(entraTenantId, tenantId);

    if (!consent) {
      return res.status(404).json({
        success: false,
        error: 'No consent record found for this Entra tenant',
      });
    }

    res.json({
      success: true,
      data: consent,
    });
  } catch (error) {
    console.error('[SSO] Link tenant error:', error);
    res.status(500).json({ success: false, error: 'Failed to link tenant' });
  }
});

export default router;
