import React, { useEffect, useState } from 'react';
import { List, ChevronRight, Save, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { adminApi } from '../lib/api';

interface EpicCategory {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  minimum_tasks: number;
  order_index: number;
  is_enabled: boolean;
  prompt_guidance: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const BATCH_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Batch 1' },
  2: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Batch 2' },
  3: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Batch 3' },
  4: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Batch 4' },
  5: { bg: 'bg-pink-500/10', text: 'text-pink-400', label: 'Batch 5' },
};

function getBatchGroup(orderIndex: number): number {
  return Math.ceil(orderIndex / 3);
}

export default function EpicCategoriesPage() {
  const [categories, setCategories] = useState<EpicCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EpicCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMinTasks, setEditMinTasks] = useState(8);
  const [editGuidance, setEditGuidance] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const result = await adminApi.getEpicCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setIsLoading(false);
  }

  const selectCategory = (category: EpicCategory) => {
    setSelectedCategory(category);
    setEditDisplayName(category.display_name);
    setEditDescription(category.description || '');
    setEditMinTasks(category.minimum_tasks);
    setEditGuidance(category.prompt_guidance || '');
  };

  const handleSave = async () => {
    if (!selectedCategory) return;
    setIsSaving(true);

    const data: any = {};
    if (editDisplayName !== selectedCategory.display_name) {
      data.display_name = editDisplayName;
    }
    if (editDescription !== (selectedCategory.description || '')) {
      data.description = editDescription;
    }
    if (editMinTasks !== selectedCategory.minimum_tasks) {
      data.minimum_tasks = editMinTasks;
    }
    if (editGuidance !== (selectedCategory.prompt_guidance || '')) {
      data.prompt_guidance = editGuidance;
    }

    const result = await adminApi.updateEpicCategory(selectedCategory.id, data);
    if (result.success && result.data) {
      setCategories(categories.map(c =>
        c.id === selectedCategory.id ? result.data : c
      ));
      setSelectedCategory(result.data);
    }

    setIsSaving(false);
  };

  const handleToggleEnabled = async () => {
    if (!selectedCategory) return;
    setIsSaving(true);

    const result = await adminApi.updateEpicCategory(selectedCategory.id, {
      is_enabled: !selectedCategory.is_enabled,
    });

    if (result.success && result.data) {
      setCategories(categories.map(c =>
        c.id === selectedCategory.id ? result.data : c
      ));
      setSelectedCategory(result.data);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const batchGroup = selectedCategory ? getBatchGroup(selectedCategory.order_index) : 0;
  const batchStyle = BATCH_COLORS[batchGroup] || BATCH_COLORS[1];

  // Group categories by batch
  const categoriesByBatch = categories.reduce((acc, cat) => {
    const batch = getBatchGroup(cat.order_index);
    if (!acc[batch]) acc[batch] = [];
    acc[batch].push(cat);
    return acc;
  }, {} as Record<number, EpicCategory[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Epic Categories</h1>
        <p className="text-gray-500 mt-1">Configure the 14-category system for project plan generation</p>
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold text-blue-400 mb-1">Batch Execution System</p>
              <p>Categories are organized into 5 batches (3 categories each). During plan generation, batches execute in parallel with delays between them to avoid rate limits. Minimum tasks guarantee comprehensive coverage.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Categories by Batch</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-[calc(100vh-300px)] overflow-y-auto">
            {Object.entries(categoriesByBatch).map(([batchNum, cats]) => {
              const bStyle = BATCH_COLORS[parseInt(batchNum)];
              return (
                <div key={batchNum}>
                  <div className={`px-6 py-2 ${bStyle.bg} border-b border-gray-800`}>
                    <span className={`text-xs font-bold ${bStyle.text} uppercase tracking-wider`}>
                      {bStyle.label} ({cats.length} categories)
                    </span>
                  </div>
                  {cats.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => selectCategory(category)}
                      className={`w-full px-6 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                        selectedCategory?.id === category.id ? 'bg-gray-800/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="font-medium text-white text-sm">{category.display_name}</div>
                          <div className="text-xs text-gray-500">
                            Min {category.minimum_tasks} tasks
                            {!category.is_enabled && ' (Disabled)'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.is_enabled ? (
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <span className="w-2 h-2 bg-gray-600 rounded-full" />
                        )}
                        <ChevronRight size={16} className="text-gray-600" />
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCategory ? (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 flex items-center justify-center ${batchStyle.bg} rounded-xl`}>
                      <List className={`w-6 h-6 ${batchStyle.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">{selectedCategory.display_name}</h2>
                        <span className={`px-2 py-0.5 ${batchStyle.bg} ${batchStyle.text} text-xs font-semibold rounded`}>
                          {batchStyle.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">Order: {selectedCategory.order_index} / 14</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl">
                    <div>
                      <div className="font-medium text-white">Enable Category</div>
                      <div className="text-sm text-gray-500">Include this category in plan generation</div>
                    </div>
                    <button
                      onClick={handleToggleEnabled}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        selectedCategory.is_enabled ? 'bg-green-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          selectedCategory.is_enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Minimum Tasks */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Minimum Tasks
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editMinTasks}
                      onChange={(e) => setEditMinTasks(parseInt(e.target.value) || 8)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      AI will generate at least this many tasks for this category
                    </p>
                  </div>

                  {/* Prompt Guidance */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      AI Prompt Guidance
                    </label>
                    <textarea
                      value={editGuidance}
                      onChange={(e) => setEditGuidance(e.target.value)}
                      rows={5}
                      placeholder="Category-specific instructions for the AI model..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This guidance is injected into the AI prompt to ensure category-specific task generation
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Stats */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="font-semibold text-white">Category Metadata</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Internal Name:</span>
                    <span className="text-white font-mono">{selectedCategory.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Batch Group:</span>
                    <span className={`${batchStyle.text} font-semibold`}>{batchStyle.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Execution Order:</span>
                    <span className="text-white">{selectedCategory.order_index} of 14</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-400">{new Date(selectedCategory.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="text-gray-400">{new Date(selectedCategory.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <List size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500">Select a category to configure</p>
              <p className="text-gray-600 text-sm mt-2">14 categories across 5 batches guarantee 136+ tasks per project</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
