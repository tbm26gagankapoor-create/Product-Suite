import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  key?: string;
}

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; startDate: string; endDate: string; goal: string; projectId?: string }) => void;
  nextSprintNumber: number;
  projects?: Project[]; // Optional: when provided, shows project selector
  defaultProjectId?: string; // Optional: pre-selected project
}

const SprintModal: React.FC<SprintModalProps> = ({ isOpen, onClose, onSubmit, nextSprintNumber, projects, defaultProjectId }) => {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');

  // Set defaults when opening
  useEffect(() => {
    if (isOpen) {
      setName(`Sprint ${nextSprintNumber}`);
      setGoal('');
      setSelectedProjectId(defaultProjectId || projects?.[0]?.id || '');

      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() + 1); // Start tomorrow by default
      const end = new Date(start);
      end.setDate(start.getDate() + 14); // 2 weeks duration

      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [isOpen, nextSprintNumber, defaultProjectId, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, startDate, endDate, goal, projectId: selectedProjectId || undefined });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15171E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1F2128]">
          <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Start New Sprint</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project Selector - shown when creating from global view */}
          {projects && projects.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Product</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select a product...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.key ? `(${p.key})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Sprint Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. Sprint 24"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Sprint Goal</label>
            <textarea 
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              placeholder="What do we want to achieve?"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all"
            >
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SprintModal;