import React, { useState, useEffect } from 'react';
import { Save, Check, X, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { adminApi } from '../lib/api';

interface SsoProvider {
  id: string;
  provider_type: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  client_id: string | null;
  client_secret_encrypted: string | null;
  redirect_uri: string | null;
  tenant_id: string;
  scopes: string;
  icon_url: string | null;
  display_order: number;
}

const PROVIDER_INFO: Record<string, {
  name: string;
  docs: string;
  fields: { key: string; label: string; placeholder: string; required?: boolean }[];
  defaultScopes: string;
}> = {
  entra_id: {
    name: 'Microsoft Entra ID',
    docs: 'https://learn.microsoft.com/en-us/entra/identity-platform/',
    fields: [
      { key: 'client_id', label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Enter client secret value', required: true },
      { key: 'tenant_id', label: 'Tenant ID', placeholder: 'common (for multi-tenant) or specific tenant ID' },
    ],
    defaultScopes: 'openid profile email User.Read',
  },
  google_workspace: {
    name: 'Google Workspace',
    docs: 'https://developers.google.com/identity/protocols/oauth2',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxxxxxx.apps.googleusercontent.com', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Enter client secret', required: true },
    ],
    defaultScopes: 'openid profile email',
  },
  okta: {
    name: 'Okta',
    docs: 'https://developer.okta.com/docs/guides/',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '0oaxxxxxxxx', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Enter client secret', required: true },
      { key: 'issuer_url', label: 'Issuer URL', placeholder: 'https://your-domain.okta.com', required: true },
    ],
    defaultScopes: 'openid profile email',
  },
};

export default function SsoFederationPage() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SsoProvider | null>(null);
  const [editedProvider, setEditedProvider] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    const result = await adminApi.getSsoProviders();
    if (result.success && result.data) {
      setProviders(result.data);
      // Auto-select first provider
      if (result.data.length > 0 && !selectedProvider) {
        selectProvider(result.data[0]);
      }
    }
    setLoading(false);
  }

  function selectProvider(provider: SsoProvider) {
    setSelectedProvider(provider);
    setEditedProvider({
      client_id: provider.client_id || '',
      client_secret: '',
      tenant_id: provider.tenant_id || 'common',
      issuer_url: provider.issuer_url || '',
      scopes: provider.scopes || PROVIDER_INFO[provider.provider_type]?.defaultScopes || '',
      redirect_uri: provider.redirect_uri || '',
      is_enabled: provider.is_enabled,
    });
    setSaved(false);
    setError('');
  }

  async function handleSave() {
    if (!selectedProvider) return;

    const info = PROVIDER_INFO[selectedProvider.provider_type];
    if (info) {
      for (const field of info.fields) {
        if (field.required && !editedProvider[field.key] && field.key !== 'client_secret') {
          // Allow empty secret if already configured
          if (field.key === 'client_secret' && selectedProvider.client_secret_encrypted) {
            continue;
          }
          setError(`${field.label} is required`);
          return;
        }
      }
    }

    setSaving(true);
    setError('');

    const updates: Record<string, any> = {
      is_enabled: editedProvider.is_enabled,
      scopes: editedProvider.scopes,
    };

    // Only include non-empty fields
    if (editedProvider.client_id) updates.client_id = editedProvider.client_id;
    if (editedProvider.client_secret) updates.client_secret = editedProvider.client_secret;
    if (editedProvider.tenant_id) updates.tenant_id = editedProvider.tenant_id;
    if (editedProvider.issuer_url) updates.issuer_url = editedProvider.issuer_url;
    if (editedProvider.redirect_uri) updates.redirect_uri = editedProvider.redirect_uri;

    const result = await adminApi.updateSsoProvider(selectedProvider.id, updates);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadProviders();
    } else {
      setError(result.error || 'Failed to save configuration');
    }

    setSaving(false);
  }

  async function handleToggle(provider: SsoProvider) {
    const result = await adminApi.updateSsoProvider(provider.id, {
      is_enabled: !provider.is_enabled,
    });

    if (result.success) {
      loadProviders();
      if (selectedProvider?.id === provider.id) {
        setEditedProvider({ ...editedProvider, is_enabled: !provider.is_enabled });
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const providerInfo = selectedProvider ? PROVIDER_INFO[selectedProvider.provider_type] : null;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">SSO Federation</h1>
        <p className="text-gray-500 mt-1">
          Configure identity providers for tenant authentication
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Identity Providers</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => selectProvider(provider)}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                  selectedProvider?.id === provider.id
                    ? 'bg-blue-600/10 border-l-2 border-blue-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                {provider.icon_url ? (
                  <img src={provider.icon_url} alt="" className="w-8 h-8 rounded" />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-xs">
                    SSO
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {provider.display_name || provider.name}
                  </div>
                  <div className="text-xs text-gray-500">{provider.provider_type}</div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    provider.is_enabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Provider Configuration */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {selectedProvider ? (
            <>
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedProvider.icon_url ? (
                    <img src={selectedProvider.icon_url} alt="" className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                      SSO
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {selectedProvider.display_name || selectedProvider.name}
                    </h2>
                    {providerInfo && (
                      <a
                        href={providerInfo.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Documentation <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {saved && (
                    <span className="text-green-400 flex items-center gap-1 text-sm">
                      <Check size={16} /> Saved
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                  <div>
                    <div className="font-medium text-white">Enable Provider</div>
                    <div className="text-sm text-gray-500">
                      Allow tenants to sign in using this identity provider
                    </div>
                  </div>
                  <button
                    onClick={() => setEditedProvider({ ...editedProvider, is_enabled: !editedProvider.is_enabled })}
                    className={`w-14 h-7 rounded-full transition-colors ${
                      editedProvider.is_enabled ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        editedProvider.is_enabled ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Configuration Fields */}
                {providerInfo && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Configuration
                    </h3>
                    {providerInfo.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-400 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={
                              field.key.includes('secret') && !showSecrets[field.key]
                                ? 'password'
                                : 'text'
                            }
                            value={editedProvider[field.key] || ''}
                            onChange={(e) =>
                              setEditedProvider({ ...editedProvider, [field.key]: e.target.value })
                            }
                            placeholder={
                              field.key === 'client_secret' && selectedProvider.client_secret_encrypted
                                ? '••••••••••••••••'
                                : field.placeholder
                            }
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none pr-10"
                          />
                          {field.key.includes('secret') && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                              {showSecrets[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                        {field.key === 'client_secret' && selectedProvider.client_secret_encrypted && (
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to keep existing secret
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Advanced Settings
                  </h3>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Scopes</label>
                    <input
                      type="text"
                      value={editedProvider.scopes || ''}
                      onChange={(e) =>
                        setEditedProvider({ ...editedProvider, scopes: e.target.value })
                      }
                      placeholder="openid profile email"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Space-separated list of OAuth scopes to request
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Redirect URI</label>
                    <input
                      type="text"
                      value={editedProvider.redirect_uri || `${window.location.origin.replace(':8084', ':8080')}/auth/callback`}
                      onChange={(e) =>
                        setEditedProvider({ ...editedProvider, redirect_uri: e.target.value })
                      }
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add this URL to your identity provider's allowed redirect URIs
                    </p>
                  </div>
                </div>

                {/* Status Info */}
                <div className="mt-6 p-4 bg-gray-800/30 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Client ID:</span>{' '}
                      <span className={selectedProvider.client_id ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedProvider.client_id ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Client Secret:</span>{' '}
                      <span className={selectedProvider.client_secret_encrypted ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedProvider.client_secret_encrypted ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              Select a provider to configure
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
