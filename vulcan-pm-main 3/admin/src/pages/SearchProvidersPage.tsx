import React, { useEffect, useState } from 'react';
import { Search, Check, X, ChevronRight, Save, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { adminApi } from '../lib/api';

interface SearchProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  is_default: boolean;
  config: Record<string, any>;
}

const PROVIDER_INFO: Record<string, { description: string; docsUrl: string; color: string }> = {
  tavily: {
    description: 'AI-optimized search engine with relevance scoring. Best for research-quality results.',
    docsUrl: 'https://tavily.com',
    color: 'text-purple-400',
  },
  serper: {
    description: 'Google Search API with structured results. Fast and reliable.',
    docsUrl: 'https://serper.dev',
    color: 'text-blue-400',
  },
  brave: {
    description: 'Privacy-focused web search API. No tracking or profiling.',
    docsUrl: 'https://brave.com/search/api/',
    color: 'text-orange-400',
  },
};

export default function SearchProvidersPage() {
  const [providers, setProviders] = useState<SearchProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SearchProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Form state
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    const result = await adminApi.getSearchProviders();
    if (result.success && result.data) {
      setProviders(result.data);
    }
    setIsLoading(false);
  }

  const selectProvider = (provider: SearchProvider) => {
    setSelectedProvider(provider);
    setApiKey('');
    setShowSecret(false);
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!selectedProvider) return;
    setIsSaving(true);

    const data: any = {};
    if (apiKey) {
      data.api_key = apiKey;
    }

    const result = await adminApi.updateSearchProvider(selectedProvider.id, data);

    if (result.success && result.data) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
      setApiKey('');
    }

    setIsSaving(false);
  };

  const handleToggleEnabled = async () => {
    if (!selectedProvider) return;
    setIsSaving(true);

    const result = await adminApi.updateSearchProvider(selectedProvider.id, {
      is_enabled: !selectedProvider.is_enabled,
    });

    if (result.success && result.data) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
    }

    setIsSaving(false);
  };

  const handleSetDefault = async () => {
    if (!selectedProvider) return;
    setIsSaving(true);

    const result = await adminApi.updateSearchProvider(selectedProvider.id, {
      is_default: true,
      is_enabled: true,
    });

    if (result.success && result.data) {
      // Update all providers since default status changed
      const refreshed = await adminApi.getSearchProviders();
      if (refreshed.success && refreshed.data) {
        setProviders(refreshed.data);
        const updated = refreshed.data.find((p: SearchProvider) => p.id === selectedProvider.id);
        if (updated) setSelectedProvider(updated);
      }
    }

    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!selectedProvider) return;
    setIsTesting(true);
    setTestResult(null);

    const result = await adminApi.testSearchProvider(selectedProvider.id);

    if (result.success && result.data) {
      setTestResult(result.data);
    } else {
      setTestResult({ success: false, message: result.error || 'Test failed' });
    }

    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const info = selectedProvider ? PROVIDER_INFO[selectedProvider.provider_type] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Search Providers</h1>
        <p className="text-gray-500 mt-1">Configure web search APIs for AI-powered competitive research</p>
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
                onClick={() => selectProvider(provider)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                  selectedProvider?.id === provider.id ? 'bg-gray-800/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg">
                    <Search className={`w-5 h-5 ${PROVIDER_INFO[provider.provider_type]?.color || 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">{provider.display_name}</div>
                    <div className="text-sm text-gray-500">
                      {provider.api_key_encrypted ? 'API key configured' : 'Not configured'}
                      {provider.is_default && ' (Default)'}
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
                      <Search className={`w-6 h-6 ${info?.color || 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedProvider.display_name}</h2>
                      <p className="text-gray-500 text-sm">{selectedProvider.api_endpoint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTest}
                      disabled={isTesting || !selectedProvider.api_key_encrypted}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      Test
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !apiKey}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Description */}
                  {info && (
                    <p className="text-sm text-gray-400">{info.description}</p>
                  )}

                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl">
                    <div>
                      <div className="font-medium text-white">Enable Provider</div>
                      <div className="text-sm text-gray-500">Allow this provider to be used for web research</div>
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

                  {/* Default Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl">
                    <div>
                      <div className="font-medium text-white">Default Provider</div>
                      <div className="text-sm text-gray-500">Use this provider for all web research queries</div>
                    </div>
                    <button
                      onClick={handleSetDefault}
                      disabled={selectedProvider.is_default}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedProvider.is_default
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {selectedProvider.is_default ? 'Default' : 'Set as Default'}
                    </button>
                  </div>

                  {/* API Key Status */}
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    selectedProvider.api_key_encrypted
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                    {selectedProvider.api_key_encrypted ? (
                      <>
                        <Check size={20} className="text-green-400" />
                        <span className="text-green-400">API key is configured</span>
                      </>
                    ) : (
                      <>
                        <X size={20} className="text-yellow-400" />
                        <span className="text-yellow-400">No API key configured - provider cannot be used</span>
                      </>
                    )}
                  </div>

                  {/* API Key Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={selectedProvider.api_key_encrypted ? '••••••••••••••••' : 'Enter API Key'}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {selectedProvider.api_key_encrypted && (
                      <p className="text-xs text-gray-500 mt-2">
                        API key is configured. Enter a new key to replace it.
                      </p>
                    )}
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-4 rounded-xl ${
                      testResult.success
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <X size={16} className="text-red-400" />
                        )}
                        <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                          {testResult.message}
                        </span>
                        {testResult.latencyMs && (
                          <span className="text-gray-500 text-sm ml-auto">{testResult.latencyMs}ms</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Setup Instructions */}
              {info && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h2 className="font-semibold text-white">Getting Started</h2>
                  </div>
                  <div className="p-6">
                    <ol className="space-y-3">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                        <span className="text-gray-400 text-sm">
                          Visit <a href={info.docsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{info.docsUrl}</a> and create an account
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                        <span className="text-gray-400 text-sm">Generate an API key from the dashboard</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                        <span className="text-gray-400 text-sm">Paste the API key above and click Save</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                        <span className="text-gray-400 text-sm">Enable the provider and set it as default</span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Search size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500">Select a provider to configure</p>
              <p className="text-gray-600 text-sm mt-2">Configure a search API to enable AI-powered competitive research in the product wizard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
