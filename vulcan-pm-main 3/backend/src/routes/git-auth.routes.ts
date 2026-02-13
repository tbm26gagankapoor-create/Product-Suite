import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { gitProvidersRepository } from '../db/postgres/repositories/git-providers.repository.js';
import { userGitTokensRepository } from '../db/postgres/repositories/user-git-tokens.repository.js';
import { gitOAuthService } from '../services/git-oauth.service.js';
import { getGitClient, isSupportedProvider } from '../services/git-clients/index.js';
import { gitOperationsService } from '../services/git-operations.service.js';

const router = Router();

// Store OAuth state -> userId mapping (in production, use Redis)
const oauthStateStore = new Map<string, { userId: string; providerId: string; redirectUri: string }>();

/**
 * GET /api/v1/git/providers
 * List all enabled Git providers
 */
router.get('/providers', async (req, res: Response) => {
  try {
    const providers = await gitProvidersRepository.findEnabled();

    // Don't expose sensitive data
    const safeProviders = providers.map(p => ({
      id: p.id,
      name: p.name,
      display_name: p.display_name,
      provider_type: p.provider_type,
      is_oauth_configured: p.is_oauth_configured,
      icon_url: p.icon_url,
    }));

    res.json({
      success: true,
      data: safeProviders,
    });
  } catch (error: any) {
    console.error('[Git Auth] Error listing providers:', error);
    res.status(500).json({ success: false, error: 'Failed to list providers' });
  }
});

/**
 * GET /api/v1/git/connections
 * Get current user's connected Git providers
 */
router.get('/connections', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const connections = await userGitTokensRepository.findByUser(userId);

    const safeConnections = connections.map(c => ({
      id: c.id,
      provider_id: c.provider_id,
      provider_name: c.provider_name,
      provider_display_name: c.provider_display_name,
      provider_type: c.provider_type,
      provider_icon_url: c.provider_icon_url,
      auth_type: c.auth_type,
      provider_username: c.provider_username,
      provider_email: c.provider_email,
      provider_avatar_url: c.provider_avatar_url,
      is_valid: c.is_valid,
      last_used_at: c.last_used_at,
      created_at: c.created_at,
    }));

    res.json({
      success: true,
      data: safeConnections,
    });
  } catch (error: any) {
    console.error('[Git Auth] Error listing connections:', error);
    res.status(500).json({ success: false, error: 'Failed to list connections' });
  }
});

/**
 * GET /api/v1/git/auth/:providerId
 * Initiate OAuth flow for a Git provider
 * Returns authorization URL for frontend to redirect to
 */
router.get('/auth/:providerId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const userId = req.user!.id;

    const provider = await gitProvidersRepository.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    if (!provider.is_enabled) {
      return res.status(400).json({ success: false, error: 'Provider is not enabled' });
    }

    if (!provider.is_oauth_configured) {
      return res.status(400).json({
        success: false,
        error: 'OAuth is not configured for this provider. Please use Personal Access Token instead.',
        code: 'OAUTH_NOT_CONFIGURED',
      });
    }

    // Generate state for CSRF protection
    const state = gitOAuthService.generateState();

    // Determine redirect URI
    const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/git/auth/${providerId}/callback`;

    // Store state -> userId mapping
    oauthStateStore.set(state, { userId, providerId, redirectUri });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of oauthStateStore.entries()) {
      // Simple cleanup - in production use Redis with TTL
      if (oauthStateStore.size > 1000) {
        oauthStateStore.delete(key);
      }
    }

    const authUrl = await gitOAuthService.getAuthorizationUrl(providerId, state, redirectUri);

    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error('[Git Auth] Error initiating OAuth:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to initiate OAuth' });
  }
});

/**
 * GET /api/v1/git/auth/:providerId/callback
 * OAuth callback handler
 */
router.get('/auth/:providerId/callback', async (req, res: Response) => {
  try {
    const { providerId } = req.params;
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('[Git Auth] OAuth error:', error, error_description);
      return res.redirect(`/?git_error=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code || !state) {
      return res.redirect('/?git_error=Missing+code+or+state');
    }

    // Verify state
    const stateData = oauthStateStore.get(String(state));
    if (!stateData) {
      return res.redirect('/?git_error=Invalid+or+expired+state');
    }

    if (stateData.providerId !== providerId) {
      return res.redirect('/?git_error=Provider+mismatch');
    }

    // Clean up state
    oauthStateStore.delete(String(state));

    // Exchange code for tokens
    const tokens = await gitOAuthService.exchangeCodeForTokens(
      providerId,
      String(code),
      stateData.redirectUri
    );

    // Get user info from provider
    const userInfo = await gitOAuthService.getUserInfo(providerId, tokens.access_token);

    // Store tokens
    await gitOAuthService.storeUserToken(
      stateData.userId,
      providerId,
      'oauth',
      tokens,
      userInfo
    );

    // Redirect back to app with success
    res.redirect('/?git_connected=true');
  } catch (error: any) {
    console.error('[Git Auth] OAuth callback error:', error);
    res.redirect(`/?git_error=${encodeURIComponent(error.message || 'OAuth failed')}`);
  }
});

/**
 * POST /api/v1/git/auth/:providerId/pat
 * Connect using Personal Access Token
 */
router.post('/auth/:providerId/pat', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const { token } = req.body;
    const userId = req.user!.id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const provider = await gitProvidersRepository.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    if (!provider.is_enabled) {
      return res.status(400).json({ success: false, error: 'Provider is not enabled' });
    }

    if (!isSupportedProvider(provider.provider_type)) {
      return res.status(400).json({ success: false, error: 'Unsupported provider type' });
    }

    // Validate PAT by getting user info
    const client = getGitClient(provider.provider_type);
    let userInfo;

    try {
      userInfo = await client.getUserInfo(token);
    } catch (error: any) {
      if (error.status === 401) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      throw error;
    }

    // Store token
    await gitOAuthService.storeUserToken(
      userId,
      providerId,
      'pat',
      { access_token: token, token_type: 'bearer' },
      userInfo
    );

    res.json({
      success: true,
      data: {
        provider_username: userInfo.username,
        provider_email: userInfo.email,
        provider_avatar_url: userInfo.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('[Git Auth] PAT connection error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to connect' });
  }
});

/**
 * DELETE /api/v1/git/connections/:providerId
 * Disconnect a Git provider
 */
router.delete('/connections/:providerId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const userId = req.user!.id;

    const deleted = await userGitTokensRepository.deleteByUserAndProvider(userId, providerId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Git Auth] Error disconnecting:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect' });
  }
});

/**
 * POST /api/v1/git/connections/:providerId/validate
 * Validate a connection is still working
 */
router.post('/connections/:providerId/validate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const userId = req.user!.id;

    const token = await userGitTokensRepository.findByUserAndProvider(userId, providerId);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const provider = await gitProvidersRepository.findById(providerId);
    if (!provider || !isSupportedProvider(provider.provider_type)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    const client = getGitClient(provider.provider_type);

    try {
      const isValid = await client.validateToken(token.access_token_encrypted);

      if (!isValid) {
        await userGitTokensRepository.markAsInvalid(token.id);
        return res.json({ success: true, data: { valid: false } });
      }

      // Update last validated timestamp
      await userGitTokensRepository.update(token.id, {
        last_validated_at: new Date(),
      });

      res.json({ success: true, data: { valid: true } });
    } catch (error: any) {
      if (error.status === 401) {
        await userGitTokensRepository.markAsInvalid(token.id);
        return res.json({ success: true, data: { valid: false } });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[Git Auth] Error validating connection:', error);
    res.status(500).json({ success: false, error: 'Failed to validate connection' });
  }
});

/**
 * GET /api/v1/git/connections/:providerId/capabilities
 * Check what operations the user's token supports
 */
router.get('/connections/:providerId/capabilities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const userId = req.user!.id;

    const token = await userGitTokensRepository.findByUserAndProvider(userId, providerId);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const provider = await gitProvidersRepository.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Detect token type from prefix
    const tokenPrefix = token.access_token_encrypted?.substring(0, 4);
    let tokenType = 'unknown';
    if (tokenPrefix === 'ghu_') tokenType = 'github_app_user';
    else if (tokenPrefix === 'ghs_') tokenType = 'github_app_server';
    else if (tokenPrefix === 'ghp_') tokenType = 'github_pat_classic';
    else if (tokenPrefix === 'gho_') tokenType = 'github_oauth';
    else if (token.auth_type === 'pat') tokenType = 'pat';
    else if (token.auth_type === 'oauth') tokenType = 'oauth';

    // Default capabilities
    const capabilities = {
      list_repos: true,
      create_repo: true,
      push_files: true,
    };

    let hint: string | undefined;

    // For GitHub App user tokens (ghu_), repo creation is typically not available
    if (tokenPrefix === 'ghu_' || tokenPrefix === 'ghs_') {
      capabilities.create_repo = false;
      hint = 'Your GitHub App connection does not support creating repositories. Select an existing repository instead, or reconnect using a Personal Access Token with the "repo" scope.';
    }

    // For OAuth/PAT, try to check scopes via the GitHub API
    if (provider.provider_type === 'github' && (tokenType === 'github_pat_classic' || tokenType === 'github_oauth' || tokenType === 'oauth')) {
      try {
        const resp = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${token.access_token_encrypted}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Infinia-Product-Suite',
          },
        });

        const scopes = resp.headers.get('x-oauth-scopes') || '';
        const scopeList = scopes.split(',').map(s => s.trim()).filter(Boolean);

        // Check if token has repo creation capability
        const hasRepoScope = scopeList.includes('repo') || scopeList.includes('public_repo');
        if (!hasRepoScope && scopeList.length > 0) {
          // If scopes are reported but repo isn't among them
          capabilities.create_repo = false;
          hint = 'Your token does not have the "repo" scope needed to create repositories. Reconnect with a token that includes the "repo" scope.';
        }
      } catch {
        // If we can't check, leave defaults
      }
    }

    res.json({
      success: true,
      data: {
        capabilities,
        token_type: tokenType,
        hint,
      },
    });
  } catch (error: any) {
    console.error('[Git Auth] Error checking capabilities:', error);
    res.status(500).json({ success: false, error: 'Failed to check capabilities' });
  }
});

/**
 * POST /api/v1/git/repos
 * Create a new repository for the authenticated user.
 */
router.post('/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { provider_id, name, description, is_private } = req.body;

    if (!provider_id || !name) {
      return res.status(400).json({ success: false, error: 'provider_id and name are required' });
    }

    const connection = await userGitTokensRepository.findByUserAndProvider(user.id, String(provider_id));
    if (!connection || !connection.is_valid) {
      return res.status(400).json({
        success: false,
        error: 'Not connected to this Git provider',
        code: 'NOT_CONNECTED',
      });
    }

    const repository = await gitOperationsService.createRepository(user.id, String(provider_id), {
      name: String(name),
      description: description ? String(description) : undefined,
      private: is_private !== false,
      auto_init: true,
    });

    res.json({ success: true, data: repository });
  } catch (error: any) {
    console.error('[Git Auth] Error creating repository:', error);

    // Handle 403 - token/app lacks repo creation permission
    if (error.status === 403 || error.message?.includes('403')) {
      // Detect token type from the stored token prefix
      let hint = 'Please check your Git provider permissions.';
      try {
        const tokenRecord = await userGitTokensRepository.findByUserAndProvider(req.user!.id, String(req.body.provider_id));
        const tokenPrefix = tokenRecord?.access_token_encrypted?.substring(0, 4);
        if (tokenPrefix === 'ghu_' || tokenPrefix === 'ghs_') {
          hint = 'Your GitHub App does not have permission to create repositories. Go to your GitHub App settings → Permissions → Repository permissions → set "Administration" to Read & Write.';
        } else if (tokenRecord?.auth_type === 'pat') {
          hint = 'Your token does not have permission to create repositories. For classic PATs, enable the "repo" scope. For fine-grained PATs, enable "Administration" (Read & Write).';
        } else {
          hint = 'Your GitHub OAuth/App does not have permission to create repositories. Check that your app has the "Administration" repository permission set to Read & Write.';
        }
      } catch {}

      return res.status(403).json({
        success: false,
        error: hint,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Handle 422 - repo already exists
    if (error.status === 422 || error.message?.includes('422')) {
      return res.status(422).json({
        success: false,
        error: 'A repository with this name already exists.',
        code: 'REPO_EXISTS',
      });
    }

    res.status(500).json({ success: false, error: error.message || 'Failed to create repository' });
  }
});

/**
 * GET /api/v1/git/repos
 * List repositories for the authenticated user (no project context needed).
 * Used during product creation wizard before a project exists.
 */
router.get('/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { provider_id } = req.query;

    if (!provider_id) {
      return res.status(400).json({ success: false, error: 'provider_id is required' });
    }

    const connection = await userGitTokensRepository.findByUserAndProvider(user.id, String(provider_id));
    if (!connection || !connection.is_valid) {
      return res.status(400).json({
        success: false,
        error: 'Not connected to this Git provider',
        code: 'NOT_CONNECTED',
      });
    }

    const repositories = await gitOperationsService.listRepositories(user.id, String(provider_id));

    const writableRepos = repositories.filter(r =>
      r.permissions?.push || r.permissions?.admin
    );

    res.json({ success: true, data: writableRepos });
  } catch (error: any) {
    console.error('[Git Auth] Error listing repositories:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list repositories' });
  }
});

export default router;
