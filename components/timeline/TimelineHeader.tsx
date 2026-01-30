import React from 'react';
import { getMonthSpans, isWeekend, isToday, getWeekdayLetter, TimeScale } from '../../utils/timelineUtils';

interface TimelineHeaderProps {
  dates: Date[];
  colWidth: number;
  scale: TimeScale;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ dates, colWidth, scale }) => {
  const monthSpans = getMonthSpans(dates);

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
      {/* Month Header Row */}
      <div className="flex border-b border-gray-100 dark:border-[#1F2128]/50">
        {monthSpans.map((span, index) => (
          <div
            key={`${span.month}-${span.year}-${index}`}
            className="flex-shrink-0 flex items-center justify-center py-2 border-r border-gray-100 dark:border-[#1F2128]/50 bg-gray-50/50 dark:bg-[#15171E]/30"
            style={{ width: span.span * colWidth }}
          >
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {span.month} {span.year}
            </span>
          </div>
        ))}
      </div>

      {/* Day Header Row */}
      <div className="flex">
        {dates.map((date, i) => {
          const weekend = isWeekend(date);
          const today = isToday(date);

          return (
            <div
              key={i}
              className={`flex-shrink-0 border-r border-gray-100 dark:border-[#1F2128]/50 flex flex-col items-center justify-center py-2 transition-colors
                ${weekend ? 'bg-gray-50/80 dark:bg-[#15171E]/60' : ''}
                ${today ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
              style={{ width: colWidth }}
            >
              {scale === 'day' && (
                <>
                  <span className={`text-sm font-bold leading-tight ${today ? 'text-purple-600 dark:text-purple-400' : 'text-[#172B4D] dark:text-white'}`}>
                    {date.getDate()}
                  </span>
                  <span className={`text-[9px] uppercase font-medium ${today ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {getWeekdayLetter(date)}
                  </span>
                </>
              )}
              {scale === 'week' && (
                <>
                  <span className={`text-[10px] font-bold leading-tight ${today ? 'text-purple-600 dark:text-purple-400' : 'text-[#172B4D] dark:text-white'}`}>
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-[9px] ${today ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    Week {Math.ceil(date.getDate() / 7)}
                  </span>
                </>
              )}
              {scale === 'month' && (
                <span className={`text-xs font-bold ${today ? 'text-purple-600 dark:text-purple-400' : 'text-[#172B4D] dark:text-white'}`}>
                  {date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineHeader;
