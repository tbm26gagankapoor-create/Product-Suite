import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatar?: string;
  color?: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  className?: string;
  variant?: 'default' | 'chip' | 'ghost';
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  renderOption,
  className,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  let buttonStyles = "";
  if (variant === 'chip') {
      buttonStyles = "w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-[#4B4D59] rounded-md px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 gap-2 shadow-sm transition-all";
  } else if (variant === 'ghost') {
      buttonStyles = "bg-gray-50 dark:bg-[#15171E] hover:bg-gray-100 dark:hover:bg-[#1A1D26] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 gap-3 w-full transition-colors";
  } else {
      buttonStyles = "w-full bg-gray-50 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:border-blue-500 hover:bg-gray-100 dark:hover:bg-[#2D2F36]/80";
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 block uppercase tracking-wider">
              {label}
          </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between focus:outline-none ${buttonStyles}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            renderOption ? renderOption(selectedOption) : (
              <>
                {selectedOption.icon && <span className={selectedOption.color}>{selectedOption.icon}</span>}
                {selectedOption.avatar && <img src={selectedOption.avatar} className="w-4 h-4 rounded-full" />}
                <span className="truncate">{selectedOption.label}</span>
              </>
            )
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            top: coords.top,
            left: coords.left,
            width: Math.max(coords.width, 220),
            zIndex: 9999
          }}
          className="fixed bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col ring-1 ring-black/5"
        >
          {options.length > 5 && (
            <div className="p-2 border-b border-gray-100 dark:border-[#2D2F36]">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg py-1.5 pl-9 pr-3 text-xs focus:ring-0 text-[#172B4D] dark:text-white placeholder-gray-500"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar p-1.5">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 last:mb-0 ${selectedOption?.value === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-[#172B4D] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2D2F36]'}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {option.icon && <span className={option.color}>{option.icon}</span>}
                  {option.avatar && <img src={option.avatar} className="w-5 h-5 rounded-full" />}
                  <span>{option.label}</span>
                </div>
                {selectedOption?.value === option.value && <Check size={14} />}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No options found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Select;
