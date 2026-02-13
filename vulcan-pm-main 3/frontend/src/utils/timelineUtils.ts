// Timeline Utility Module
// Constants, date helpers, and gradient colors for timeline views

export type TimeScale = 'day' | 'week' | 'month';

// Timeline dimension constants
export const TIMELINE_CONSTANTS = {
  DAY_WIDTH: 40,
  WEEK_WIDTH: 56,
  MONTH_WIDTH: 120,
  ROW_HEIGHT: 48,
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 60,
  MONTH_HEADER_HEIGHT: 28,
};

// Status-based gradient colors for task bars (soft, pastel multi-color)
export const TASK_GRADIENTS: Record<string, { from: string; via?: string; to: string; border: string }> = {
  done: { from: '#A8E8C8', via: '#8DD8B8', to: '#C8E8D8', border: '#7DC8A8' },      // Mint to seafoam
  testing: { from: '#F5D8A8', via: '#E8C8B8', to: '#F5C896', border: '#D8B888' },  // Honey to peach
  inprogress: { from: '#B8D8E8', via: '#A8C8E8', to: '#C8D8F5', border: '#98B8D8' }, // Sky to periwinkle
  blocked: { from: '#F5B8C8', via: '#E8A8B8', to: '#F5C8D8', border: '#D8A0B0' },   // Rose to blush
  idea: { from: '#D8C8E8', via: '#C8B8E8', to: '#E8D8F5', border: '#B8A8D8' },      // Lavender to lilac
  todo: { from: '#D8E0E8', via: '#C8D0D8', to: '#E0E8F0', border: '#B8C8D0' },      // Soft gray-blue
};

// Sprint status gradients (soft, muted palette)
export const SPRINT_GRADIENTS: Record<string, { from: string; to: string; border: string }> = {
  active: { from: '#7D9CB8', to: '#5C7B97', border: '#4A6986' },    // Soft steel blue
  planned: { from: '#9B8DC8', to: '#7A6BA8', border: '#695A97' },   // Soft lavender
  completed: { from: '#6B9E8D', to: '#4A7D6B', border: '#3D6B5A' }, // Soft sage green
};

// Get column width based on scale
export function getColWidth(scale: TimeScale): number {
  switch (scale) {
    case 'day': return TIMELINE_CONSTANTS.DAY_WIDTH;
    case 'week': return TIMELINE_CONSTANTS.WEEK_WIDTH;
    case 'month': return TIMELINE_CONSTANTS.MONTH_WIDTH;
  }
}

// Generate date range for timeline view
export function generateDateRange(startDate: Date, scale: TimeScale, count?: number): Date[] {
  const dates: Date[] = [];
  const defaultCount = scale === 'day' ? 30 : scale === 'week' ? 12 : 6;
  const total = count || defaultCount;

  for (let i = 0; i < total; i++) {
    const d = new Date(startDate);
    if (scale === 'day') {
      d.setDate(startDate.getDate() + i);
    } else if (scale === 'week') {
      d.setDate(startDate.getDate() + (i * 7));
    } else {
      d.setMonth(startDate.getMonth() + i);
    }
    dates.push(d);
  }

  return dates;
}

// Get month spans for multi-level header
export interface MonthSpan {
  month: string;
  year: number;
  startIndex: number;
  span: number;
}

export function getMonthSpans(dates: Date[]): MonthSpan[] {
  if (dates.length === 0) return [];

  const spans: MonthSpan[] = [];
  let currentMonth = dates[0].getMonth();
  let currentYear = dates[0].getFullYear();
  let startIndex = 0;
  let span = 0;

  dates.forEach((date, index) => {
    const month = date.getMonth();
    const year = date.getFullYear();

    if (month === currentMonth && year === currentYear) {
      span++;
    } else {
      spans.push({
        month: new Date(currentYear, currentMonth).toLocaleDateString(undefined, { month: 'long' }),
        year: currentYear,
        startIndex,
        span,
      });
      currentMonth = month;
      currentYear = year;
      startIndex = index;
      span = 1;
    }
  });

  // Push the last span
  spans.push({
    month: new Date(currentYear, currentMonth).toLocaleDateString(undefined, { month: 'long' }),
    year: currentYear,
    startIndex,
    span,
  });

  return spans;
}

// Check if a date is a weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Get today's index in the date array
export function getTodayIndex(dates: Date[]): number | null {
  const todayStr = new Date().toDateString();
  const index = dates.findIndex(d => d.toDateString() === todayStr);
  return index >= 0 ? index : null;
}

// Calculate bar position and width
export function calculateBarPosition(
  startDate: string,
  endDate: string,
  viewStart: Date,
  colWidth: number
): { left: number; width: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTimeStart = start.getTime() - viewStart.getTime();
  const startOffsetDays = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));

  const durationTime = end.getTime() - start.getTime();
  const durationDays = Math.max(1, Math.ceil(durationTime / (1000 * 60 * 60 * 24)) + 1);

  return {
    left: startOffsetDays * colWidth,
    width: durationDays * colWidth,
  };
}

// Format date for display
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Get weekday letter (M, T, W, T, F, S, S)
export function getWeekdayLetter(date: Date): string {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return days[date.getDay()];
}

// Get gradient style for a status
export function getGradientStyle(columnId: string): React.CSSProperties {
  const gradient = TASK_GRADIENTS[columnId] || TASK_GRADIENTS.todo;
  return {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
    borderColor: gradient.border,
  };
}

// Get sprint gradient style
export function getSprintGradientStyle(status: string): React.CSSProperties {
  const gradient = SPRINT_GRADIENTS[status] || SPRINT_GRADIENTS.planned;
  return {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
    borderColor: gradient.border,
  };
}
