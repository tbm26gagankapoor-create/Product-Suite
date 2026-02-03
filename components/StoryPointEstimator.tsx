
import React from 'react';

interface StoryPointEstimatorProps {
  currentPoints?: number;
  onPointsChange: (points: number) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

const StoryPointEstimator: React.FC<StoryPointEstimatorProps> = ({
  currentPoints,
  onPointsChange,
  size = 'md',
  showLabel = false
}) => {
  const buttonSize = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div className="flex items-center gap-1">
      {showLabel && (
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mr-1 uppercase tracking-wider">
          Points
        </span>
      )}
      {FIBONACCI_POINTS.map((points) => (
        <button
          key={points}
          onClick={(e) => {
            e.stopPropagation();
            onPointsChange(points);
          }}
          className={`${buttonSize} rounded-md font-bold transition-all ${
            currentPoints === points
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
          title={`${points} story point${points !== 1 ? 's' : ''}`}
        >
          {points}
        </button>
      ))}
      {currentPoints && !FIBONACCI_POINTS.includes(currentPoints) && (
        <span className="ml-1 px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-xs font-bold">
          {currentPoints}
        </span>
      )}
    </div>
  );
};

// Inline variant for showing on hover
export const InlineStoryPointEstimator: React.FC<StoryPointEstimatorProps & { visible?: boolean }> = ({
  currentPoints,
  onPointsChange,
  visible = true
}) => {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-0.5 p-1 bg-white dark:bg-[#15171E] rounded-lg shadow-lg border border-gray-200 dark:border-[#2D2F36] animate-in fade-in slide-in-from-bottom-2">
      {FIBONACCI_POINTS.slice(0, 6).map((points) => (
        <button
          key={points}
          onClick={(e) => {
            e.stopPropagation();
            onPointsChange(points);
          }}
          className={`w-7 h-7 rounded text-[11px] font-bold transition-all ${
            currentPoints === points
              ? 'bg-blue-500 text-white'
              : 'bg-gray-50 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 hover:bg-blue-500 hover:text-white'
          }`}
        >
          {points}
        </button>
      ))}
    </div>
  );
};

export default StoryPointEstimator;
