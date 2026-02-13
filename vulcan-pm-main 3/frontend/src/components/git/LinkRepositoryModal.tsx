import React, { useState, useEffect } from 'react';
import { X, GitBranch, Search, Folder, Lock, Globe, RefreshCw, AlertCircle, Building2, BookOpen, Code2 } from 'lucide-react';
import { gitService, GitConnection, Repository, ProjectGitSettings } from '../../services/git.service';

interface LinkRepositoryModalProps {
  projectId: string;
  projectName: string;
  currentSettings?: ProjectGitSettings | null;
  initialRepoMode?: 'shared' | 'dedicated' | 'code';
  onClose: () => void;
  onLinked: (settings: ProjectGitSettings) => void;
}

const LinkRepositoryModal: React.FC<LinkRepositoryModalProps> = ({
  projectId,
  projectName,
  currentSettings,
  initialRepoMode,
  onClose,
  onLinked,
}) => {
  const [connections, setConnections] = useState<GitConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<GitConnection | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [repoMode, setRepoMode] = useState<'shared' | 'dedicated' | 'code'>(initialRepoMode || 'dedicated');
  const [docsPath, setDocsPath] = useState(() => {
    if (initialRepoMode === 'shared') {
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `${slug}/docs/`;
    }
    return 'docs/';
  });
  const [branchStrategy, setBranchStrategy] = useState<'direct' | 'pr'>('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  // Load repos when connection changes
  useEffect(() => {
    if (selectedConnection) {
      loadRepositories(selectedConnection.provider_id);
    }
  }, [selectedConnection]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await gitService.getMyConnections();
      const validConnections = data.filter(c => c.is_valid);
      setConnections(validConnections);

      // Auto-select first connection
      if (validConnections.length > 0) {
        setSelectedConnection(validConnections[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async (providerId: string) => {
    try {
      setLoadingRepos(true);
      setError(null);
      const data = await gitService.listRepositories(projectId, providerId);
      setRepositories(data);
    } catch (err: any) {
      if ((err as any).code === 'NOT_CONNECTED') {
        setError('Please connect your Git account first');
      } else {
        setError(err.message || 'Failed to load repositories');
      }
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleRepoModeChange = (mode: 'shared' | 'dedicated' | 'code') => {
    setRepoMode(mode);
    if (mode === 'shared') {
      // Sanitize project name for path: lowercase, replace spaces/special chars with hyphens
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setDocsPath(`${slug}/docs/`);
    } else {
      setDocsPath('docs/');
    }
  };

  const handleLink = async () => {
    if (!selectedConnection || !selectedRepo) return;

    try {
      setLinking(true);
      setError(null);

      const settings = await gitService.linkRepository(
        projectId,
        selectedConnection.provider_id,
        selectedRepo.owner.login,
        selectedRepo.name,
        docsPath,
        branchStrategy,
        repoMode
      );

      onLinked(settings);
    } catch (err: any) {
      setError(err.message || 'Failed to link repository');
    } finally {
      setLinking(false);
    }
  };

  const filteredRepos = repositories.filter(repo =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProviderIcon = (providerType: string) => {
    const colors: Record<string, string> = {
      github: 'text-gray-900 dark:text-white',
      gitlab: 'text-orange-500',
      bitbucket: 'text-blue-600',
    };
    return <GitBranch className={`w-5 h-5 ${colors[providerType] || 'text-gray-600'}`} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#1A1B1E] rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Link Repository
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Connect a Git repository to {projectName} for documentation storage
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Git Connections
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect a Git provider in Settings to link repositories
              </p>
            </div>
          ) : (
            <>
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Git Provider
                </label>
                <div className="flex gap-2 flex-wrap">
                  {connections.map(conn => (
                    <button
                      key={conn.id}
                      onClick={() => setSelectedConnection(conn)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        selectedConnection?.id === conn.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {getProviderIcon(conn.provider_type)}
                      <span className="font-medium">{conn.provider_display_name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        @{conn.provider_username}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Repository Search */}
              {selectedConnection && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Repository
                  </label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search repositories..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {loadingRepos ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRepos.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {searchTerm ? 'No repositories found' : 'No repositories with write access'}
                        </div>
                      ) : (
                        filteredRepos.map(repo => (
                          <button
                            key={repo.id}
                            onClick={() => setSelectedRepo(repo)}
                            className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              selectedRepo?.id === repo.id
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : ''
                            }`}
                          >
                            <div className="mt-0.5">
                              {repo.private ? (
                                <Lock className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Globe className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                  {repo.full_name}
                                </span>
                                {selectedRepo?.id === repo.id && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                    Selected
                                  </span>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {repo.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Default branch: {repo.default_branch}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settings */}
              {selectedRepo && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Repo Mode Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Repository Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleRepoModeChange('shared')}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          repoMode === 'shared'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Building2 className={`w-5 h-5 mb-2 ${repoMode === 'shared' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          Shared Docs Repo
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Company-wide docs repo. Each project in its own folder.
                        </p>
                      </button>
                      <button
                        onClick={() => handleRepoModeChange('dedicated')}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          repoMode === 'dedicated'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <BookOpen className={`w-5 h-5 mb-2 ${repoMode === 'dedicated' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          Dedicated Docs Repo
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Standalone repo for this project's docs.
                        </p>
                      </button>
                      <button
                        onClick={() => handleRepoModeChange('code')}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          repoMode === 'code'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Code2 className={`w-5 h-5 mb-2 ${repoMode === 'code' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          Code Repository
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Docs live alongside the project's source code.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Documentation Path */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Documentation Path
                    </label>
                    <div className="relative">
                      <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={docsPath}
                        onChange={(e) => setDocsPath(e.target.value)}
                        placeholder="docs/"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Directory where documentation files will be stored
                    </p>
                  </div>

                  {/* Sync Strategy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync Strategy
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBranchStrategy('direct')}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          branchStrategy === 'direct'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          Direct Push
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Push directly to the default branch
                        </p>
                      </button>
                      <button
                        onClick={() => setBranchStrategy('pr')}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          branchStrategy === 'pr'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          Pull Request
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Create PRs for review before merging
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedRepo || linking}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {linking && <RefreshCw className="w-4 h-4 animate-spin" />}
            Link Repository
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkRepositoryModal;
