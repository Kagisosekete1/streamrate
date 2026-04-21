import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  post_id: string | null;
  reel_id: string | null;
  from_user_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.type === "reel_view") return;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      // Fetch from_user profiles
      const fromUserIds = [...new Set(data.filter(n => n.from_user_id).map(n => n.from_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", fromUserIds as string[]);

      const profilesMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      const notificationsWithUsers = data
        .filter((n) => n.type !== "reel_view")
        .map((n) => ({
          ...n,
          from_user: n.from_user_id ? profilesMap.get(n.from_user_id) : undefined,
        }));

      setNotifications(notificationsWithUsers);
      setUnreadCount(notificationsWithUsers.filter((n) => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);

    // Profile view → go to viewer's profile
    if (notification.type === "profile_view" && notification.from_user_id) {
      navigate(`/streamer/${notification.from_user_id}`);
      return;
    }

    // Reel interactions → open reel
    if (notification.reel_id && (notification.type === "reel_like" || notification.type === "reel_comment" || notification.type === "mention")) {
      navigate(`/reels?reelId=${notification.reel_id}`);
      return;
    }

    if (notification.type === "party_join") {
      navigate("/watch-parties");
      return;
    }
    if (notification.type === "poll_vote") {
      navigate("/live");
      return;
    }
    if (notification.type === "lfg_response") {
      navigate(notification.from_user_id ? `/streamer/${notification.from_user_id}` : "/squad-up");
      return;
    }

    // Comment/mention notifications deep-link to the specific comment
    if (notification.post_id && (notification.type === "comment" || notification.type === "comment_reply" || notification.type === "comment_like" || notification.type === "mention")) {
      navigate(`/post/${notification.post_id}`);
      return;
    }

    if (notification.type === "post_like" && notification.post_id) {
      navigate(`/post/${notification.post_id}`);
      return;
    }

    if (notification.post_id && notification.type === "new_post") {
      navigate(`/post/${notification.post_id}`);
      return;
    }

    if (notification.type === "new_follower" && notification.from_user_id) {
      navigate(`/streamer/${notification.from_user_id}`);
      return;
    }

    // Fallback: if there's a from_user_id, go to their profile
    if (notification.from_user_id) {
      navigate(`/streamer/${notification.from_user_id}`);
      return;
    }

    // Fallback: if there's a post_id, go to the post
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {notification.from_user?.avatar_url ? (
                      <img
                        src={notification.from_user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
