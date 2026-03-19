import { useState, useEffect } from "react";
import { Home, Compass, Plus, Clapperboard, MoreHorizontal, Target, Rocket, BarChart3, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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

const moreItems = [
  { icon: Target, label: "Missions", path: "/missions" },
  { icon: Rocket, label: "Boost", path: "/boost-profile" },
  { icon: BarChart3, label: "Dashboard", path: "/creator-dashboard" },
];

export const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [hasNewReels, setHasNewReels] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    if (location.pathname === "/reels") {
      setHasNewReels(false);
    }
  }, [location.pathname]);

  // Close more menu when navigating
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-14 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-4 safe-area-bottom"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">More</h3>
                <button onClick={() => setShowMore(false)} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            // Replace last item (Profile) position — add More button before it
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
                  {item.path === "/reels" && hasNewReels && !isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </motion.div>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center flex-1 h-full py-2"
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="relative flex items-center justify-center"
            >
              <MoreHorizontal
                className={cn(
                  "w-6 h-6 transition-all",
                  showMore ? "text-foreground" : "text-muted-foreground"
                )}
                strokeWidth={showMore ? 2.5 : 1.5}
              />
            </motion.div>
          </button>
        </div>
      </nav>
    </>
  );
};
