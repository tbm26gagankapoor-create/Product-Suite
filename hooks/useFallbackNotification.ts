import { useState, useCallback } from 'react';

export type NotificationType = 'fallback' | 'success' | 'error';

export interface NotificationState {
  show: boolean;
  type: NotificationType;
  primaryProvider: string;
  fallbackProvider?: string;
}

/**
 * Hook to manage fallback notification state
 */
export const useFallbackNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'success',
    primaryProvider: '',
    fallbackProvider: undefined
  });

  const showFallbackNotification = useCallback((
    type: NotificationType,
    primaryProvider: string,
    fallbackProvider?: string
  ) => {
    setNotification({
      show: true,
      type,
      primaryProvider,
      fallbackProvider
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  return {
    notification,
    showFallbackNotification,
    hideNotification
  };
};
