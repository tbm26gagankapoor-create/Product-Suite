import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-4 py-3 text-sm rounded-xl',
};

const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  inputSize = 'md',
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors ${sizeClasses[inputSize]} ${icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default Input;
