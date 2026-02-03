
import React, { useState, useEffect } from 'react';
import { Target, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface SprintGoalsTrackerProps {
  sprintId: string;
  goalText: string;
}

interface GoalItem {
  id: string;
  text: string;
  completed: boolean;
}

const SprintGoalsTracker: React.FC<SprintGoalsTrackerProps> = ({ sprintId, goalText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [goalItems, setGoalItems] = useState<GoalItem[]>([]);

  // Parse goal text into items on mount or when goal changes
  useEffect(() => {
    if (!goalText) {
      setGoalItems([]);
      return;
    }

    // Load saved state from localStorage
    const storageKey = `sprint-goals-${sprintId}`;
    const savedState = localStorage.getItem(storageKey);
    const completedIds = savedState ? JSON.parse(savedState) : [];

    // Split by newlines, bullets, or numbers to create goal items
    const lines = goalText
      .split(/[\n\r]+/)
      .map(line => line.replace(/^[\s\-\•\*\d\.]+/, '').trim())
      .filter(line => line.length > 0);

    // If no line breaks, treat the whole goal as a single item
    const items: GoalItem[] = lines.length > 0
      ? lines.map((text, index) => ({
          id: `goal-${index}`,
          text,
          completed: completedIds.includes(`goal-${index}`)
        }))
      : [{
          id: 'goal-0',
          text: goalText,
          completed: completedIds.includes('goal-0')
        }];

    setGoalItems(items);
  }, [goalText, sprintId]);

  // Save completion state to localStorage
  const toggleGoalCompletion = (goalId: string) => {
    setGoalItems(prev => {
      const updated = prev.map(item =>
        item.id === goalId ? { ...item, completed: !item.completed } : item
      );

      // Save to localStorage
      const completedIds = updated.filter(item => item.completed).map(item => item.id);
      localStorage.setItem(`sprint-goals-${sprintId}`, JSON.stringify(completedIds));

      return updated;
    });
  };

  if (!goalText || goalItems.length === 0) {
    return null;
  }

  const completedCount = goalItems.filter(item => item.completed).length;
  const progress = Math.round((completedCount / goalItems.length) * 100);

  return (
    <div className="mt-4">
      {/* Collapsed summary */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Target size={16} className="text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Sprint Goals
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full font-medium">
            {completedCount}/{goalItems.length} complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-amber-200 dark:bg-amber-900/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {isExpanded ? (
            <ChevronUp size={16} className="text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDown size={16} className="text-amber-600 dark:text-amber-400" />
          )}
        </div>
      </button>

      {/* Expanded goals list */}
      {isExpanded && (
        <div className="mt-2 bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-xl overflow-hidden animate-in slide-in-from-top-2">
          <div className="divide-y divide-gray-100 dark:divide-[#2D2F36]">
            {goalItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#15171E] transition-colors cursor-pointer"
                onClick={() => toggleGoalCompletion(item.id)}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  {item.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span
                  className={`text-sm transition-all ${
                    item.completed
                      ? 'text-gray-400 dark:text-gray-500 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintGoalsTracker;
