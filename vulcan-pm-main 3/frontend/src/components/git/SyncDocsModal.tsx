import React, { useState, useEffect } from 'react';
import { X, GitBranch, GitPullRequest, FileText, Check, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { gitService, ProjectGitSettings, SyncPreview, SyncResult, Branch } from '../../services/git.service';

interface SyncDocsModalProps {
  projectId: string;
  projectName: string;
  gitSettings: ProjectGitSettings;
  documents: Array<{ section_id: string; section_name: string; content: string }>;
  onClose: () => void;
  onSynced: () => void;
}

type Step = 'preview' | 'options' | 'syncing' | 'complete';

const SyncDocsModal: React.FC<SyncDocsModalProps> = ({
  projectId,
  projectName,
  gitSettings,
  documents,
  onClose,
  onSynced,
}) => {
  const [step, setStep] = useState<Step>('preview');
  const [previews, setPreviews] = useState<SyncPreview[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(documents.map(d => d.section_id)));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync options
  const [createBranch, setCreateBranch] = useState(gitSettings.branch_strategy === 'pr');
  const [branchName, setBranchName] = useState(`docs/${Date.now()}`);
  const [selectedBranch, setSelectedBranch] = useState(gitSettings.repository.default_branch);
  const [commitMessage, setCommitMessage] = useState('docs: update documentation');
  const [createPR, setCreatePR] = useState(gitSettings.branch_strategy === 'pr');
  const [prTitle, setPRTitle] = useState(`Documentation update for ${projectName}`);
  const [prDescription, setPRDescription] = useState('');

  // Sync results
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);

  // Load previews on mount
  useEffect(() => {
    loadPreviews();
    loadBranches();
  }, []);

  const loadPreviews = async () => {
    try {
      setLoadingPreviews(true);
      setError(null);
      const data = await gitService.previewSync(
        projectId,
        documents.map(d => ({ section_id: d.section_id, content: d.content }))
      );
      setPreviews(data.previews);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoadingPreviews(false);
    }
  };

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const data = await gitService.listBranches(projectId);
      setBranches(data);
    } catch (err: any) {
      // Non-critical, just won't show branch selection
      console.error('Failed to load branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const toggleDoc = (sectionId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
    } else {
      newSelected.add(sectionId);
    }
    setSelectedDocs(newSelected);
  };

  const selectAll = () => {
    setSelectedDocs(new Set(documents.map(d => d.section_id)));
  };

  const selectNone = () => {
    setSelectedDocs(new Set());
  };

  const handleSync = async () => {
    if (selectedDocs.size === 0) return;

    try {
      setSyncing(true);
      setStep('syncing');
      setError(null);

      const docsToSync = documents
        .filter(d => selectedDocs.has(d.section_id))
        .map(d => ({ section_id: d.section_id, content: d.content }));

      const response = await gitService.syncDocuments(projectId, docsToSync, {
        branch: createBranch ? undefined : selectedBranch,
        create_branch: createBranch,
        branch_name: createBranch ? branchName : undefined,
        commit_message: commitMessage,
        create_pr: createPR && createBranch,
        pr_title: prTitle,
        pr_description: prDescription,
      });

      setResults(response.results);
      if (response.pull_request) {
        setPullRequestUrl(response.pull_request.url);
      }
      setStep('complete');
      onSynced();
    } catch (err: any) {
      setError(err.message || 'Failed to sync documents');
      setStep('options');
    } finally {
      setSyncing(false);
    }
  };

  const getPreviewForDoc = (sectionId: string) => {
    return previews.find(p => p.section_id === sectionId);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">New</span>;
      case 'update':
        return <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Update</span>;
      case 'no_change':
        return <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">No Change</span>;
      default:
        return null;
    }
  };

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDocs.size} of {documents.length} documents selected
        </span>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-700">
            Select all
          </button>
          <button onClick={selectNone} className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      </div>

      {loadingPreviews ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {documents.map(doc => {
            const preview = getPreviewForDoc(doc.section_id);
            const isSelected = selectedDocs.has(doc.section_id);

            return (
              <label
                key={doc.section_id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDoc(doc.section_id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {doc.section_name}
                    </span>
                    {preview && getActionBadge(preview.action)}
                  </div>
                  {preview && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {preview.file_path}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-4">
      {/* Branch Options */}
      <div>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={createBranch}
            onChange={(e) => {
              setCreateBranch(e.target.checked);
              if (!e.target.checked) setCreatePR(false);
            }}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Create new branch
          </span>
        </label>

        {createBranch ? (
          <input
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Branch name"
            className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {branches.map(branch => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
                {branch.name === gitSettings.repository.default_branch ? ' (default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Commit Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Commit Message
        </label>
        <input
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="docs: update documentation"
          className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* PR Options */}
      {createBranch && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={createPR}
              onChange={(e) => setCreatePR(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Create Pull Request
            </span>
          </label>

          {createPR && (
            <div className="space-y-3 pl-6">
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPRTitle(e.target.value)}
                placeholder="PR title"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                value={prDescription}
                onChange={(e) => setPRDescription(e.target.value)}
                placeholder="PR description (optional)"
                rows={3}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSyncingStep = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Syncing Documents
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Pushing {selectedDocs.size} document(s) to {gitSettings.repository.full_name}
      </p>
    </div>
  );

  const renderCompleteStep = () => {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            failed === 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            {failed === 0 ? (
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
            {failed === 0 ? 'Sync Complete' : 'Sync Completed with Errors'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {successful} document(s) synced successfully
            {failed > 0 && `, ${failed} failed`}
          </p>
        </div>

        {pullRequestUrl && (
          <a
            href={pullRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <GitPullRequest className="w-5 h-5" />
            <span className="font-medium">View Pull Request</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {results.map(result => (
            <div
              key={result.section_id}
              className="flex items-center gap-3 p-3"
            >
              {result.success ? (
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white">
                  {result.section_name}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {result.success ? result.file_path : result.error}
                </p>
              </div>
              {result.commit && (
                <a
                  href={result.commit.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {result.commit.sha.substring(0, 7)}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#1A1B1E] rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sync to Git
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {gitSettings.repository.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={syncing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {step === 'preview' && renderPreviewStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'syncing' && renderSyncingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        {/* Footer */}
        {step !== 'syncing' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {step === 'options' && (
                <button
                  onClick={() => setStep('preview')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'complete' ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  {step === 'preview' ? (
                    <button
                      onClick={() => setStep('options')}
                      disabled={selectedDocs.size === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSync}
                      disabled={selectedDocs.size === 0 || syncing}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {syncing && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Sync Documents
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncDocsModal;
