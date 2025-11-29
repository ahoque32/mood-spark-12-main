'use client';

import { useEffect } from 'react';
import { getBrowserTracker } from '@/lib/services/browser-tracker';
import { useAuth } from '@/hooks/useAuth';

export function BrowserTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize browser tracking
    const tracker = getBrowserTracker();
    
    // Start tracking with user ID if available
    tracker.initialize(user?.id).catch(error => {
      console.error('Failed to initialize browser tracking:', error);
    });

    // No cleanup - tracker persists across navigation
  }, [user?.id]);

  return <>{children}</>;
}