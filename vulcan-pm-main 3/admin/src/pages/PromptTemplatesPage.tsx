import React, { useEffect, useState } from 'react';
import { FileText, ChevronRight, Save, Loader2, ToggleLeft, ToggleRight, History, Eye, RotateCcw, X } from 'lucide-react';
import { adminApi } from '../lib/api';

interface PromptTemplate {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string | null;
  template_body: string;
  variables: { name: string; description: string; required: boolean }[];
  metadata: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PromptVersion {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  product_generator: { label: 'Product Generator', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  copilot: { label: 'Copilot', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  task: { label: 'Task', color: 'text-green-400', bg: 'bg-green-500/10' },
  document: { label: 'Document', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  research: { label: 'Research', color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

const CATEGORIES = ['all', 'product_generator', 'copilot', 'task', 'document', 'research'];

export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showVersions, setShowVersions] = useState(false);

  // Edit state
  const [editBody, setEditBody] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [changeNote, setChangeNote] = useState('');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const result = await adminApi.getPromptTemplates();
    if (result.success && result.data) {
      setTemplates(result.data);
    }
    setIsLoading(false);
  }

  const selectTemplate = async (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditBody(template.template_body);
    setEditDescription(template.description || '');
    setChangeNote('');
    setShowVersions(false);
    setShowPreview(false);
    setPreviewResult(null);

    // Load versions
    const result = await adminApi.getPromptTemplateVersions(template.id);
    if (result.success && result.data) {
      setVersions(result.data);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);

    const data: any = {};
    if (editBody !== selectedTemplate.template_body) {
      data.template_body = editBody;
    }
    if (editDescription !== (selectedTemplate.description || '')) {
      data.description = editDescription;
    }
    if (changeNote) {
      data.change_note = changeNote;
    }

    if (!data.template_body && !data.description) {
      setIsSaving(false);
      return;
    }

    const result = await adminApi.updatePromptTemplate(selectedTemplate.id, data);
    if (result.success && result.data) {
      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id ? result.data : t
      ));
      setSelectedTemplate(result.data);
      setChangeNote('');

      // Reload versions
      const vResult = await adminApi.getPromptTemplateVersions(result.data.id);
      if (vResult.success && vResult.data) {
        setVersions(vResult.data);
      }
    }

    setIsSaving(false);
  };

  const handleToggle = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);

    const result = await adminApi.togglePromptTemplate(selectedTemplate.id, !selectedTemplate.is_active);
    if (result.success && result.data) {
      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id ? result.data : t
      ));
      setSelectedTemplate(result.data);
    }

    setIsSaving(false);
  };

  const handleRollback = async (version: number) => {
    if (!selectedTemplate) return;
    if (!confirm(`Rollback to version ${version}? This will create a new version with the old content.`)) return;

    setIsSaving(true);
    const result = await adminApi.rollbackPromptTemplate(selectedTemplate.id, version);
    if (result.success && result.data) {
      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id ? result.data : t
      ));
      setSelectedTemplate(result.data);
      setEditBody(result.data.template_body);

      // Reload versions
      const vResult = await adminApi.getPromptTemplateVersions(result.data.id);
      if (vResult.success && vResult.data) {
        setVersions(vResult.data);
      }
    }
    setIsSaving(false);
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    setIsPreviewing(true);
    setPreviewResult(null);

    const result = await adminApi.previewPromptTemplate(selectedTemplate.id, previewVars);
    if (result.success && result.data) {
      setPreviewResult(result.data.resolvedText);
    }
    setIsPreviewing(false);
  };

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const hasChanges = selectedTemplate && (
    editBody !== selectedTemplate.template_body ||
    editDescription !== (selectedTemplate.description || '')
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prompt Templates</h1>
        <p className="text-gray-500 mt-1">Manage AI prompt templates used across the platform</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const style = cat === 'all' ? { label: 'All', color: 'text-gray-300', bg: 'bg-gray-700/50' } : CATEGORY_STYLES[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? `${style.bg} ${style.color} ring-1 ring-current`
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {style.label} {cat !== 'all' && `(${templates.filter(t => t.category === cat).length})`}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Templates ({filteredTemplates.length})</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-[calc(100vh-320px)] overflow-y-auto">
            {filteredTemplates.map((template) => {
              const catStyle = CATEGORY_STYLES[template.category];
              return (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-gray-800/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-800 rounded-lg">
                      <FileText className={`w-5 h-5 ${catStyle?.color || 'text-gray-400'}`} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-medium text-white truncate">{template.display_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catStyle?.bg || ''} ${catStyle?.color || 'text-gray-400'}`}>
                          {catStyle?.label || template.category}
                        </span>
                        <span className="text-xs text-gray-600">v{template.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {template.is_active ? (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <span className="w-2 h-2 bg-gray-600 rounded-full" />
                    )}
                    <ChevronRight size={18} className="text-gray-600" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTemplate ? (
            <>
              {/* Header */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedTemplate.display_name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 font-mono">{selectedTemplate.name}</span>
                      <span className="text-xs text-gray-600">v{selectedTemplate.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedTemplate.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {selectedTemplate.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowPreview(!showPreview); setPreviewResult(null); }}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => setShowVersions(!showVersions)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      <History size={16} />
                      History
                    </button>
                    <button
                      onClick={handleToggle}
                      disabled={isSaving}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      {selectedTemplate.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                      {selectedTemplate.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !hasChanges}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    placeholder="What this template does..."
                  />
                </div>

                {/* Template Body */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Template Body
                  </label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={20}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono leading-relaxed resize-y"
                    spellCheck={false}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-600">
                      Use {'{{variableName}}'} for substitution, {'{{#if varName}}...{{/if}}'} for conditionals
                    </p>
                    <p className="text-xs text-gray-600">{editBody.length} chars</p>
                  </div>
                </div>

                {/* Change Note */}
                {hasChanges && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Change Note (optional)
                    </label>
                    <input
                      type="text"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                      placeholder="Describe what you changed..."
                    />
                  </div>
                )}

                {/* Variables Table */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Variables
                    </label>
                    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold uppercase">Name</th>
                            <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold uppercase">Required</th>
                            <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {selectedTemplate.variables.map((v) => (
                            <tr key={v.name}>
                              <td className="px-4 py-2 font-mono text-blue-400">{`{{${v.name}}}`}</td>
                              <td className="px-4 py-2">
                                {v.required ? (
                                  <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded">required</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded">optional</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-400">{v.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 flex gap-4">
                  <div className="text-xs text-gray-600">
                    Output: <span className="text-gray-400 font-mono">{selectedTemplate.metadata?.response_format || 'text'}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Updated: <span className="text-gray-400">{new Date(selectedTemplate.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              {showPreview && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Preview</h3>
                    <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {selectedTemplate.variables.map(v => (
                      <div key={v.name}>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          {v.name} {v.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={previewVars[v.name] || ''}
                          onChange={(e) => setPreviewVars({ ...previewVars, [v.name]: e.target.value })}
                          placeholder={v.description}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handlePreview}
                      disabled={isPreviewing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isPreviewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      Resolve
                    </button>
                    {previewResult && (
                      <div className="mt-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-500">Resolved Output</span>
                          <span className="text-xs text-gray-600">{previewResult.length} chars</span>
                        </div>
                        <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {previewResult}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Version History */}
              {showVersions && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Version History</h3>
                    <button onClick={() => setShowVersions(false)} className="text-gray-500 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                    {versions.map((v) => (
                      <div key={v.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">Version {v.version}</span>
                            {v.version === selectedTemplate.version && (
                              <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">current</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(v.created_at).toLocaleString()}
                            {v.created_by && ` by ${v.created_by}`}
                          </div>
                          {v.change_note && (
                            <div className="text-xs text-gray-400 mt-1">{v.change_note}</div>
                          )}
                        </div>
                        {v.version !== selectedTemplate.version && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditBody(v.template_body);
                              }}
                              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs flex items-center gap-1"
                            >
                              <Eye size={12} />
                              View
                            </button>
                            <button
                              onClick={() => handleRollback(v.version)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-xs flex items-center gap-1"
                            >
                              <RotateCcw size={12} />
                              Rollback
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {versions.length === 0 && (
                      <div className="px-6 py-8 text-center text-gray-500 text-sm">No version history</div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500">Select a template to edit</p>
              <p className="text-gray-600 text-sm mt-2">
                Edit AI prompt templates to customize how the platform generates content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
