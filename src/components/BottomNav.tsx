import { useState, useEffect } from "react";
import { Home, PlusCircle, User, Tv, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Tv, label: "Streamers", path: "/streamers" },
  { icon: PlusCircle, label: "Post", path: "/create-post" },
  { icon: null, label: "Notifications", path: "/notifications" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

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
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadCount(count || 0);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {navItems.map((item, index) => {
          // Render notifications as a link to the dedicated page
          if (item.label === "Notifications") {
            return (
              <Link
                key="notifications"
                to="/notifications"
                className="relative flex flex-col items-center justify-center w-16 h-full"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors duration-200",
                    location.pathname === "/notifications" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {location.pathname === "/notifications" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <Bell className={cn("w-5 h-5", location.pathname === "/notifications" && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
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
              </Link>
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
