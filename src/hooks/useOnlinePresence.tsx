import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

type PresenceListener = (users: Set<string>) => void;

// Many profile cards render OnlineIndicator at once. Share one channel across
// those components; adding presence handlers to an already subscribed channel
// throws in the current Supabase Realtime client.
const listeners = new Set<PresenceListener>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let channelUserId: string | null = null;
let listenerCount = 0;
let sharedOnlineUsers = new Set<string>();

function publishOnlineUsers(users: Set<string>) {
  sharedOnlineUsers = users;
  listeners.forEach((listener) => listener(new Set(users)));
}

function ensurePresenceChannel(userId: string) {
  if (channel && channelUserId === userId) return;

  if (channel) void channel.unsubscribe();
  sharedOnlineUsers = new Set();
  channelUserId = userId;

  const nextChannel = supabase.channel("online-users", {
    config: { presence: { key: userId } },
  });
  channel = nextChannel;

  nextChannel
    .on("presence", { event: "sync" }, () => {
      const state: PresenceState = nextChannel.presenceState();
      publishOnlineUsers(new Set(Object.keys(state)));
    })
    .on("presence", { event: "join" }, ({ key }) => {
      publishOnlineUsers(new Set([...sharedOnlineUsers, key]));
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      const users = new Set(sharedOnlineUsers);
      users.delete(key);
      publishOnlineUsers(users);
    })
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || channel !== nextChannel) return;

      await nextChannel.track({ user_id: userId, online_at: new Date().toISOString() });
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", userId);
    });
}

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(() => new Set(sharedOnlineUsers));

  useEffect(() => {
    if (!userId) {
      setOnlineUsers(new Set());
      return;
    }

    const listener: PresenceListener = (users) => setOnlineUsers(users);
    listeners.add(listener);
    listenerCount += 1;
    setOnlineUsers(new Set(sharedOnlineUsers));
    ensurePresenceChannel(userId);

    return () => {
      listeners.delete(listener);
      listenerCount = Math.max(0, listenerCount - 1);
      if (listenerCount === 0 && channel) {
        const previousChannel = channel;
        channel = null;
        channelUserId = null;
        sharedOnlineUsers = new Set();
        void previousChannel.unsubscribe();
      }
    };
  }, [userId]);

  const isOnline = useCallback((targetUserId: string) => onlineUsers.has(targetUserId), [onlineUsers]);
  return { onlineUsers, isOnline };
};

// Component for showing online indicator
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
