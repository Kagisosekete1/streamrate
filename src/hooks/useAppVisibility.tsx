import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Time in milliseconds before the app should refresh (20 minutes)
const REFRESH_THRESHOLD = 20 * 60 * 1000;

/**
 * Hook to manage app visibility and track real-time last seen
 * Updates last_seen when user leaves the app
 */
export function useAppVisibility() {
  const hiddenTimeRef = useRef<number | null>(null);
  const wasHiddenRef = useRef(false);
  const lastSeenUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update last_seen in the database
  const updateLastSeen = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", session.user.id);
  }, []);

  const handleVisibilityChange = useCallback(async () => {
    if (document.hidden) {
      // App is being hidden - update last_seen immediately
      await updateLastSeen();
      
      hiddenTimeRef.current = Date.now();
      wasHiddenRef.current = true;
      
      // Clear the periodic update when hidden
      if (lastSeenUpdateIntervalRef.current) {
        clearInterval(lastSeenUpdateIntervalRef.current);
        lastSeenUpdateIntervalRef.current = null;
      }
      
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
      // App is becoming visible again - update last_seen and start periodic updates
      await updateLastSeen();
      
      // Start periodic updates while visible (every 2 minutes)
      if (!lastSeenUpdateIntervalRef.current) {
        lastSeenUpdateIntervalRef.current = setInterval(updateLastSeen, 2 * 60 * 1000);
      }
      
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
  }, [updateLastSeen]);

  // Handle page freeze/resume events (more reliable on mobile)
  const handleFreeze = useCallback(async () => {
    await updateLastSeen();
    hiddenTimeRef.current = Date.now();
    sessionStorage.setItem('app-hidden-time', Date.now().toString());
  }, [updateLastSeen]);

  const handleResume = useCallback(async () => {
    await updateLastSeen();
    
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
  }, [updateLastSeen]);

  useEffect(() => {
    // Initial last_seen update when app loads
    updateLastSeen();
    
    // Start periodic updates while visible (every 2 minutes)
    lastSeenUpdateIntervalRef.current = setInterval(updateLastSeen, 2 * 60 * 1000);
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for page lifecycle events (better mobile support)
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    
    // Also handle beforeunload for saving state
    const handleBeforeUnload = async () => {
      // Update last_seen when page is about to close
      await updateLastSeen();
      
      if (!wasHiddenRef.current) {
        sessionStorage.setItem('app-hidden-time', Date.now().toString());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (lastSeenUpdateIntervalRef.current) {
        clearInterval(lastSeenUpdateIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleVisibilityChange, handleFreeze, handleResume, updateLastSeen]);

  return {
    wasRecentlyHidden: wasHiddenRef.current,
  };
}
