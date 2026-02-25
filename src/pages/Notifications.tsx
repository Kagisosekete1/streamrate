import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Users, FileText, Star, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  post_id: string | null;
  reel_id: string | null;
  from_user_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

type FilterType = "all" | "follows" | "posts" | "ratings" | "trending";

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Bell },
  { value: "follows", label: "Follows", icon: Users },
  { value: "posts", label: "Posts", icon: FileText },
  { value: "ratings", label: "Ratings", icon: Star },
  { value: "trending", label: "Trending", icon: TrendingUp },
];

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications-page")
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const fromUserIds = [...new Set(data.filter((n) => n.from_user_id).map((n) => n.from_user_id))];
      const castData = data as any[] as Notification[];

      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", fromUserIds as string[]);

        const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

        const notificationsWithUsers = castData.map((n) => ({
          ...n,
          from_user: n.from_user_id ? profilesMap.get(n.from_user_id) : undefined,
        }));

        setNotifications(notificationsWithUsers);
      } else {
        setNotifications(castData);
      }
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Comment/mention notifications deep-link to the specific comment
    if (notification.post_id && (notification.type === "comment" || notification.type === "comment_reply" || notification.type === "comment_like" || notification.type === "mention")) {
      const commentParam = notification.comment_id ? `?commentId=${notification.comment_id}` : "";
      navigate(`/post/${notification.post_id}${commentParam}`);
    } else if (notification.type === "post_like" && notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.post_id && notification.type === "new_post") {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.reel_id && (notification.type === "reel_like" || notification.type === "reel_comment" || notification.type === "mention")) {
      navigate(`/reels?reelId=${notification.reel_id}`);
    } else if (notification.type === "new_follower" && notification.from_user_id) {
      navigate(`/streamer/${notification.from_user_id}`);
    } else if (notification.from_user_id) {
      navigate(`/streamer/${notification.from_user_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
      case "new_follower":
        return <Users className="w-4 h-4 text-blue-400" />;
      case "new_post":
        return <FileText className="w-4 h-4 text-green-400" />;
      case "rating":
        return <Star className="w-4 h-4 text-yellow-400" />;
      case "trending":
        return <TrendingUp className="w-4 h-4 text-orange-400" />;
      case "mention":
        return <span className="text-sm font-bold text-purple-400">@</span>;
      case "post_like":
      case "reel_like":
        return <Bell className="w-4 h-4 text-red-400" />;
      case "comment":
      case "comment_reply":
      case "reel_comment":
        return <Bell className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "follows") return n.type === "follow";
    if (activeFilter === "posts") return n.type === "new_post";
    if (activeFilter === "ratings") return n.type === "rating";
    if (activeFilter === "trending") return n.type === "trending";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary">
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {filterOptions.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.value;
            const count =
              filter.value === "all"
                ? notifications.length
                : notifications.filter((n) => {
                    if (filter.value === "follows") return n.type === "follow";
                    if (filter.value === "posts") return n.type === "new_post";
                    if (filter.value === "ratings") return n.type === "rating";
                    if (filter.value === "trending") return n.type === "trending";
                    return false;
                  }).length;

            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Notifications List */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Bell className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">
              {activeFilter === "all"
                ? "You're all caught up!"
                : `No ${activeFilter} notifications yet`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {notification.from_user?.avatar_url ? (
                      <div className="relative">
                        <img
                          src={notification.from_user.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center border border-border">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      </div>
    </AppLayout>
  );
};

export default Notifications;
