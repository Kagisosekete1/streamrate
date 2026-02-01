import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channelRef, setChannelRef] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state: PresenceState = channel.presenceState();
        const online = new Set<string>();
        Object.keys(state).forEach((key) => {
          online.add(key);
        });
        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannelRef(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const isOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  return { onlineUsers, isOnline };
};

// Component for showing online indicator
import React from "react";
import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  userId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  userId,
  className,
  size = "sm",
}) => {
  const { isOnline } = useOnlinePresence();
  const online = isOnline(userId);

  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div
      className={cn(
        "rounded-full border-2 border-background transition-colors duration-300",
        sizeClasses[size],
        online ? "bg-green-500" : "bg-gray-400",
        className
      )}
      title={online ? "Online" : "Offline"}
    />
  );
};
