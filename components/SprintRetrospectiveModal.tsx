
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ThumbsUp, AlertCircle, ListTodo, User } from 'lucide-react';
import { User as UserType } from '../types';

interface SprintRetrospectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  sprintName: string;
  users: UserType[];
}

interface ActionItem {
  id: string;
  text: string;
  assignedTo?: string;
  completed: boolean;
}

interface RetrospectiveData {
  whatWentWell: string[];
  whatCouldImprove: string[];
  actionItems: ActionItem[];
  submittedAt?: string;
}

const SprintRetrospectiveModal: React.FC<SprintRetrospectiveModalProps> = ({
  isOpen,
  onClose,
  sprintId,
  sprintName,
  users
}) => {
  const [data, setData] = useState<RetrospectiveData>({
    whatWentWell: [],
    whatCouldImprove: [],
    actionItems: []
  });
  const [newWentWell, setNewWentWell] = useState('');
  const [newCouldImprove, setNewCouldImprove] = useState('');
  const [newActionItem, setNewActionItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing retrospective data
  useEffect(() => {
    if (isOpen && sprintId) {
      const storageKey = `sprint-retro-${sprintId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData({
          whatWentWell: [],
          whatCouldImprove: [],
          actionItems: []
        });
      }
    }
  }, [isOpen, sprintId]);

  const handleSave = () => {
    setIsSaving(true);
    const storageKey = `sprint-retro-${sprintId}`;
    const dataToSave = {
      ...data,
      submittedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  const addWentWell = () => {
    if (newWentWell.trim()) {
      setData(prev => ({
        ...prev,
        whatWentWell: [...prev.whatWentWell, newWentWell.trim()]
      }));
      setNewWentWell('');
    }
  };

  const removeWentWell = (index: number) => {
    setData(prev => ({
      ...prev,
      whatWentWell: prev.whatWentWell.filter((_, i) => i !== index)
    }));
  };

  const addCouldImprove = () => {
    if (newCouldImprove.trim()) {
      setData(prev => ({
        ...prev,
        whatCouldImprove: [...prev.whatCouldImprove, newCouldImprove.trim()]
      }));
      setNewCouldImprove('');
    }
  };

  const removeCouldImprove = (index: number) => {
    setData(prev => ({
      ...prev,
      whatCouldImprove: prev.whatCouldImprove.filter((_, i) => i !== index)
    }));
  };

  const addActionItem = () => {
    if (newActionItem.trim()) {
      setData(prev => ({
        ...prev,
        actionItems: [...prev.actionItems, {
          id: `action-${Date.now()}`,
          text: newActionItem.trim(),
          completed: false
        }]
      }));
      setNewActionItem('');
    }
  };

  const removeActionItem = (id: string) => {
    setData(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(item => item.id !== id)
    }));
  };

  const toggleActionComplete = (id: string) => {
    setData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const assignActionItem = (id: string, userId: string) => {
    setData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(item =>
        item.id === id ? { ...item, assignedTo: userId || undefined } : item
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#1F2128]">
          <div>
            <h2 className="text-xl font-bold text-[#172B4D] dark:text-white">Sprint Retrospective</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sprintName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Three-column content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
            {/* What went well */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/10">
                  <ThumbsUp size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-green-700 dark:text-green-400">What went well</h3>
              </div>
              <div className="flex-1 bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
                <div className="space-y-2 mb-4">
                  {data.whatWentWell.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-green-200 dark:border-green-500/20 group"
                    >
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      <button
                        onClick={() => removeWentWell(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-500/10 rounded transition-all"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWentWell}
                    onChange={(e) => setNewWentWell(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWentWell()}
                    placeholder="Add something that went well..."
                    className="flex-1 px-3 py-2 text-sm border border-green-200 dark:border-green-500/20 rounded-lg bg-white dark:bg-[#0B0C0E] text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    onClick={addWentWell}
                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* What could improve */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/10">
                  <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-amber-700 dark:text-amber-400">What could improve</h3>
              </div>
              <div className="flex-1 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                <div className="space-y-2 mb-4">
                  {data.whatCouldImprove.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-amber-200 dark:border-amber-500/20 group"
                    >
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      <button
                        onClick={() => removeCouldImprove(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-500/10 rounded transition-all"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCouldImprove}
                    onChange={(e) => setNewCouldImprove(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCouldImprove()}
                    placeholder="Add an improvement idea..."
                    className="flex-1 px-3 py-2 text-sm border border-amber-200 dark:border-amber-500/20 rounded-lg bg-white dark:bg-[#0B0C0E] text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    onClick={addCouldImprove}
                    className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action items */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10">
                  <ListTodo size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-blue-700 dark:text-blue-400">Action items</h3>
              </div>
              <div className="flex-1 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                <div className="space-y-2 mb-4">
                  {data.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-blue-200 dark:border-blue-500/20 group"
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleActionComplete(item.id)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded"
                        />
                        <span className={`flex-1 text-sm ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeActionItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <User size={12} className="text-gray-400" />
                        <select
                          value={item.assignedTo || ''}
                          onChange={(e) => assignActionItem(item.id, e.target.value)}
                          className="text-xs bg-transparent border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1 text-gray-600 dark:text-gray-400 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                    placeholder="Add an action item..."
                    className="flex-1 px-3 py-2 text-sm border border-blue-200 dark:border-blue-500/20 rounded-lg bg-white dark:bg-[#0B0C0E] text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={addActionItem}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-[#1F2128]">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {data.submittedAt && (
              <span>Last saved: {new Date(data.submittedAt).toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Retrospective'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintRetrospectiveModal;
