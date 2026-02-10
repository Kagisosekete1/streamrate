import { useState, useEffect } from "react";
import { Home, Compass, Zap, UserCircle2, Radio } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/streamers" },
  { icon: Zap, label: "Create", path: "/create-post" },
  { icon: Radio, label: "Live", path: "/live" },
  { icon: UserCircle2, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full py-2"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative flex items-center justify-center"
              >
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-all",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    item.path === "/create-post" && "w-7 h-7"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={isActive && item.path !== "/create-post" ? "currentColor" : "none"}
                />
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
