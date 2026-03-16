import { useState, useEffect } from "react";
import { Home, Compass, Plus, Clapperboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/streamers" },
  { icon: Plus, label: "Create", path: "/create-post" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: null, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [hasNewReels, setHasNewReels] = useState(false);

  useEffect(() => {
    // Check for reels created in last 24 hours
    const checkNewReels = async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("reels")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo);
      setHasNewReels((count || 0) > 0);
    };
    checkNewReels();
  }, []);

  // Clear blue dot when visiting reels
  useEffect(() => {
    if (location.pathname === "/reels") {
      setHasNewReels(false);
    }
  }, [location.pathname]);

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
                {item.path === "/profile" ? (
                  <img
                    src={profile?.avatar_url || getDefaultAvatar()}
                    alt="Profile"
                    className={cn(
                      "w-7 h-7 rounded-full object-cover transition-all",
                      isActive ? "ring-2 ring-primary" : "opacity-70"
                    )}
                  />
                ) : (
                  <Icon 
                    className={cn(
                      "w-6 h-6 transition-all",
                      isActive ? "text-foreground" : "text-muted-foreground",
                      item.path === "/create-post" && "w-7 h-7"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    fill={isActive && item.path !== "/create-post" ? "currentColor" : "none"}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary"
                  />
                )}
                {/* New reels blue dot */}
                {item.path === "/reels" && hasNewReels && !isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
