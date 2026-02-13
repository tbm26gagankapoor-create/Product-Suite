import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface FallbackNotificationProps {
  show: boolean;
  type: 'fallback' | 'success' | 'error';
  primaryProvider: string;
  fallbackProvider?: string;
  onClose: () => void;
}

const FallbackNotification: React.FC<FallbackNotificationProps> = ({
  show,
  type,
  primaryProvider,
  fallbackProvider,
  onClose
}) => {
  React.useEffect(() => {
    if (show) {
      // Auto-close after 5 seconds
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const config = {
    fallback: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-900 dark:text-amber-200',
      title: 'Provider Switched',
      message: `${primaryProvider} unavailable. Switched to ${fallbackProvider}.`
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-900 dark:text-emerald-200',
      title: 'Success',
      message: `Generated successfully with ${primaryProvider}.`
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-200',
      title: 'All Providers Failed',
      message: 'Unable to generate content. Please try again later.'
    }
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        ${currentConfig.bgColor}
        ${currentConfig.borderColor}
        border rounded-lg shadow-lg
        p-4 max-w-md
        animate-slideInFromRight
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${currentConfig.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${currentConfig.textColor} mb-1`}>
            {currentConfig.title}
          </h4>
          <p className={`text-xs ${currentConfig.textColor} opacity-90`}>
            {currentConfig.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`${currentConfig.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close notification"
        >
          <XCircle size={16} />
        </button>
      </div>
    </div>
  );
};

export default FallbackNotification;
