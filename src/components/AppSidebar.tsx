import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Compass,
  Plus,
  Clapperboard,
  UserCircle2,
  SlidersHorizontal,
  Bell,
  Menu,
  X,
  Trophy,
  LogOut,
  Radio,
  ShoppingBag,
  BarChart3,
  Target,
  Rocket,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/streamers" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: Plus, label: "Create", path: "/create-post" },
  { icon: Radio, label: "Live", path: "/live" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: UserCircle2, label: "Profile", path: "/profile" },
];

const moreNavItems: NavItem[] = [
  { icon: Target, label: "Missions", path: "/missions" },
  { icon: Rocket, label: "Boost", path: "/boost-profile" },
  { icon: BarChart3, label: "Dashboard", path: "/creator-dashboard" },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [isAnyoneLive, setIsAnyoneLive] = useState(false);

  // Check if anyone has streaming links (lightweight live indicator)
  const checkLiveStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("twitch_url, show_twitch")
        .eq("show_twitch", true)
        .not("twitch_url", "is", null)
        .limit(1);
      setIsAnyoneLive(!!(data && data.length > 0));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    checkLiveStatus();
  }, [checkLiveStatus]);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type")
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (data) {
        setUnreadCount(data.filter(n => n.type !== "reel_view").length);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel("sidebar-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if ((payload.new as any).type !== "reel_view") {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-open More if current route is in moreNavItems
  useEffect(() => {
    if (moreNavItems.some(item => isActive(item.path))) {
      setShowMore(true);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path.includes("?")) {
      return location.pathname === path.split("?")[0];
    }
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-background border-r border-border fixed left-0 top-0 z-40 transition-all duration-300",
        isExpanded ? "w-60" : "w-20"
      )}
    >
      {/* Header / Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="StreamRate"
            className="h-8 w-8 object-contain"
          />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg text-foreground overflow-hidden whitespace-nowrap"
              >
                StreamRate
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group",
              isActive(item.path)
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-secondary"
            )}
          >
            <div className="relative">
              <item.icon
                className={cn(
                  "w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110",
                  isActive(item.path) ? "text-primary" : ""
                )}
                strokeWidth={isActive(item.path) ? 2.5 : 1.5}
              />
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {item.label === "Live" && isAnyoneLive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

      {/* Bottom Section - More Menu */}
      <div className="border-t border-border py-4 px-2 space-y-1">
        {/* More Toggle */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group",
            showMore ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"
          )}
        >
          <MoreHorizontal
            className="w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110"
            strokeWidth={showMore ? 2.5 : 1.5}
          />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                More
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* More Items */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-1 pl-2"
            >
              {moreNavItems.map((item) => (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive(item.path)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon
                    className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110"
                    strokeWidth={isActive(item.path) ? 2.5 : 1.5}
                  />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap text-sm"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Profile */}
        <div className="mt-4 pt-4 border-t border-border">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              isExpanded ? "" : "justify-center"
            )}
          >
            <img
              src={
                profile?.avatar_url ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
              }
              alt={profile?.username || "User"}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
            />
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="font-medium text-foreground truncate text-sm">
                    {profile?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200 mt-2"
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Log Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </aside>
  );
};
