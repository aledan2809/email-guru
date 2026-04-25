'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type NewEmailNotification = {
  id: string;
  email: string;
  messageId: string;
  threadId: string;
  timestamp: string;
  classified?: boolean;
  category?: string;
};

export type NotificationState = {
  notifications: NewEmailNotification[];
  unreadCount: number;
  lastChecked: string | null;
};

export function useNotifications(enabled = true, pollInterval = 30000) {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    lastChecked: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedRef = useRef<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (lastCheckedRef.current) {
        params.set('since', lastCheckedRef.current);
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const newNotifications = data.data.notifications as NewEmailNotification[];

        setState((prev) => {
          // Merge new notifications with existing, avoiding duplicates
          const existingIds = new Set(prev.notifications.map((n) => n.id));
          const uniqueNew = newNotifications.filter((n) => !existingIds.has(n.id));

          return {
            notifications: [...prev.notifications, ...uniqueNew],
            unreadCount: prev.unreadCount + uniqueNew.length,
            lastChecked: data.data.lastChecked,
          };
        });

        lastCheckedRef.current = data.data.lastChecked;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const clearNotifications = useCallback(async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setState({
        notifications: [],
        unreadCount: 0,
        lastChecked: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  const markAsSeen = useCallback(() => {
    setState((prev) => ({
      ...prev,
      unreadCount: 0,
    }));
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== notificationId),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  // Start/stop polling
  useEffect(() => {
    if (!enabled) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    const poll = () => {
      fetchNotifications();
      pollTimeoutRef.current = setTimeout(poll, pollInterval);
    };

    // Initial fetch
    fetchNotifications();

    // Start polling
    pollTimeoutRef.current = setTimeout(poll, pollInterval);

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [enabled, pollInterval, fetchNotifications]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading,
    error,
    fetchNotifications,
    clearNotifications,
    markAsSeen,
    dismissNotification,
  };
}

// Hook for watch subscription management
export function useGmailWatch() {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gmail/watch');
      const data = await response.json();

      if (response.ok && data.success) {
        setWatching(data.data.watching);
        setExpiration(data.data.expirationDate || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setLoading(false);
    }
  }, []);

  const startWatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gmail/watch', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        setWatching(true);
        setExpiration(data.data.expirationDate);
        return true;
      } else {
        setError(data.error || 'Failed to start watch');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start watch');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopWatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gmail/watch', { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        setWatching(false);
        setExpiration(null);
        return true;
      } else {
        setError(data.error || 'Failed to stop watch');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop watch');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    watching,
    loading,
    error,
    expiration,
    startWatch,
    stopWatch,
    checkStatus,
  };
}
