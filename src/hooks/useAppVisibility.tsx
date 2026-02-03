import React, { useEffect, useRef, useCallback } from "react";

// Time in milliseconds before the app should refresh (20 minutes)
const REFRESH_THRESHOLD = 20 * 60 * 1000;

/**
 * Hook to manage app visibility and prevent unnecessary refreshes
 * when users briefly switch away from the app on mobile
 */
export function useAppVisibility() {
  const hiddenTimeRef = useRef<number | null>(null);
  const wasHiddenRef = useRef(false);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // App is being hidden - record the time
      hiddenTimeRef.current = Date.now();
      wasHiddenRef.current = true;
      
      // Save current scroll position for all scrollable elements
      const scrollPositions: Record<string, number> = {};
      document.querySelectorAll('[data-scroll-persist]').forEach((el, index) => {
        scrollPositions[`scroll-${index}`] = (el as HTMLElement).scrollTop;
      });
      
      // Save main window scroll
      scrollPositions['window'] = window.scrollY;
      
      sessionStorage.setItem('app-scroll-positions', JSON.stringify(scrollPositions));
      sessionStorage.setItem('app-last-route', window.location.pathname);
      sessionStorage.setItem('app-hidden-time', Date.now().toString());
    } else {
      // App is becoming visible again
      if (wasHiddenRef.current && hiddenTimeRef.current) {
        const hiddenDuration = Date.now() - hiddenTimeRef.current;
        
        if (hiddenDuration < REFRESH_THRESHOLD) {
          // Less than 20 minutes - restore scroll positions
          try {
            const savedPositions = sessionStorage.getItem('app-scroll-positions');
            if (savedPositions) {
              const positions = JSON.parse(savedPositions);
              
              // Restore window scroll
              if (positions['window'] !== undefined) {
                requestAnimationFrame(() => {
                  window.scrollTo(0, positions['window']);
                });
              }
              
              // Restore other scrollable elements
              document.querySelectorAll('[data-scroll-persist]').forEach((el, index) => {
                const savedScroll = positions[`scroll-${index}`];
                if (savedScroll !== undefined) {
                  requestAnimationFrame(() => {
                    (el as HTMLElement).scrollTop = savedScroll;
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error restoring scroll positions:', e);
          }
        } else {
          // More than 20 minutes - clear saved state and allow refresh
          sessionStorage.removeItem('app-scroll-positions');
          sessionStorage.removeItem('app-last-route');
          sessionStorage.removeItem('app-hidden-time');
        }
      }
      
      wasHiddenRef.current = false;
      hiddenTimeRef.current = null;
    }
  }, []);

  // Handle page freeze/resume events (more reliable on mobile)
  const handleFreeze = useCallback(() => {
    hiddenTimeRef.current = Date.now();
    sessionStorage.setItem('app-hidden-time', Date.now().toString());
  }, []);

  const handleResume = useCallback(() => {
    const savedTime = sessionStorage.getItem('app-hidden-time');
    if (savedTime) {
      const hiddenDuration = Date.now() - parseInt(savedTime, 10);
      
      if (hiddenDuration >= REFRESH_THRESHOLD) {
        // More than 20 minutes - allow natural refresh behavior
        sessionStorage.removeItem('app-scroll-positions');
        sessionStorage.removeItem('app-last-route');
        sessionStorage.removeItem('app-hidden-time');
      }
    }
  }, []);

  useEffect(() => {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for page lifecycle events (better mobile support)
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    
    // Also handle beforeunload for saving state
    const handleBeforeUnload = () => {
      if (!wasHiddenRef.current) {
        // Only clear if not hidden (actual page close vs app switch)
        sessionStorage.setItem('app-hidden-time', Date.now().toString());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleVisibilityChange, handleFreeze, handleResume]);

  return {
    wasRecentlyHidden: wasHiddenRef.current,
  };
}
