/**
 * Entra ID SSO Service
 * Enterprise SSO with auto-provisioning from Azure AD/Entra ID
 * Supports multi-tenant organizations and group-based role assignment
 */

import { microsoftOAuthService } from './microsoft-oauth.service.js';
import { query } from '../db/postgres/client.js';
import { getTenantConnection } from '../lib/tenant-router.js';
import { Organization, User } from '../models/index.js';

interface EntraUserInfo {
  id: string; // Azure AD object ID
  email: string;
  displayName: string;
  givenName: string;
  surname: string;
  jobTitle?: string;
  department?: string;
  groups?: string[]; // Group IDs the user belongs to
}

interface OrganizationSSO {
  id: string;
  organization_id: string;
  sso_provider_id: string;
  tenant_id: string;
  is_enabled: boolean;
  auto_provision_users: boolean;
  default_role: string;
  group_role_mappings: any;
}

export const entraSSOService = {
  /**
   * Get Entra ID user information from Microsoft Graph API
   */
  async getUserInfo(accessToken: string): Promise<EntraUserInfo> {
    try {
      // Get user profile
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Graph API error: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();

      // Get user's groups
      let groups: string[] = [];
      try {
        const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groups = groupsData.value.map((g: any) => g.id);
        }
      } catch (error) {
        console.warn('[Entra SSO] Failed to fetch user groups:', error);
      }

      return {
        id: userData.id,
        email: userData.userPrincipalName || userData.mail,
        displayName: userData.displayName,
        givenName: userData.givenName,
        surname: userData.surname,
        jobTitle: userData.jobTitle,
        department: userData.department,
        groups
      };

    } catch (error: any) {
      console.error('[Entra SSO] Error fetching user info:', error.message);
      throw new Error(`Failed to fetch user information: ${error.message}`);
    }
  },

  /**
   * Get organization SSO configuration
   */
  async getOrganizationSSO(organizationId: string): Promise<OrganizationSSO | null> {
    try {
      const result = await query(
        `SELECT * FROM organization_sso WHERE organization_id = $1 AND is_enabled = true LIMIT 1`,
        [organizationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('[Entra SSO] Error fetching organization SSO:', error.message);
      return null;
    }
  },

  /**
   * Determine user role from Azure AD groups
   */
  determineUserRole(userGroups: string[], groupRoleMappings: any, defaultRole: string = 'member'): string {
    if (!groupRoleMappings || !userGroups || userGroups.length === 0) {
      return defaultRole;
    }

    // Check if user is in any mapped groups (admin groups take precedence)
    const adminGroupIds = groupRoleMappings.admin || [];
    if (adminGroupIds.some((id: string) => userGroups.includes(id))) {
      return 'admin';
    }

    const managerGroupIds = groupRoleMappings.manager || [];
    if (managerGroupIds.some((id: string) => userGroups.includes(id))) {
      return 'manager';
    }

    return defaultRole;
  },

  /**
   * Auto-provision user from Entra ID
   * Creates user account if it doesn't exist, or updates existing user
   */
  async autoProvisionUser(params: {
    entraUserInfo: EntraUserInfo;
    organizationId: string;
    accessToken: string;
  }): Promise<any> {
    const { entraUserInfo, organizationId, accessToken } = params;

    console.log(`[Entra SSO] Auto-provisioning user: ${entraUserInfo.email} for org ${organizationId}`);

    try {
      // Get organization SSO config
      const orgSSO = await this.getOrganizationSSO(organizationId);
      if (!orgSSO || !orgSSO.auto_provision_users) {
        throw new Error('Auto-provisioning not enabled for this organization');
      }

      // Connect to tenant database
      const db = await getTenantConnection(organizationId);

      // Check if user already exists in PostgreSQL (cross-tenant user table)
      const existingUserResult = await query(
        `SELECT * FROM users WHERE email = $1 LIMIT 1`,
        [entraUserInfo.email]
      );

      let userId: string;

      if (existingUserResult.rows.length > 0) {
        // User exists - update info from Entra ID
        userId = existingUserResult.rows[0].id;

        await query(
          `UPDATE users
           SET
             full_name = $1,
             entra_id = $2,
             updated_at = NOW()
           WHERE id = $3`,
          [entraUserInfo.displayName, entraUserInfo.id, userId]
        );

        console.log(`[Entra SSO] Updated existing user ${userId}`);

      } else {
        // Create new user in PostgreSQL
        const newUserResult = await query(
          `INSERT INTO users (email, full_name, entra_id, is_verified, created_at, updated_at)
           VALUES ($1, $2, $3, true, NOW(), NOW())
           RETURNING id`,
          [entraUserInfo.email, entraUserInfo.displayName, entraUserInfo.id]
        );

        userId = newUserResult.rows[0].id;

        console.log(`[Entra SSO] Created new PostgreSQL user ${userId}`);
      }

      // Check if user already exists in tenant MongoDB
      let mongoUser = await db.model('User').findOne({ email: entraUserInfo.email });

      if (!mongoUser) {
        // Determine role from group mappings
        const role = this.determineUserRole(
          entraUserInfo.groups || [],
          orgSSO.group_role_mappings,
          orgSSO.default_role
        );

        // Create user in MongoDB (tenant database)
        mongoUser = await db.model('User').create({
          email: entraUserInfo.email,
          name: entraUserInfo.displayName,
          role,
          organizationId: organizationId,
          provider: 'entra_id',
          providerId: entraUserInfo.id,
          isActive: true,
          avatar: '', // Could fetch from Graph API
          preferences: {},
          notificationSettings: {
            email: true,
            inApp: true
          }
        });

        console.log(`[Entra SSO] Created new MongoDB user: ${mongoUser._id}`);
      } else {
        // Update existing MongoDB user
        mongoUser.name = entraUserInfo.displayName;
        mongoUser.providerId = entraUserInfo.id;
        await mongoUser.save();

        console.log(`[Entra SSO] Updated existing MongoDB user: ${mongoUser._id}`);
      }

      return mongoUser;

    } catch (error: any) {
      console.error('[Entra SSO] Auto-provisioning failed:', error.message);
      throw new Error(`Auto-provisioning failed: ${error.message}`);
    }
  },

  /**
   * SSO login flow with auto-provisioning
   * Combines OAuth flow with automatic user creation
   */
  async ssoLogin(params: {
    code: string;
    organizationId: string;
  }): Promise<{
    user: any;
    accessToken: string;
    refreshToken?: string;
  }> {
    const { code, organizationId } = params;

    try {
      // Step 1: Exchange code for tokens
      const tokenResponse = await microsoftOAuthService.exchangeCodeForToken(code);

      // Step 2: Get user info from Microsoft Graph
      const entraUserInfo = await this.getUserInfo(tokenResponse.access_token);

      // Step 3: Auto-provision user (create or update)
      const user = await this.autoProvisionUser({
        entraUserInfo,
        organizationId,
        accessToken: tokenResponse.access_token
      });

      return {
        user,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token
      };

    } catch (error: any) {
      console.error('[Entra SSO] SSO login failed:', error.message);
      throw new Error(`SSO login failed: ${error.message}`);
    }
  },

  /**
   * Admin consent URL for organization-wide SSO
   * Allows admins to grant consent for the entire organization
   */
  async generateAdminConsentUrl(params: {
    organizationId: string;
    redirectUri?: string;
  }): Promise<string> {
    const { organizationId, redirectUri } = params;

    const provider = await microsoftOAuthService.getProvider();
    if (!provider) {
      throw new Error('Microsoft OAuth provider not configured');
    }

    const state = Buffer.from(JSON.stringify({
      type: 'admin_consent',
      organizationId
    })).toString('base64');

    const consentUrl = new URL(`https://login.microsoftonline.com/${provider.tenant_id}/v2.0/adminconsent`);
    consentUrl.searchParams.set('client_id', provider.client_id);
    consentUrl.searchParams.set('redirect_uri', redirectUri || provider.redirect_uri);
    consentUrl.searchParams.set('state', state);
    consentUrl.searchParams.set('scope', 'https://graph.microsoft.com/.default');

    return consentUrl.toString();
  },

  /**
   * Sync users from Azure AD directory
   * Batch import users from Azure AD into the organization
   */
  async syncUsersFromDirectory(params: {
    accessToken: string;
    organizationId: string;
    filter?: string;
  }): Promise<{
    imported: number;
    updated: number;
    failed: number;
  }> {
    const { accessToken, organizationId, filter } = params;

    console.log(`[Entra SSO] Starting directory sync for org ${organizationId}`);

    try {
      // Fetch users from Microsoft Graph
      const usersUrl = filter
        ? `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}`
        : 'https://graph.microsoft.com/v1.0/users?$top=999';

      const response = await fetch(usersUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.statusText}`);
      }

      const data = await response.json();
      const users = data.value || [];

      let imported = 0;
      let updated = 0;
      let failed = 0;

      // Process each user
      for (const azureUser of users) {
        try {
          const entraUserInfo: EntraUserInfo = {
            id: azureUser.id,
            email: azureUser.userPrincipalName || azureUser.mail,
            displayName: azureUser.displayName,
            givenName: azureUser.givenName,
            surname: azureUser.surname,
            jobTitle: azureUser.jobTitle,
            department: azureUser.department,
            groups: [] // Would need separate call for each user
          };

          const db = await getTenantConnection(organizationId);
          const existing = await db.model('User').findOne({ email: entraUserInfo.email });

          if (existing) {
            updated++;
          } else {
            imported++;
          }

          await this.autoProvisionUser({
            entraUserInfo,
            organizationId,
            accessToken
          });

        } catch (error) {
          console.error(`[Entra SSO] Failed to sync user ${azureUser.userPrincipalName}:`, error);
          failed++;
        }
      }

      console.log(`[Entra SSO] Directory sync complete: ${imported} imported, ${updated} updated, ${failed} failed`);

      return { imported, updated, failed };

    } catch (error: any) {
      console.error('[Entra SSO] Directory sync failed:', error.message);
      throw new Error(`Directory sync failed: ${error.message}`);
    }
  }
};
