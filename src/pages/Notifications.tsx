import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Users, FileText, Star, TrendingUp, Check, Eye, X, Gamepad2, Gift, Share2, RefreshCw, Code2, Heart, MessageCircle, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { getDefaultAvatar } from "@/utils/defaultAvatar";
import { getNotificationRoute } from "@/lib/notificationDeepLinks";

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

type FilterType = "all" | "unread" | "likes" | "comments" | "replies" | "follows" | "posts" | "ratings" | "trending" | "referrals";

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Bell },
  { value: "unread", label: "Unread", icon: Check },
  { value: "likes", label: "Likes", icon: Heart },
  { value: "comments", label: "Comments", icon: MessageCircle },
  { value: "replies", label: "Replies", icon: Reply },
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
  const [debugOpenIds, setDebugOpenIds] = useState<Set<string>>(new Set());

  const toggleDebug = (id: string) => {
    setDebugOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const shareReferralLink = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("referral_code, username")
      .eq("id", user.id)
      .maybeSingle();
    const code = data?.referral_code || data?.username;
    if (!code) {
      toast.error("No referral code yet — visit Invite to set up.");
      navigate("/invite");
      return;
    }
    const url = `${window.location.origin}/auth?ref=${encodeURIComponent(code)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Referral link copied");
      }
    } catch {
      // user cancelled
    }
  };

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
    navigate(getNotificationRoute(notification));
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
        return <Heart className="w-4 h-4 text-red-400" />;
      case "post_share":
        return <Share2 className="w-4 h-4 text-cyan-400" />;
      case "comment":
      case "reel_comment":
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case "comment_reply":
        return <Reply className="w-4 h-4 text-blue-400" />;
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
      if (activeFilter === "unread") return !n.is_read;
      if (activeFilter === "likes") return n.type === "post_like" || n.type === "reel_like" || n.type === "comment_like";
      if (activeFilter === "comments") return n.type === "comment" || n.type === "reel_comment" || n.type === "mention";
      if (activeFilter === "replies") return n.type === "comment_reply";
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
                    if (filter.value === "unread") return !n.is_read;
                    if (filter.value === "likes") return n.type === "post_like" || n.type === "reel_like" || n.type === "comment_like";
                    if (filter.value === "comments") return n.type === "comment" || n.type === "reel_comment" || n.type === "mention";
                    if (filter.value === "replies") return n.type === "comment_reply";
                    if (filter.value === "follows") return n.type === "follow" || n.type === "new_follower";
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
          activeFilter === "referrals" ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-pink-400" />
              </div>
              <p className="text-lg font-semibold text-foreground">No referral alerts yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Share your link — you'll get notified the moment a friend joins and confirms their email.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <Button onClick={shareReferralLink} className="gap-2">
                  <Share2 className="w-4 h-4" /> Share my link
                </Button>
                <Button variant="outline" onClick={fetchNotifications} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">
                {activeFilter === "all"
                  ? "You're all caught up!"
                  : `No ${activeFilter} notifications yet`}
              </p>
            </div>
          )
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
                      {notification.type === "referral" && (
                        <div className="mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDebug(notification.id); }}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Code2 className="w-3 h-3" />
                            {debugOpenIds.has(notification.id) ? "Hide" : "Show"} debug payload
                          </button>
                          {debugOpenIds.has(notification.id) && (
                            <pre className="mt-2 text-[10px] bg-muted/60 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  from_user_id: notification.from_user_id,
  created_at: notification.created_at,
  exact_timestamp: new Date(notification.created_at).toISOString(),
}, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
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
