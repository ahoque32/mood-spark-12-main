import { useEffect, useState } from 'react';

interface CalendarStatus {
  isConnected: boolean;
  provider: string | null;
  lastSync: number;
  eventCount: number;
  events?: any[];
  stats?: any;
}

export function useCalendarTracking() {
  const [status, setStatus] = useState<CalendarStatus>({
    isConnected: false,
    provider: null,
    lastSync: 0,
    eventCount: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(prev => ({
          ...prev,
          isConnected: data.isConnected,
          provider: data.isConnected ? 'google' : null,
          lastSync: data.isConnected ? Date.now() : 0
        }));
      }
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const fetchEvents = async (days: number = 7) => {
    if (!status.isConnected) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events?days=${days}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      
      setStatus(prev => ({
        ...prev,
        events: data.events,
        stats: data.stats,
        eventCount: data.events?.length || 0,
        lastSync: Date.now()
      }));

      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch calendar events:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError('Failed to initiate calendar connection');
      console.error('Failed to connect calendar:', err);
    }
  };

  const getMetrics = () => {
    return status.stats || null;
  };

  return {
    ...status,
    loading,
    error,
    fetchEvents,
    connectCalendar,
    checkConnectionStatus,
    getMetrics
  };
}