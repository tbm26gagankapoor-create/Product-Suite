import React from 'react';

interface TodayIndicatorProps {
  leftPosition: number;
  height: number;
  showLabel?: boolean;
}

const TodayIndicator: React.FC<TodayIndicatorProps> = ({
  leftPosition,
  height,
  showLabel = true
}) => {
  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{ left: leftPosition, height }}
    >
      {/* Today label badge */}
      {showLabel && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-purple-500/30 whitespace-nowrap">
          Today
        </div>
      )}

      {/* Top marker dot */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50 border-2 border-white dark:border-[#0B0C0E]" />

      {/* Dashed vertical line */}
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 w-px border-l-2 border-dashed border-purple-500/60"
        style={{ height: height - 32 }}
      />
    </div>
  );
};

export default TodayIndicator;
