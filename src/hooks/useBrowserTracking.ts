import { useEffect, useState } from 'react';
import { getBrowserTracker } from '@/lib/services/browser-tracker';
import { useAuth } from '@/hooks/useAuth';

interface TrackingStatus {
  isTracking: boolean;
  sessionId: string | null;
  metrics: any;
}

export function useBrowserTracking() {
  const [status, setStatus] = useState<TrackingStatus>({
    isTracking: false,
    sessionId: null,
    metrics: null
  });
  
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tracker = getBrowserTracker();
    
    // Initialize tracking with user ID if available
    tracker.initialize(user?.id).then(() => {
      const sessionInfo = tracker.getSessionInfo();
      setStatus({
        isTracking: true,
        sessionId: sessionInfo.sessionId,
        metrics: sessionInfo.metrics
      });
    });

    // Update metrics periodically
    const metricsInterval = setInterval(() => {
      const sessionInfo = tracker.getSessionInfo();
      setStatus(prev => ({
        ...prev,
        metrics: sessionInfo.metrics
      }));
    }, 5000); // Update every 5 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(metricsInterval);
      // Don't stop tracker on unmount - let it continue across navigation
    };
  }, [user?.id]);

  const stopTracking = () => {
    const tracker = getBrowserTracker();
    tracker.stop();
    setStatus({
      isTracking: false,
      sessionId: null,
      metrics: null
    });
  };

  const getMetrics = () => {
    const tracker = getBrowserTracker();
    return tracker.getMetrics();
  };

  return {
    ...status,
    stopTracking,
    getMetrics
  };
}