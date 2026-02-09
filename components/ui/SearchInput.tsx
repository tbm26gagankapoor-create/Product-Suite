import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  iconSize?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({
  iconSize = 16,
  className = '',
  ...props
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={iconSize}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
        {...props}
      />
    </div>
  );
};

export default SearchInput;
