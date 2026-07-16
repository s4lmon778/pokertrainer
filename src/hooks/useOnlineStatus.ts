import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for detecting online/offline status.
 *
 * Returns the current online status and a flag indicating if the
 * app was previously offline (useful for showing "back online" toasts).
 *
 * Usage:
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner />;
 * ```
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Keep wasOffline true for 3 seconds so UI can show "back online" message
    setTimeout(() => setWasOffline(false), 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, isBackOnline: isOnline && wasOffline };
}
