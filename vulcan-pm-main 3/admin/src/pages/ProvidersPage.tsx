import React, { useEffect, useState } from 'react';
import { Cpu, Key, Check, X, ChevronRight, Save, Eye, EyeOff, Plus, Trash2, TestTube2, Loader2, ExternalLink, Terminal, Upload } from 'lucide-react';
import { adminApi } from '../lib/api';

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, any> | null;
  apiKey: string;
  model: string;
  providerType: string;
  displayName: string;
}

function parseCurlCommand(curlStr: string): ParsedCurl {
  // Normalize: remove line continuations (bash \ and Windows ^), carriage returns, collapse whitespace
  const normalized = curlStr
    .replace(/\r\n/g, '\n')
    .replace(/\\\s*\n/g, ' ')       // bash line continuation
    .replace(/\^\s*\n/g, ' ')       // Windows line continuation
    .replace(/\n/g, ' ')            // remaining newlines
    .replace(/\s+/g, ' ')
    .trim();

  // Extract all URLs from the command
  let url = '';
  const allUrls = normalized.match(/['"]?(https?:\/\/[^\s'"\\)]+)['"]?/g);
  if (allUrls) {
    url = allUrls[0].replace(/^['"]|['"]$/g, '');
  }

  // Extract method
  let method = 'GET';
  const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  } else if (/(?:-d|--data|--data-raw|--data-binary)\s/.test(normalized)) {
    method = 'POST';
  }

  // Extract headers — support -H and --header, single/double quotes
  const headers: Record<string, string> = {};
  const headerPatterns = [
    /(?:-H|--header)\s+'([^']+)'/g,           // -H 'Key: Value'
    /(?:-H|--header)\s+"([^"]+)"/g,            // -H "Key: Value"
    /(?:-H|--header)\s+([^\s'"]+:[^\s]+)/g,    // -H Key:Value (unquoted)
  ];
  for (const pattern of headerPatterns) {
    let m;
    while ((m = pattern.exec(normalized)) !== null) {
      const colonIdx = m[1].indexOf(':');
      if (colonIdx > 0) {
        const key = m[1].substring(0, colonIdx).trim();
        const value = m[1].substring(colonIdx + 1).trim();
        headers[key] = value;
      }
    }
  }

  // Extract API key from headers (case-insensitive lookup)
  let apiKey = '';
  const headerKeys = Object.keys(headers);
  const authKey = headerKeys.find(k => k.toLowerCase() === 'authorization');
  const xApiKey = headerKeys.find(k => k.toLowerCase() === 'x-api-key');
  if (authKey) {
    apiKey = headers[authKey].replace(/^Bearer\s+/i, '');
  } else if (xApiKey) {
    apiKey = headers[xApiKey];
  }

  // Extract body — support -d, --data, --data-raw, --data-binary with various quoting
  let bodyStr = '';
  const dataPatterns = [
    /(?:-d|--data|--data-raw|--data-binary)\s+\$'((?:[^'\\]|\\.)*)'/,  // $'...' ANSI-C quoting (Chrome bash)
    /(?:-d|--data|--data-raw|--data-binary)\s+'((?:[^'\\]|\\')*)'/,     // '...' single quotes
    /(?:-d|--data|--data-raw|--data-binary)\s+"((?:[^"\\]|\\.)*)"/,     // "..." double quotes with escapes
    /(?:-d|--data|--data-raw|--data-binary)\s+(\{[^\s].*?\})\s*(?:-|$)/,// unquoted JSON object
  ];
  for (const pattern of dataPatterns) {
    const m = normalized.match(pattern);
    if (m) {
      bodyStr = m[1];
      break;
    }
  }

  // Try parsing body as JSON
  let body: Record<string, any> | null = null;
  if (bodyStr) {
    // Try as-is first, then with common unescaping
    const attempts = [
      bodyStr,
      bodyStr.replace(/\\"/g, '"'),
      bodyStr.replace(/\\'/g, "'"),
      bodyStr.replace(/\\(.)/g, '$1'),
    ];
    for (const attempt of attempts) {
      try {
        body = JSON.parse(attempt);
        break;
      } catch {
        // try next
      }
    }
  }

  // If body parsing failed, try to extract model from raw string
  let model = '';
  if (body?.model) {
    model = body.model;
  } else if (bodyStr) {
    // Fallback: regex extract "model" from the raw body string
    const modelMatch = bodyStr.match(/["']?model["']?\s*:\s*["']([^"']+)["']/);
    if (modelMatch) {
      model = modelMatch[1];
    }
  }

  // Determine provider type from URL
  let providerType = 'openai_compatible';
  let displayName = '';
  const urlLower = url.toLowerCase();
  if (urlLower.includes('api.openai.com')) {
    providerType = 'openai';
    displayName = 'OpenAI';
  } else if (urlLower.includes('anthropic.com')) {
    providerType = 'anthropic';
    displayName = 'Anthropic';
  } else if (urlLower.includes('generativelanguage.googleapis.com')) {
    providerType = 'google';
    displayName = 'Google AI';
  } else if (urlLower.includes('api.groq.com')) {
    providerType = 'openai_compatible';
    displayName = 'Groq';
  } else if (urlLower.includes('api.together.xyz')) {
    providerType = 'openai_compatible';
    displayName = 'Together AI';
  } else if (urlLower.includes('openrouter.ai')) {
    providerType = 'openai_compatible';
    displayName = 'OpenRouter';
  } else {
    try {
      const hostname = new URL(url).hostname;
      displayName = hostname.replace(/^(api|model)\./, '').split('.')[0];
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    } catch {
      displayName = 'Custom Provider';
    }
  }

  // Strip /chat/completions or /messages from the URL to get base endpoint
  const endpoint = url
    .replace(/\/chat\/completions\/?$/, '')
    .replace(/\/messages\/?$/, '')
    .replace(/\/v1\/models\/?$/, '')
    .replace(/\/$/, '');

  return {
    url: endpoint,
    method,
    headers,
    body,
    apiKey,
    model,
    providerType,
    displayName,
  };
}

interface Provider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  is_default: boolean;
  is_custom?: boolean;
  config: Record<string, any>;
  rate_limits: Record<string, any>;
}

interface Model {
  id: string;
  model_id: string;
  display_name: string;
  model_type: string;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  is_enabled: boolean;
}

const PROVIDER_TYPES = [
  { value: 'openai_compatible', label: 'OpenAI Compatible', description: 'Any OpenAI-compatible API endpoint' },
  { value: 'openai', label: 'OpenAI', description: 'Official OpenAI API' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
  { value: 'google', label: 'Google AI', description: 'Gemini models' },
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [defaultModel, setDefaultModel] = useState('');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    display_name: '',
    provider_type: 'openai_compatible',
    api_endpoint: '',
    api_key: '',
    default_model: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // cURL import modal state
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlInput, setCurlInput] = useState('');
  const [curlError, setCurlError] = useState('');
  const [curlTarget, setCurlTarget] = useState<'create' | 'edit'>('create');

  const handleImportCurl = () => {
    setCurlError('');
    if (!curlInput.trim()) {
      setCurlError('Please paste a cURL command');
      return;
    }

    try {
      const parsed = parseCurlCommand(curlInput);

      if (!parsed.url) {
        setCurlError('Could not extract a URL from the cURL command');
        return;
      }

      if (curlTarget === 'edit' && selectedProvider) {
        // Apply to current provider edit form
        if (parsed.url) setApiEndpoint(parsed.url);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.model) setDefaultModel(parsed.model);
      } else {
        // Apply to create form
        setNewProvider({
          name: parsed.displayName.toLowerCase().replace(/\s+/g, '_'),
          display_name: parsed.displayName,
          provider_type: parsed.providerType,
          api_endpoint: parsed.url,
          api_key: parsed.apiKey,
          default_model: parsed.model,
        });
        setShowCreateModal(true);
      }

      setShowCurlModal(false);
      setCurlInput('');
    } catch (err: any) {
      setCurlError(err.message || 'Failed to parse cURL command');
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    const result = await adminApi.getProviders();
    if (result.success && result.data) {
      setProviders(result.data);
    }
    setIsLoading(false);
  }

  const loadProviderDetails = async (provider: Provider) => {
    setSelectedProvider(provider);
    setApiKey('');
    setApiEndpoint(provider.api_endpoint || '');
    setDefaultModel(provider.config?.default_model || '');
    setTestResult(null);
    const result = await adminApi.getProviderModels(provider.id);
    if (result.success && result.data) {
      setModels(result.data);
    }
  };

  const handleSaveProvider = async () => {
    if (!selectedProvider) return;
    setIsSaving(true);

    const data: any = {
      is_enabled: selectedProvider.is_enabled,
      is_default: selectedProvider.is_default,
    };

    if (apiKey) {
      data.api_key = apiKey;
    }

    if (apiEndpoint !== selectedProvider.api_endpoint) {
      data.api_endpoint = apiEndpoint;
    }

    if (defaultModel) {
      data.config = {
        ...selectedProvider.config,
        default_model: defaultModel,
      };
    }

    const result = await adminApi.updateProvider(selectedProvider.id, data);

    if (result.success) {
      setProviders(providers.map(p =>
        p.id === selectedProvider.id ? { ...p, ...result.data } : p
      ));
      setSelectedProvider({ ...selectedProvider, ...result.data });
      setApiKey('');
    }

    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await adminApi.testProviderConnection(selectedProvider.id);
      setTestResult(result.data || { success: false, message: 'Unknown error' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Test failed' });
    }

    setIsTesting(false);
  };

  const handleCreateProvider = async () => {
    if (!newProvider.name || !newProvider.display_name) return;
    setIsCreating(true);

    const result = await adminApi.createProvider({
      name: newProvider.name.toLowerCase().replace(/\s+/g, '_'),
      display_name: newProvider.display_name,
      provider_type: newProvider.provider_type,
      api_endpoint: newProvider.api_endpoint || undefined,
      api_key: newProvider.api_key || undefined,
      config: newProvider.default_model ? { default_model: newProvider.default_model } : undefined,
    });

    if (result.success) {
      await loadProviders();
      setShowCreateModal(false);
      setNewProvider({
        name: '',
        display_name: '',
        provider_type: 'openai_compatible',
        api_endpoint: '',
        api_key: '',
        default_model: '',
      });
    }

    setIsCreating(false);
  };

  const handleDeleteProvider = async () => {
    if (!selectedProvider || !selectedProvider.is_custom) return;

    if (!confirm(`Delete "${selectedProvider.display_name}"? This cannot be undone.`)) return;

    const result = await adminApi.deleteProvider(selectedProvider.id);

    if (result.success) {
      setProviders(providers.filter(p => p.id !== selectedProvider.id));
      setSelectedProvider(null);
    }
  };

  const toggleProviderEnabled = (enabled: boolean) => {
    if (selectedProvider) {
      setSelectedProvider({ ...selectedProvider, is_enabled: enabled });
    }
  };

  const getProviderIcon = (name: string, type: string) => {
    // Check by provider name first (for special providers)
    const nameIcons: Record<string, string> = {
      saif: '🧿',
      deepseek: '🔬',
      mistral: '🌬️',
      fireworks: '🎆',
      openrouter: '🔀',
      ollama: '🦙',
      lmstudio: '🖥️',
      vllm: '⚙️',
    };
    if (nameIcons[name]) return nameIcons[name];

    // Fallback to provider type
    const typeIcons: Record<string, string> = {
      openai: '🤖',
      anthropic: '🧠',
      google: '🔮',
      azure: '☁️',
      groq: '⚡',
      together: '🤝',
      openai_compatible: '🔌',
      custom: '🔧',
    };
    return typeIcons[type] || '🔌';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Providers</h1>
          <p className="text-gray-500 mt-1">Configure AI service providers and API keys</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCurlTarget('create'); setShowCurlModal(true); setCurlInput(''); setCurlError(''); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            <Terminal size={16} />
            Import cURL
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Custom Provider
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Providers</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => loadProviderDetails(provider)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                  selectedProvider?.id === provider.id ? 'bg-gray-800/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getProviderIcon(provider.name, provider.provider_type)}</span>
                  <div className="text-left">
                    <div className="font-medium text-white flex items-center gap-2">
                      {provider.display_name}
                      {provider.is_custom && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Custom</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {provider.api_key_encrypted ? 'Configured' : provider.config?.requires_api_key === false ? 'No key required' : 'Not configured'}
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
                    <span className="text-3xl">{getProviderIcon(selectedProvider.name, selectedProvider.provider_type)}</span>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedProvider.display_name}
                        {selectedProvider.is_custom && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Custom</span>
                        )}
                      </h2>
                      <p className="text-gray-500 text-sm">{selectedProvider.provider_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProvider.is_custom && (
                      <button
                        onClick={handleDeleteProvider}
                        className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => { setCurlTarget('edit'); setShowCurlModal(true); setCurlInput(''); setCurlError(''); }}
                      className="px-3 py-2 text-gray-400 hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors"
                      title="Import from cURL"
                    >
                      <Upload size={16} />
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 size={16} className="animate-spin" /> : <TestTube2 size={16} />}
                      Test
                    </button>
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

                {testResult && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    testResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    {testResult.success ? (
                      <Check size={20} className="text-green-400" />
                    ) : (
                      <X size={20} className="text-red-400" />
                    )}
                    <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                      {testResult.message}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl">
                    <div>
                      <div className="font-medium text-white">Enable Provider</div>
                      <div className="text-sm text-gray-500">Allow this provider to be used for AI features</div>
                    </div>
                    <button
                      onClick={() => toggleProviderEnabled(!selectedProvider.is_enabled)}
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

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      OpenAI-compatible endpoint (must support /chat/completions)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      API Key {selectedProvider.config?.requires_api_key === false && <span className="text-gray-600">(Optional)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={selectedProvider.api_key_encrypted ? '••••••••••••••••' : 'Enter API key'}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {selectedProvider.api_key_encrypted && (
                      <p className="text-xs text-gray-500 mt-2">
                        API key is configured. Enter a new key to replace it.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Default Model
                    </label>
                    <input
                      type="text"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      placeholder="e.g., gpt-4o, llama-3.1-70b"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Models */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="font-semibold text-white">Available Models</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {models.map((model) => (
                    <div key={model.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{model.display_name}</div>
                        <div className="text-sm text-gray-500">
                          <code className="text-xs">{model.model_id}</code>
                          <span className="mx-2">•</span>
                          {(model.context_window / 1000).toFixed(0)}K context
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-gray-400">
                            ${model.input_cost_per_1k}/1K in
                          </div>
                          <div className="text-gray-500">
                            ${model.output_cost_per_1k}/1K out
                          </div>
                        </div>
                        {model.is_enabled ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <X size={18} className="text-gray-600" />
                        )}
                      </div>
                    </div>
                  ))}

                  {models.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No models configured. Models are optional for custom endpoints.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Cpu size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500">Select a provider to configure</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Provider Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 m-4">
            <h2 className="text-xl font-bold text-white mb-6">Add Custom AI Provider</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={newProvider.display_name}
                  onChange={(e) => setNewProvider({ ...newProvider, display_name: e.target.value, name: e.target.value })}
                  placeholder="My Custom LLM"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Provider Type</label>
                <select
                  value={newProvider.provider_type}
                  onChange={(e) => setNewProvider({ ...newProvider, provider_type: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">API Endpoint *</label>
                <input
                  type="text"
                  value={newProvider.api_endpoint}
                  onChange={(e) => setNewProvider({ ...newProvider, api_endpoint: e.target.value })}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common endpoints: Ollama (localhost:11434/v1), LM Studio (localhost:1234/v1)
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">API Key (optional for local)</label>
                <input
                  type="password"
                  value={newProvider.api_key}
                  onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
                  placeholder="Leave empty if not required"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Model</label>
                <input
                  type="text"
                  value={newProvider.default_model}
                  onChange={(e) => setNewProvider({ ...newProvider, default_model: e.target.value })}
                  placeholder="e.g., llama3.1, mistral"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProvider}
                disabled={isCreating || !newProvider.display_name || !newProvider.api_endpoint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* cURL Import Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <Terminal size={24} className="text-blue-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Import from cURL</h2>
                <p className="text-sm text-gray-500">
                  Paste a cURL command to auto-fill provider configuration
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">cURL Command</label>
                <textarea
                  value={curlInput}
                  onChange={(e) => { setCurlInput(e.target.value); setCurlError(''); }}
                  placeholder={`curl https://api.example.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o", "messages": [...]}'`}
                  rows={8}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none resize-none placeholder:text-gray-600"
                />
              </div>

              {curlError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <X size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm">{curlError}</span>
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                <p>The parser will extract:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                  <li>API endpoint URL (strips /chat/completions suffix)</li>
                  <li>API key from Authorization or x-api-key headers</li>
                  <li>Model name from the request body</li>
                  <li>Provider type (auto-detected from URL)</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCurlModal(false); setCurlInput(''); setCurlError(''); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCurl}
                disabled={!curlInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Upload size={16} />
                {curlTarget === 'edit' ? 'Apply to Provider' : 'Import & Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
