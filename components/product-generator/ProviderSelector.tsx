import React from 'react';
import { Bot, Check, ChevronDown, Loader2 } from 'lucide-react';

interface ProviderSelectorProps {
  availableProviders: any[];
  selectedProvider: any | null;
  onProviderChange: (provider: any) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  availableProviders,
  selectedProvider,
  onProviderChange,
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Hide selector if only one provider available
  if (availableProviders.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        AI Provider
      </label>

      {/* Provider Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          w-full px-3 py-2.5 rounded-lg border
          bg-white dark:bg-[#0B0C0E]
          border-gray-200 dark:border-[#2D2F36]
          text-left text-sm
          flex items-center justify-between gap-2
          transition-all
          ${disabled || isLoading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-300 dark:hover:border-[#3D3F46] cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isLoading ? (
            <Loader2 size={14} className="text-gray-400 animate-spin" />
          ) : (
            <Bot size={14} className="text-blue-500 flex-shrink-0" />
          )}

          {selectedProvider ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#172B4D] dark:text-white font-medium truncate">
                {selectedProvider.display_name}
              </span>
              {selectedProvider.is_default && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                  Default
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Select AI Provider...</span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !isLoading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => {
                  onProviderChange(provider);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2.5 text-left
                  flex items-center gap-2
                  transition-colors
                  ${selectedProvider?.id === provider.id
                    ? 'bg-blue-50 dark:bg-blue-500/10'
                    : 'hover:bg-gray-50 dark:hover:bg-[#1F2128]'
                  }
                `}
              >
                {/* Check Icon */}
                <div className="w-4 h-4 flex-shrink-0">
                  {selectedProvider?.id === provider.id && (
                    <Check size={14} className="text-blue-600 dark:text-blue-400" />
                  )}
                </div>

                {/* Provider Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#172B4D] dark:text-white truncate">
                      {provider.display_name}
                    </span>
                    {provider.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                        Default
                      </span>
                    )}
                  </div>

                  {provider.config?.description && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {provider.config.description}
                    </p>
                  )}

                  {provider.config?.default_model && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
                      {provider.config.default_model}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Helper Text */}
      {selectedProvider?.config?.description && (
        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          {selectedProvider.config.description}
        </p>
      )}
    </div>
  );
};

export default ProviderSelector;
