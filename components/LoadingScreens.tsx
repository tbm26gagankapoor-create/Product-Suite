import React from 'react';
import { Loader2, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { VulcanIcon } from './VulcanLogo';

// Branded App Loading Screen - shown during initial auth check
export const AppLoadingScreen: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
    <div className="flex flex-col items-center gap-6">
      {/* Logo with gradient animation */}
      <div className="relative">
        <VulcanIcon size={56} color="currentColor" className="text-blue-600 dark:text-blue-400 animate-pulse" />
        {/* Spinning ring around logo */}
        <div className="absolute inset-0 -m-2">
          <div className="w-[72px] h-[72px] rounded-full border-2 border-transparent border-t-blue-500/50 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
      </div>

      {/* App name */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">
          Vulcan
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Loading your workspace...
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// Data Loading Screen - shown when fetching project data
interface DataLoadingScreenProps {
  message?: string;
  showProgress?: boolean;
}

export const DataLoadingScreen: React.FC<DataLoadingScreenProps> = ({
  message = 'Loading your data...',
  showProgress = false,
}) => (
  <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0B0C0E] p-8">
    <div className="flex flex-col items-center gap-6 max-w-sm text-center">
      {/* Animated loader */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-gray-100 dark:border-[#1F2128]" />
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
      </div>

      {/* Message */}
      <div>
        <p className="text-sm font-medium text-[#172B4D] dark:text-white">
          {message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          This may take a moment
        </p>
      </div>

      {/* Optional progress indicator */}
      {showProgress && (
        <div className="w-48 h-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-loading-progress" />
        </div>
      )}
    </div>
  </div>
);

// Connection Error Screen
interface ConnectionErrorScreenProps {
  error: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const ConnectionErrorScreen: React.FC<ConnectionErrorScreenProps> = ({
  error,
  onRetry,
  isRetrying = false,
}) => (
  <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0B0C0E] p-8">
    <div className="flex flex-col items-center gap-6 max-w-md text-center">
      {/* Error icon */}
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-red-500" />
      </div>

      {/* Error message */}
      <div>
        <h2 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">
          Connection Error
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || 'Unable to connect to the server. Please check your internet connection and try again.'}
        </p>
      </div>

      {/* Retry button */}
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="flex items-center gap-2 px-6 py-3 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRetrying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Reconnecting...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Try Again
          </>
        )}
      </button>

      {/* Help text */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        If the problem persists, please contact support
      </p>
    </div>
  </div>
);

// Inline Loading Spinner - for smaller loading states within components
interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-blue-500`} />
      {text && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{text}</span>
      )}
    </div>
  );
};

// Full Page Overlay Loader - for blocking operations
interface OverlayLoaderProps {
  message?: string;
  isVisible: boolean;
}

export const OverlayLoader: React.FC<OverlayLoaderProps> = ({
  message = 'Processing...',
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#15171E] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-100 dark:border-[#1F2128]" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-[#172B4D] dark:text-white text-center">
          {message}
        </p>
      </div>
    </div>
  );
};

// Button Loading State - consistent loading state for buttons
interface ButtonLoaderProps {
  text?: string;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({ text }) => (
  <span className="flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    {text && <span>{text}</span>}
  </span>
);

// Skeleton Shimmer Effect - CSS class for wave animation
export const skeletonWaveStyles = `
  @keyframes skeleton-wave {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton-wave {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: skeleton-wave 1.5s ease-in-out infinite;
  }

  .dark .skeleton-wave {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: skeleton-wave 1.5s ease-in-out infinite;
  }

  @keyframes loading-progress {
    0% {
      width: 0%;
      margin-left: 0%;
    }
    50% {
      width: 60%;
      margin-left: 20%;
    }
    100% {
      width: 0%;
      margin-left: 100%;
    }
  }

  .animate-loading-progress {
    animation: loading-progress 2s ease-in-out infinite;
  }
`;

export default {
  AppLoadingScreen,
  DataLoadingScreen,
  ConnectionErrorScreen,
  InlineLoader,
  OverlayLoader,
  ButtonLoader,
};
