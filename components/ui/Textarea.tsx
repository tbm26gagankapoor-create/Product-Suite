import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
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
      <textarea
        className={`w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 resize-none transition-colors ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default Textarea;
