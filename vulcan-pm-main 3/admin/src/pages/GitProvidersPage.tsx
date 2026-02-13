import React, { useEffect, useState } from 'react';
import { GitBranch, Check, X, ChevronRight, Save, Eye, EyeOff, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { adminApi } from '../lib/api';

interface GitProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  oauth_client_id: string | null;
  oauth_client_secret_encrypted: string | null;
  oauth_scopes: string | null;
  api_base_url: string | null;
  auth_url: string | null;
  token_url: string | null;
  is_enabled: boolean;
  is_oauth_configured: boolean;
  icon_url: string | null;
  oauth_callback_url: string | null;
}

const PROVIDER_DOCS: Record<string, { docsUrl: string; setupSteps: string[] }> = {
  github: {
    docsUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app',
    setupSteps: [
      'Go to GitHub Settings > Developer settings > OAuth Apps',
      'Click "New OAuth App"',
      'Set Authorization callback URL to: {callback_url}',
      'Copy the Client ID and Client Secret',
    ],
  },
  gitlab: {
    docsUrl: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
    setupSteps: [
      'Go to GitLab Settings > Applications',
      'Click "New application"',
      'Set Redirect URI to: {callback_url}',
      'Select scopes: api, read_user, read_repository, write_repository',
      'Copy the Application ID and Secret',
    ],
  },
  bitbucket: {
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/',
    setupSteps: [
      'Go to Bitbucket Settings > OAuth consumers',
      'Click "Add consumer"',
      'Set Callback URL to: {callback_url}',
      'Select permissions: Repository (Write), Account (Read)',
      'Copy the Key and Secret',
    ],
  },
};

export default function GitProvidersPage() {
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<GitProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scopes, setScopes] = useState('');

  // Callback URL comes from backend (uses config.frontendUrl)

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    const result = await adminApi.getGitProviders();
    if (result.success && result.data) {
      setProviders(result.data);
    }
    setIsLoading(false);
  }

  const loadProviderDetails = async (provider: GitProvider) => {
    setSelectedProvider(provider);
    setClientId(provider.oauth_client_id || '');
    setClientSecret('');
    setScopes(provider.oauth_scopes || '');
    setShowSecret(false);
  };

  const handleSaveProvider = async () => {
    if (!selectedProvider) return;
    setIsSaving(true);

    const data: any = {};

    if (clientId !== (selectedProvider.oauth_client_id || '')) {
      data.oauth_client_id = clientId;
    }

    if (clientSecret) {
      data.oauth_client_secret = clientSecret;
    }

    if (scopes !== (selectedProvider.oauth_scopes || '')) {
      data.oauth_scopes = scopes;
    }

    const result = await adminApi.updateGitProvider(selectedProvider.id, data);

    if (result.success && result.data) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
      setClientSecret('');
    }

    setIsSaving(false);
  };

  const handleToggleEnabled = async () => {
    if (!selectedProvider) return;

    const result = selectedProvider.is_enabled
      ? await adminApi.disableGitProvider(selectedProvider.id)
      : await adminApi.enableGitProvider(selectedProvider.id);

    if (result.success && result.data) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
    }
  };

  const handleClearOAuth = async () => {
    if (!selectedProvider) return;

    if (!confirm('Clear OAuth credentials? Users will need to reconnect with Personal Access Tokens.')) {
      return;
    }

    const result = await adminApi.clearGitProviderOAuth(selectedProvider.id);

    if (result.success && result.data) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
      setClientId('');
      setClientSecret('');
    }
  };

  const getProviderIcon = (type: string) => {
    const icons: Record<string, string> = {
      github: '/github-mark-white.svg',
      gitlab: '/gitlab-logo.svg',
      bitbucket: '/bitbucket-logo.svg',
    };
    return icons[type];
  };

  const getProviderColor = (type: string) => {
    const colors: Record<string, string> = {
      github: 'text-white',
      gitlab: 'text-orange-500',
      bitbucket: 'text-blue-500',
    };
    return colors[type] || 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const docs = selectedProvider ? PROVIDER_DOCS[selectedProvider.provider_type] : null;
  const providerCallbackUrl = selectedProvider?.oauth_callback_url || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Git Providers</h1>
        <p className="text-gray-500 mt-1">Configure OAuth apps for Git repository integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Providers</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => loadProviderDetails(provider)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                  selectedProvider?.id === provider.id ? 'bg-gray-800/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg">
                    <GitBranch className={`w-5 h-5 ${getProviderColor(provider.provider_type)}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">{provider.display_name}</div>
                    <div className="text-sm text-gray-500">
                      {provider.is_oauth_configured ? 'OAuth configured' : 'PAT only'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.is_enabled ? (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  ) : (
                    <span className="w-2 h-2 bg-gray-600 rounded-full" />
                  )}
                  <ChevronRight size={18} className="text-gray-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Provider Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProvider ? (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-xl">
                      <GitBranch className={`w-6 h-6 ${getProviderColor(selectedProvider.provider_type)}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedProvider.display_name}</h2>
                      <p className="text-gray-500 text-sm">{selectedProvider.api_base_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProvider.is_oauth_configured && (
                      <button
                        onClick={handleClearOAuth}
                        className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                        title="Clear OAuth credentials"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={handleSaveProvider}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl">
                    <div>
                      <div className="font-medium text-white">Enable Provider</div>
                      <div className="text-sm text-gray-500">Allow users to connect their {selectedProvider.display_name} accounts</div>
                    </div>
                    <button
                      onClick={handleToggleEnabled}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        selectedProvider.is_enabled ? 'bg-green-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          selectedProvider.is_enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* OAuth Status Badge */}
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    selectedProvider.is_oauth_configured
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                    {selectedProvider.is_oauth_configured ? (
                      <>
                        <Check size={20} className="text-green-400" />
                        <span className="text-green-400">OAuth is configured - users can sign in with {selectedProvider.display_name}</span>
                      </>
                    ) : (
                      <>
                        <X size={20} className="text-yellow-400" />
                        <span className="text-yellow-400">OAuth not configured - users can only connect via Personal Access Token</span>
                      </>
                    )}
                  </div>

                  {/* OAuth Credentials */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      OAuth Client ID
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Enter Client ID"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      OAuth Client Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={selectedProvider.oauth_client_secret_encrypted ? '••••••••••••••••' : 'Enter Client Secret'}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {selectedProvider.oauth_client_secret_encrypted && (
                      <p className="text-xs text-gray-500 mt-2">
                        Client secret is configured. Enter a new secret to replace it.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      OAuth Scopes
                    </label>
                    <input
                      type="text"
                      value={scopes}
                      onChange={(e) => setScopes(e.target.value)}
                      placeholder="repo read:user"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Space-separated list of OAuth scopes to request
                    </p>
                  </div>
                </div>
              </div>

              {/* Setup Instructions */}
              {docs && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold text-white">Setup Instructions</h2>
                    <a
                      href={docs.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      View Docs <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="p-6">
                    <ol className="space-y-3">
                      {docs.setupSteps.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {step.replace('{callback_url}', providerCallbackUrl)}
                          </span>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-6 p-4 bg-gray-950 rounded-xl">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Callback URL
                      </div>
                      <code className="text-sm text-blue-400 break-all">{providerCallbackUrl}</code>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <GitBranch size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500">Select a provider to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
