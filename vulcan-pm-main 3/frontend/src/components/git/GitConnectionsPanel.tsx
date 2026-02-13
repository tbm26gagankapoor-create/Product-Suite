import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Key, ExternalLink } from 'lucide-react';
import { gitService, GitProvider, GitConnection } from '../../services/git.service';

interface GitConnectionsPanelProps {
  onConnectionChange?: () => void;
}

const GitConnectionsPanel: React.FC<GitConnectionsPanelProps> = ({ onConnectionChange }) => {
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [connections, setConnections] = useState<GitConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);
  const [showPATModal, setShowPATModal] = useState<GitProvider | null>(null);
  const [patToken, setPatToken] = useState('');
  const [patError, setPATError] = useState<string | null>(null);
  const [patLoading, setPATLoading] = useState(false);

  // Load providers and connections
  useEffect(() => {
    loadData();
  }, []);

  // Check for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gitConnected = params.get('git_connected');
    const gitError = params.get('git_error');

    if (gitConnected === 'true') {
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
      loadData();
      onConnectionChange?.();
    } else if (gitError) {
      setError(decodeURIComponent(gitError));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [providersData, connectionsData] = await Promise.all([
        gitService.getProviders(),
        gitService.getMyConnections(),
      ]);
      setProviders(providersData);
      setConnections(connectionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load Git providers');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: GitProvider) => {
    // If OAuth is configured, use OAuth flow
    if (provider.is_oauth_configured) {
      try {
        setConnectingProvider(provider.id);
        const { authUrl } = await gitService.initiateOAuth(provider.id);
        // Redirect to OAuth provider
        window.location.href = authUrl;
      } catch (err: any) {
        setError(err.message || 'Failed to initiate OAuth');
        setConnectingProvider(null);
      }
    } else {
      // Show PAT modal
      setShowPATModal(provider);
      setPatToken('');
      setPATError(null);
    }
  };

  const handleConnectWithPAT = async () => {
    if (!showPATModal || !patToken.trim()) return;

    try {
      setPATLoading(true);
      setPATError(null);
      await gitService.connectWithPAT(showPATModal.id, patToken.trim());
      setShowPATModal(null);
      setPatToken('');
      loadData();
      onConnectionChange?.();
    } catch (err: any) {
      setPATError(err.message || 'Invalid token');
    } finally {
      setPATLoading(false);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      setDisconnectingProvider(providerId);
      await gitService.disconnect(providerId);
      setConnections(prev => prev.filter(c => c.provider_id !== providerId));
      onConnectionChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const getProviderIcon = (providerType: string, iconUrl: string | null) => {
    // Use provider icon or fallback to generic Git icon
    if (iconUrl) {
      return <img src={iconUrl} alt="" className="w-6 h-6" />;
    }

    // Provider-specific fallback colors
    const colors: Record<string, string> = {
      github: 'text-gray-900 dark:text-white',
      gitlab: 'text-orange-500',
      bitbucket: 'text-blue-600',
    };

    return <GitBranch className={`w-6 h-6 ${colors[providerType] || 'text-gray-600'}`} />;
  };

  const getConnection = (providerId: string) => {
    return connections.find(c => c.provider_id === providerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Git Connections
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect your Git accounts to push documentation to repositories
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-3">
        {providers.map(provider => {
          const connection = getConnection(provider.id);
          const isConnecting = connectingProvider === provider.id;
          const isDisconnecting = disconnectingProvider === provider.id;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-[#1A1B1E] border border-gray-200 dark:border-gray-700 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {getProviderIcon(provider.provider_type, provider.icon_url)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {provider.display_name}
                    </h4>
                    {connection && (
                      <span className={`flex items-center gap-1 text-xs ${
                        connection.is_valid
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {connection.is_valid ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {connection.is_valid ? 'Connected' : 'Invalid'}
                      </span>
                    )}
                  </div>
                  {connection ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {connection.provider_avatar_url && (
                        <img
                          src={connection.provider_avatar_url}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span>@{connection.provider_username}</span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="capitalize">{connection.auth_type}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {provider.is_oauth_configured ? 'Sign in with OAuth' : 'Connect with Personal Access Token'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connection ? (
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={isDisconnecting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDisconnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider)}
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : provider.is_oauth_configured ? (
                      <ExternalLink className="w-4 h-4" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {providers.length === 0 && (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No Git providers available</p>
            <p className="text-sm">Contact your administrator to enable Git integration</p>
          </div>
        )}
      </div>

      {/* PAT Modal */}
      {showPATModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#1A1B1E] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              {getProviderIcon(showPATModal.provider_type, showPATModal.icon_url)}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect to {showPATModal.display_name}
              </h3>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter your Personal Access Token to connect. You can generate one from your {showPATModal.display_name} settings.
            </p>

            {patError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{patError}</p>
              </div>
            )}

            <input
              type="password"
              value={patToken}
              onChange={(e) => setPatToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPATModal(null);
                  setPatToken('');
                  setPATError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectWithPAT}
                disabled={!patToken.trim() || patLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {patLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitConnectionsPanel;
