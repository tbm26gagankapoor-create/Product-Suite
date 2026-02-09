import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg',
  ghost: 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128]',
  icon: 'bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] font-bold',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-medium',
  outline: 'border border-gray-200 dark:border-[#2D2F36] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2128] font-medium',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-2.5 text-sm rounded-xl gap-2',
};

const iconOnlySizeClasses: Record<string, string> = {
  sm: 'p-1 rounded-md',
  md: 'p-1.5 rounded-lg',
  lg: 'p-2 rounded-xl',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const isIconOnly = !children && icon;
  const sizeClass = isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size];

  return (
    <button
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};

export default Button;
