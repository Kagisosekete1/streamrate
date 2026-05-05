import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Users, FileText, Star, TrendingUp, Check, Eye, X, Gamepad2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

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

type FilterType = "all" | "follows" | "posts" | "ratings" | "trending" | "referrals";

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Bell },
  { value: "follows", label: "Follows", icon: Users },
  { value: "posts", label: "Posts", icon: FileText },
  { value: "ratings", label: "Ratings", icon: Star },
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "referrals", label: "Referrals", icon: Gift },
];

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);

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
          if (newNotification.type === "reel_view") return;
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

    // Watch party join → go to watch parties page
    if (notification.type === "party_join") {
      navigate("/watch-parties");
      return;
    }

    // Poll vote → go to live page
    if (notification.type === "poll_vote") {
      navigate("/live");
      return;
    }

    // LFG response → go to squad up & open requester profile
    if (notification.type === "lfg_response") {
      if (notification.from_user_id) {
        navigate(`/streamer/${notification.from_user_id}`);
      } else {
        navigate("/squad-up");
      }
      return;
    }

    // Comment/mention notifications deep-link to the specific comment
    if (notification.post_id && (notification.type === "comment" || notification.type === "comment_reply" || notification.type === "comment_like" || notification.type === "mention")) {
      const commentParam = notification.comment_id ? `?commentId=${notification.comment_id}` : "";
      navigate(`/post/${notification.post_id}${commentParam}`);
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

    if (notification.type === "new_follower") {
      setShowFollowersModal(true);
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
      case "profile_view":
        return <Eye className="w-4 h-4 text-cyan-400" />;
      case "lfg_response":
        return <Gamepad2 className="w-4 h-4 text-blue-400" />;
      case "party_join":
      case "poll_vote":
        return <Bell className="w-4 h-4 text-purple-400" />;
      case "referral":
        return <Gift className="w-4 h-4 text-pink-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  // Group new_follower notifications by day
  const groupedNotifications = (() => {
    // Filter out reel_view notifications entirely
    const filtered = notifications.filter((n) => {
      if (n.type === "reel_view") return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "follows") return n.type === "follow" || n.type === "new_follower";
      if (activeFilter === "posts") return n.type === "new_post";
      if (activeFilter === "ratings") return n.type === "rating";
      if (activeFilter === "trending") return n.type === "trending";
      if (activeFilter === "referrals") return n.type === "referral";
      return true;
    });

    // Group follower notifications by day
    const result: (Notification & { groupedFollowers?: Notification[] })[] = [];
    const followersByDay = new Map<string, Notification[]>();

    for (const n of filtered) {
      if (n.type === "new_follower") {
        const dayKey = new Date(n.created_at).toDateString();
        if (!followersByDay.has(dayKey)) {
          followersByDay.set(dayKey, []);
        }
        followersByDay.get(dayKey)!.push(n);
      } else {
        result.push(n);
      }
    }

    // Add grouped follower entries
    for (const [, followers] of followersByDay) {
      const sorted = followers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const primary = sorted[0];
      result.push({ ...primary, groupedFollowers: sorted });
    }

    // Sort by date
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  })();

  const filteredNotifications = groupedNotifications;

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
                    if (filter.value === "referrals") return n.type === "referral";
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
                    {/* Grouped follower avatars */}
                    {(notification as any).groupedFollowers ? (() => {
                      const followers = (notification as any).groupedFollowers as Notification[];
                      const avatars = followers.slice(0, 3).map(f => f.from_user?.avatar_url).filter(Boolean);
                      return (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {avatars.length >= 2 ? (
                            <>
                              <img src={avatars[0]!} alt="" className="w-8 h-8 rounded-full object-cover absolute top-0 left-0 border-2 border-card z-10" />
                              <img src={avatars[1]!} alt="" className="w-8 h-8 rounded-full object-cover absolute bottom-0 right-0 border-2 border-card" />
                            </>
                          ) : avatars.length === 1 ? (
                            <img src={avatars[0]!} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center border border-border">
                            <Users className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                      );
                    })() : notification.from_user?.avatar_url ? (
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
                      {(notification as any).groupedFollowers ? (() => {
                        const followers = (notification as any).groupedFollowers as Notification[];
                        const names = followers.map(f => f.from_user?.username || "Someone");
                        const count = followers.length;
                        let message = "";
                        if (count === 1) {
                          message = `@${names[0]} followed you`;
                        } else if (count === 2) {
                          message = `@${names[0]} and @${names[1]} followed you`;
                        } else {
                          message = `@${names[0]}, @${names[1]} and ${count - 2} other${count - 2 > 1 ? "s" : ""} followed you`;
                        }
                        return (
                          <>
                            <p className="text-sm font-semibold text-foreground">New Followers</p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </>
                        );
                      })() : (
                        <>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                        </>
                      )}
                    </div>
                    {!notification.is_read && (
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="w-2.5 h-2.5 bg-primary rounded-full mt-2" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-[10px] text-primary hover:underline font-medium"
                          aria-label="Mark as read"
                        >
                          Mark read
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* New Followers Modal */}
      <AnimatePresence>
        {showFollowersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFollowersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl overflow-hidden border border-border shadow-2xl max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">New Followers</h2>
                  <span className="text-xs text-muted-foreground">Last 24h</span>
                </div>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  // Get all new_follower notifications from last 24h
                  const recentFollowers = notifications
                    .filter(n => n.type === "new_follower" && n.from_user_id)
                    .filter(n => new Date(n.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000);
                  
                  const allFollowers = recentFollowers.length > 0 ? recentFollowers : notifications.filter(n => n.type === "new_follower" && n.from_user_id);

                  if (allFollowers.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No new followers yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {allFollowers.map((f) => (
                        <motion.button
                          key={f.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            setShowFollowersModal(false);
                            navigate(`/streamer/${f.from_user_id}`);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                        >
                          <img
                            src={f.from_user?.avatar_url || getDefaultAvatar(f.from_user?.username || "User")}
                            alt={f.from_user?.username || "User"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              @{f.from_user?.username || "Someone"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </AppLayout>
  );
};

export default Notifications;
