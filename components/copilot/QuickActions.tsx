
import React from 'react';
import { Plus, Bug, BarChart3, AlertCircle } from 'lucide-react';

interface QuickActionsProps {
  onAction: (query: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => (
  <div className="flex flex-wrap gap-2 mb-4">
    {[
      { icon: Plus, label: 'Create Task', query: 'Create a new task' },
      { icon: Bug, label: 'Report Bug', query: 'Draft a bug report for' },
      { icon: BarChart3, label: 'Summarize', query: 'Summarize project status' },
      { icon: AlertCircle, label: 'Blockers', query: 'Show all blockers' },
    ].map((action, i) => (
      <button
        key={i}
        onClick={() => onAction(action.query)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
      >
        <action.icon size={12} />
        {action.label}
      </button>
    ))}
  </div>
);
