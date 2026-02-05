/**
 * Global Error Context
 * Provides centralized error handling and toast notifications across the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ApiError, ErrorType } from '../lib/httpClient';

// Toast notification types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorContextType {
  // Toast notifications
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;

  // Error handling
  handleError: (error: unknown, context?: string) => void;
  handleApiError: (error: ApiError, context?: string) => void;

  // Success notifications
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Generate unique IDs for toasts
let toastId = 0;
const generateToastId = () => `toast-${++toastId}`;

// Default durations for different toast types
const DEFAULT_DURATIONS: Record<Toast['type'], number> = {
  success: 3000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// User-friendly messages for different error types
const ERROR_MESSAGES: Record<ErrorType, string> = {
  NETWORK: 'Unable to connect to the server. Please check your internet connection.',
  AUTH: 'Your session has expired. Please sign in again.',
  VALIDATION: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER: 'Something went wrong on our end. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auto-dismiss toasts after duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    toasts.forEach((toast) => {
      if (toast.duration !== 0) {
        const duration = toast.duration || DEFAULT_DURATIONS[toast.type];
        const timer = setTimeout(() => {
          dismissToast(toast.id);
        }, duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateToastId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const handleApiError = useCallback((error: ApiError, context?: string) => {
    const prefix = context ? `${context}: ` : '';

    // Handle auth errors specially - may need to redirect to login
    if (error.type === 'AUTH') {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: error.message || ERROR_MESSAGES.AUTH,
        duration: 0, // Don't auto-dismiss auth errors
        action: {
          label: 'Sign In',
          onClick: () => {
            // Clear auth data and redirect to login
            localStorage.removeItem('vulcan_token');
            localStorage.removeItem('vulcan_user');
            window.location.href = '/login';
          },
        },
      });
      return;
    }

    // Get user-friendly message
    const friendlyMessage = ERROR_MESSAGES[error.type] || error.message;

    showToast({
      type: 'error',
      title: prefix + (error.type === 'VALIDATION' ? 'Validation Error' : 'Error'),
      message: error.message !== friendlyMessage ? error.message : friendlyMessage,
    });

    // Log error for debugging in development
    if (import.meta.env.DEV) {
      console.error('[ErrorContext]', context || 'API Error', error);
    }
  }, [showToast]);

  const handleError = useCallback((error: unknown, context?: string) => {
    if (error instanceof ApiError) {
      handleApiError(error, context);
      return;
    }

    // Handle generic errors
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    showToast({
      type: 'error',
      title: context ? `${context}: Error` : 'Error',
      message,
    });

    // Log for debugging
    if (import.meta.env.DEV) {
      console.error('[ErrorContext]', context || 'Error', error);
    }
  }, [handleApiError, showToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  return (
    <ErrorContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearAllToasts,
        handleError,
        handleApiError,
        showSuccess,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ErrorContext.Provider>
  );
};

// Toast UI Component
const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-fadeIn ${bgColors[toast.type]}`}
      role="alert"
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Hook to use error context
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

export default ErrorContext;
