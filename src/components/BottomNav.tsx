import { useState, useEffect } from "react";
import { Home, PlusCircle, User, Tv, Bell } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  from_user_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Tv, label: "Streamers", path: "/streamers" },
  { icon: PlusCircle, label: "Post", path: "/create-post" },
  { icon: null, label: "Notifications", path: null }, // Placeholder for notifications
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("user-notifications-nav")
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
      
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", fromUserIds as string[]);

        const profilesMap = new Map(
          (profiles || []).map((p) => [p.id, p])
        );

        const notificationsWithUsers = data.map((n) => ({
          ...n,
          from_user: n.from_user_id ? profilesMap.get(n.from_user_id) : undefined,
        }));

        setNotifications(notificationsWithUsers);
      } else {
        setNotifications(data);
      }
      
      setUnreadCount(data.filter((n) => !n.is_read).length);
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
    setIsNotificationsOpen(false);
    
    if (notification.type === "follow") {
      navigate(`/streamer/${notification.from_user_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return "👤";
      case "new_post":
        return "📝";
      case "rating":
        return "⭐";
      case "trending":
        return "🔥";
      default:
        return "🔔";
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {navItems.map((item, index) => {
          // Render notifications popover
          if (item.label === "Notifications") {
            return (
              <Popover key="notifications" open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button className="relative flex flex-col items-center justify-center w-16 h-full">
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-200",
                        isNotificationsOpen ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <div className="relative">
                        <Bell className={cn("w-5 h-5", isNotificationsOpen && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
                        <AnimatePresence>
                          {unreadCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                            >
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <span className="text-[10px] font-medium">Alerts</span>
                    </motion.div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 mb-2" align="center" side="top">
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
                  <ScrollArea className="h-72">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                        <Bell className="w-8 h-8 mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                              !notification.is_read ? "bg-primary/5" : ""
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-3">
                              {notification.from_user?.avatar_url ? (
                                <img
                                  src={notification.from_user.avatar_url}
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                                  {getNotificationIcon(notification.type)}
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
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon!;

          return (
            <Link
              key={item.path}
              to={item.path!}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
