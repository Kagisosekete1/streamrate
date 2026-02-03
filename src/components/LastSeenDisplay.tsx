import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock } from "lucide-react";

interface LastSeenDisplayProps {
  userId: string;
  className?: string;
}

export const LastSeenDisplay = ({ userId, className = "" }: LastSeenDisplayProps) => {
  const { user } = useAuth();
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>("everyone");
  const [isOnline, setIsOnline] = useState(false);
  const [canView, setCanView] = useState(false);

  useEffect(() => {
    const fetchLastSeen = async () => {
      // Fetch the target user's last seen and visibility settings
      const { data: profileData } = await supabase
        .from("profiles")
        .select("last_seen, last_seen_visibility")
        .eq("id", userId)
        .maybeSingle();

      if (!profileData) return;

      const userVisibility = (profileData as any).last_seen_visibility || "everyone";
      const userLastSeen = (profileData as any).last_seen;
      
      setVisibility(userVisibility);
      setLastSeen(userLastSeen);

      // Check if user is online (active within last 5 minutes)
      if (userLastSeen) {
        const lastSeenDate = new Date(userLastSeen);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        setIsOnline(lastSeenDate > fiveMinutesAgo);
      }

      // Determine if current user can view last seen
      if (userVisibility === "off") {
        setCanView(false);
      } else if (userVisibility === "everyone") {
        setCanView(true);
      } else if (userVisibility === "followers" && user) {
        // Check if current user follows target user
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle();
        
        setCanView(!!followData || user.id === userId);
      } else if (user?.id === userId) {
        // Users can always see their own last seen
        setCanView(true);
      }
    };

    fetchLastSeen();
  }, [userId, user]);

  if (!canView || !lastSeen) {
    return null;
  }

  const lastSeenDate = new Date(lastSeen);

  if (isOnline) {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-500 font-medium">Online now</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Clock className="w-3 h-3" />
      <span>
        Last seen {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
      </span>
    </div>
  );
};
