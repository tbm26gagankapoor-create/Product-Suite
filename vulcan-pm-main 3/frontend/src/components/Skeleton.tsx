import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

// Base Skeleton Component
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-[#1F2128]';

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Task Card Skeleton
export const TaskCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-white/5 p-4 space-y-3">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton width={60} height={12} variant="rounded" />
      <Skeleton width={40} height={16} variant="rounded" />
    </div>

    {/* Title */}
    <div className="space-y-2">
      <Skeleton height={14} />
      <Skeleton width="75%" height={14} />
    </div>

    {/* Tags */}
    <div className="flex gap-2">
      <Skeleton width={50} height={18} variant="rounded" />
      <Skeleton width={60} height={18} variant="rounded" />
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-white/5">
      <div className="flex items-center gap-2">
        <Skeleton width={14} height={14} variant="circular" />
        <Skeleton width={40} height={12} />
      </div>
      <Skeleton width={24} height={24} variant="circular" />
    </div>
  </div>
);

// Project Card Skeleton
export const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden">
    {/* Image placeholder */}
    <Skeleton height={120} variant="rectangular" />

    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} variant="rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton height={12} />
        <Skeleton width="80%" height={12} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={28} height={28} variant="circular" />
          ))}
        </div>
        <Skeleton width={60} height={20} variant="rounded" />
      </div>
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <div className="grid gap-4 px-6 py-4 border-b border-gray-100 dark:border-[#1F2128]" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} height={16} width={i === 0 ? '80%' : '60%'} />
    ))}
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-[#15171E] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2128]">
    <div className="flex justify-between items-start mb-4">
      <Skeleton width={40} height={40} variant="rounded" />
      <Skeleton width={16} height={16} variant="circular" />
    </div>
    <div className="space-y-2">
      <Skeleton width={60} height={32} />
      <Skeleton width={80} height={12} />
    </div>
  </div>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 px-6 py-4">
    <Skeleton width={10} height={10} variant="circular" />
    <div className="flex-1 space-y-2">
      <Skeleton width="70%" height={14} />
      <Skeleton width="40%" height={10} />
    </div>
    <Skeleton width={60} height={24} variant="rounded" />
  </div>
);

// Product Health Row Skeleton
export const ProductHealthRowSkeleton: React.FC = () => (
  <div className="grid grid-cols-12 px-8 py-5 items-center border-b border-gray-100 dark:border-[#1F2128]">
    <div className="col-span-5 flex items-center gap-4">
      <Skeleton width={40} height={40} variant="rounded" />
      <div className="space-y-2">
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={10} />
      </div>
    </div>
    <div className="col-span-2">
      <Skeleton width={60} height={20} variant="rounded" />
    </div>
    <div className="col-span-3">
      <Skeleton width={100} height={14} />
    </div>
    <div className="col-span-2 flex items-center justify-end gap-3">
      <Skeleton width={80} height={6} variant="rounded" />
      <Skeleton width={30} height={14} />
    </div>
  </div>
);

// Sidebar Skeleton
export const SidebarSkeleton: React.FC = () => (
  <div className="w-64 h-full bg-white dark:bg-[#0B0C0E] border-r border-gray-200 dark:border-[#1F2128] p-4 space-y-6">
    {/* Logo */}
    <div className="flex items-center gap-3 px-2">
      <Skeleton width={32} height={32} variant="rounded" />
      <Skeleton width={100} height={20} />
    </div>

    {/* Search */}
    <Skeleton height={40} variant="rounded" />

    {/* Nav Items */}
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton width={20} height={20} variant="rounded" />
          <Skeleton width={80} height={14} />
        </div>
      ))}
    </div>

    {/* Projects Section */}
    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-[#1F2128]">
      <Skeleton width={60} height={10} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton width={24} height={24} variant="rounded" />
          <Skeleton width={100} height={12} />
        </div>
      ))}
    </div>
  </div>
);

// Full Page Loading Skeleton
export const PageLoadingSkeleton: React.FC = () => (
  <div className="flex-1 p-8 space-y-8 bg-white dark:bg-[#0B0C0E]">
    {/* Header */}
    <div className="flex items-end justify-between pb-6 border-b border-gray-100 dark:border-[#1F2128]">
      <div className="space-y-2">
        <Skeleton width={250} height={28} />
        <Skeleton width={200} height={14} />
      </div>
      <div className="flex gap-3">
        <Skeleton width={120} height={40} variant="rounded" />
        <Skeleton width={100} height={40} variant="rounded" />
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Content */}
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Skeleton width={150} height={20} />
        {[1, 2, 3, 4].map((i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton width={120} height={20} />
        <div className="bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] p-6">
          <Skeleton height={200} />
        </div>
      </div>
    </div>
  </div>
);

// Kanban Column Skeleton
export const KanbanColumnSkeleton: React.FC = () => (
  <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-[#15171E] rounded-xl p-4">
    <div className="flex items-center justify-between mb-4">
      <Skeleton width={80} height={16} />
      <Skeleton width={24} height={24} variant="circular" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export default Skeleton;
