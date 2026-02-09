import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'pink';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400',
  primary: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};

export default Badge;
