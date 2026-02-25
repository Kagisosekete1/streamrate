import { useState, useEffect } from "react";
import { Home, Compass, Plus, UserCircle2, Clapperboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/streamers" },
  { icon: Plus, label: "Create", path: "/create-post" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: UserCircle2, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

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
