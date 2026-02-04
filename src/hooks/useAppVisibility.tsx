import React from "react";
import { supabase } from "@/integrations/supabase/client";

const REFRESH_THRESHOLD = 20 * 60 * 1000;

export function useAppVisibility() {
  const hiddenTimeRef = React.useRef<number | null>(null);
  const wasHiddenRef = React.useRef(false);
  const lastSeenUpdateIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const updateLastSeen = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", session.user.id);
  }, []);

  const handleVisibilityChange = React.useCallback(async () => {
    if (document.hidden) {
      await updateLastSeen();
      
      hiddenTimeRef.current = Date.now();
      wasHiddenRef.current = true;
      
      if (lastSeenUpdateIntervalRef.current) {
        clearInterval(lastSeenUpdateIntervalRef.current);
        lastSeenUpdateIntervalRef.current = null;
      }
      
      const scrollPositions: Record<string, number> = {};
      document.querySelectorAll('[data-scroll-persist]').forEach((el, index) => {
        scrollPositions[`scroll-${index}`] = (el as HTMLElement).scrollTop;
      });
      
      scrollPositions['window'] = window.scrollY;
      
      sessionStorage.setItem('app-scroll-positions', JSON.stringify(scrollPositions));
      sessionStorage.setItem('app-last-route', window.location.pathname);
      sessionStorage.setItem('app-hidden-time', Date.now().toString());
    } else {
      await updateLastSeen();
      
      if (!lastSeenUpdateIntervalRef.current) {
        lastSeenUpdateIntervalRef.current = setInterval(updateLastSeen, 2 * 60 * 1000);
      }
      
      if (wasHiddenRef.current && hiddenTimeRef.current) {
        const hiddenDuration = Date.now() - hiddenTimeRef.current;
        
        if (hiddenDuration < REFRESH_THRESHOLD) {
          try {
            const savedPositions = sessionStorage.getItem('app-scroll-positions');
            if (savedPositions) {
              const positions = JSON.parse(savedPositions);
              
              if (positions['window'] !== undefined) {
                requestAnimationFrame(() => {
                  window.scrollTo(0, positions['window']);
                });
              }
              
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
          sessionStorage.removeItem('app-scroll-positions');
          sessionStorage.removeItem('app-last-route');
          sessionStorage.removeItem('app-hidden-time');
        }
      }
      
      wasHiddenRef.current = false;
      hiddenTimeRef.current = null;
    }
  }, [updateLastSeen]);

  const handleFreeze = React.useCallback(async () => {
    await updateLastSeen();
    hiddenTimeRef.current = Date.now();
    sessionStorage.setItem('app-hidden-time', Date.now().toString());
  }, [updateLastSeen]);

  const handleResume = React.useCallback(async () => {
    await updateLastSeen();
    
    const savedTime = sessionStorage.getItem('app-hidden-time');
    if (savedTime) {
      const hiddenDuration = Date.now() - parseInt(savedTime, 10);
      
      if (hiddenDuration >= REFRESH_THRESHOLD) {
        sessionStorage.removeItem('app-scroll-positions');
        sessionStorage.removeItem('app-last-route');
        sessionStorage.removeItem('app-hidden-time');
      }
    }
  }, [updateLastSeen]);

  React.useEffect(() => {
    updateLastSeen();
    
    lastSeenUpdateIntervalRef.current = setInterval(updateLastSeen, 2 * 60 * 1000);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    
    const handleBeforeUnload = async () => {
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