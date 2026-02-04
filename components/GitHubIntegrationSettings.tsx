import React, { useState, useEffect, useCallback } from 'react';
import {
  Github, Link2, Unlink, RefreshCw, Check, X, AlertCircle,
  FolderGit2, GitBranch, FileText, Clock, ExternalLink, Loader2,
  Settings, ChevronDown, Plus
} from 'lucide-react';
import { githubApi } from '../services/api';
import type { GitHubIntegration, GitHubRepo, GitHubBranch, GitHubSyncLog } from '../types';

interface GitHubIntegrationSettingsProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
  isModal?: boolean;
}

const GitHubIntegrationSettings: React.FC<GitHubIntegrationSettingsProps> = ({
  projectId,
  projectName = 'Project',
  onClose,
  isModal = false,
}) => {
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [logs, setLogs] = useState<GitHubSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);

  // Form state
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [filePath, setFilePath] = useState('docs/PRD.md');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Check if repo needs to be configured
  const needsRepoSetup = integration && (!integration.repoOwner || !integration.repoName);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Check if GitHub is configured
      const status = await githubApi.getStatus();
      setGithubConfigured(status.configured);

      if (!status.configured) {
        setLoading(false);
        return;
      }

      // Load integration settings
      const integrationData = await githubApi.getIntegration(projectId);
      setIntegration(integrationData);

      if (integrationData) {
        if (integrationData.repoOwner && integrationData.repoName) {
          setSelectedRepo(`${integrationData.repoOwner}/${integrationData.repoName}`);
        }
        setSelectedBranch(integrationData.branch || 'main');
        setFilePath(integrationData.filePath || 'docs/PRD.md');
        setAutoSyncEnabled(integrationData.autoSyncEnabled);

        // Load repos
        try {
          const reposData = await githubApi.listRepos(projectId);
          setRepos(reposData);

          // Load branches if repo is set
          if (integrationData.repoOwner && integrationData.repoName) {
            const branchesData = await githubApi.listBranches(projectId);
            setBranches(branchesData);
          }
        } catch (error) {
          console.error('Failed to load repos:', error);
        }

        // Load sync logs
        try {
          const logsData = await githubApi.getSyncLogs(projectId, 10);
          setLogs(logsData);
        } catch (error) {
          console.error('Failed to load logs:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load GitHub integration:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle repo change - load branches for new repo
  const handleRepoChange = async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    const [owner, repo] = repoFullName.split('/');

    try {
      const branchesData = await githubApi.listBranches(projectId, owner, repo);
      setBranches(branchesData);

      // Select default branch if available
      const defaultBranch = repos.find(r => r.fullName === repoFullName)?.defaultBranch || 'main';
      setSelectedBranch(defaultBranch);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  // Create new repository
  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;

    setCreatingRepo(true);
    try {
      const result = await githubApi.createRepo(projectId, {
        name: newRepoName.trim(),
        description: `PRD documentation for ${projectName}`,
        isPrivate: newRepoPrivate,
      });

      if (result.success && result.repo) {
        // Refresh repos list
        const reposData = await githubApi.listRepos(projectId);
        setRepos(reposData);

        // Select the new repo
        setSelectedRepo(result.repo.fullName);
        setSelectedBranch(result.repo.defaultBranch);

        // Load branches
        const branchesData = await githubApi.listBranches(projectId, result.repo.fullName.split('/')[0], result.repo.name);
        setBranches(branchesData);

        setShowCreateRepo(false);
        setNewRepoName('');
      } else {
        alert(result.error || 'Failed to create repository');
      }
    } catch (error) {
      console.error('Failed to create repo:', error);
      alert('Failed to create repository');
    } finally {
      setCreatingRepo(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    if (!selectedRepo || !selectedBranch) {
      alert('Please select a repository and branch');
      return;
    }

    setSaving(true);
    try {
      const [repoOwner, repoName] = selectedRepo.split('/');
      await githubApi.updateSettings(projectId, {
        repoOwner,
        repoName,
        branch: selectedBranch,
        filePath,
        autoSyncEnabled,
      });

      // Reload data
      await loadData();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await githubApi.testConnection(projectId);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  // Disconnect GitHub
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect GitHub integration?')) return;

    try {
      await githubApi.disconnectGitHub(projectId);
      setIntegration(null);
      setRepos([]);
      setBranches([]);
      setLogs([]);
      setSelectedRepo('');
      setSelectedBranch('');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Connect GitHub
  const handleConnect = () => {
    githubApi.connectGitHub(projectId);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // Generate suggested repo name
  const suggestedRepoName = `prd-${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  const containerClass = isModal
    ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
    : '';

  const contentClass = isModal
    ? 'bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden'
    : 'bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden';

  if (!githubConfigured && !loading) {
    return (
      <div className={containerClass}>
        <div className={contentClass}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <Github size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">GitHub Integration</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Not configured</p>
              </div>
              {isModal && onClose && (
                <button
                  onClick={onClose}
                  className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">GitHub OAuth not configured</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Contact your administrator to configure GitHub OAuth credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-[#1F2128]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-lg">
              <Github size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">GitHub Integration</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Sync PRD documents to a GitHub repository
              </p>
            </div>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
            </div>
          ) : !integration ? (
            /* Not connected */
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center mx-auto mb-4">
                <Github size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#172B4D] dark:text-white mb-2">
                Connect to GitHub
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Connect your GitHub account to sync PRD documents to a repository.
              </p>
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-[#24292e] hover:bg-[#1b1f23] text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <Github size={18} />
                Connect GitHub
              </button>
            </div>
          ) : (
            /* Connected - show settings */
            <div className="space-y-6">
              {/* Connection status */}
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Connected as @{integration.githubUsername}
                    </p>
                    {integration.repoOwner && integration.repoName ? (
                      <a
                        href={`https://github.com/${integration.repoOwner}/${integration.repoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                      >
                        {integration.repoOwner}/{integration.repoName}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Repository not configured</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Setup required notice */}
              {needsRepoSetup && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Setup Required</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Select an existing repository or create a new one to sync your PRD documents.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Repository selection */}
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] dark:text-white mb-2">
                  <FolderGit2 size={14} className="inline mr-2" />
                  Repository
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedRepo}
                    onChange={(e) => handleRepoChange(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                  >
                    <option value="">Select a repository...</option>
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.fullName}>
                        {repo.fullName} {repo.private ? '(Private)' : '(Public)'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowCreateRepo(!showCreateRepo);
                      setNewRepoName(suggestedRepoName);
                    }}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-[#1F2128] hover:bg-gray-200 dark:hover:bg-[#2D2F36] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>

                {/* Create new repo form */}
                {showCreateRepo && (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl space-y-3">
                    <h4 className="text-sm font-semibold text-[#172B4D] dark:text-white">Create New Repository</h4>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="Repository name"
                      className="w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      Private repository
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateRepo}
                        disabled={creatingRepo || !newRepoName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                      >
                        {creatingRepo ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Create Repository
                      </button>
                      <button
                        onClick={() => setShowCreateRepo(false)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Branch selection */}
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] dark:text-white mb-2">
                  <GitBranch size={14} className="inline mr-2" />
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={!selectedRepo}
                  className="w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 disabled:opacity-50"
                >
                  {branches.length === 0 && <option value="main">main</option>}
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name} {branch.protected ? '(Protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* File path */}
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] dark:text-white mb-2">
                  <FileText size={14} className="inline mr-2" />
                  File Path
                </label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="docs/PRD.md"
                  className="w-full bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use {'{{section}}'} to create separate files per section
                </p>
              </div>

              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl">
                <div>
                  <h3 className="text-sm font-semibold text-[#172B4D] dark:text-white">Auto-sync</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Automatically sync when PRD documents are saved
                  </p>
                </div>
                <button
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-all ${
                    autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      autoSyncEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Last sync status */}
              {integration.lastSyncAt && (
                <div className="p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Last synced: {formatDate(integration.lastSyncAt)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        integration.lastSyncStatus === 'success'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {integration.lastSyncStatus}
                    </span>
                  </div>
                  {integration.lastSyncError && (
                    <p className="text-xs text-red-500 mt-2">{integration.lastSyncError}</p>
                  )}
                  {integration.lastCommitSha && (
                    <a
                      href={`https://github.com/${integration.repoOwner}/${integration.repoName}/commit/${integration.lastCommitSha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      View commit <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <>
                        <Check size={16} className="text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-300">Connection successful</span>
                      </>
                    ) : (
                      <>
                        <X size={16} className="text-red-600 dark:text-red-400" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                          {testResult.error || 'Connection failed'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Sync logs */}
              <div>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showLogs ? 'rotate-180' : ''}`}
                  />
                  Sync History
                </button>
                {showLogs && logs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="text-gray-600 dark:text-gray-400">{log.sectionId}</span>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-gray-500 dark:text-gray-400">{log.action}</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showLogs && logs.length === 0 && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No sync history yet</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {integration && (
          <div className="flex items-center justify-between p-6 border-t border-gray-100 dark:border-[#1F2128] bg-gray-50 dark:bg-[#0B0C0E]">
            <button
              onClick={handleTestConnection}
              disabled={testing || !selectedRepo}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-xl transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedRepo || !selectedBranch}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegrationSettings;
