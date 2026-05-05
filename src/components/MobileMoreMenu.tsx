import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  Tv,
  Gamepad2,
  Scissors,
  Target,
  Rocket,
  BarChart3,
  Trophy,
  Radio,
  ShoppingBag,
  Bell,
  Settings as SettingsIcon,
  BarChart,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

const moreItems = [
  { icon: Sparkles, label: "Hidden Stuff", path: "/hidden", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: Tv, label: "Watch Parties", path: "/watch-parties", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Gamepad2, label: "Squad Up", path: "/squad-up", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Scissors, label: "Clips", path: "/clips", color: "text-orange-500", bg: "bg-orange-500/10" },
  { icon: Target, label: "Missions", path: "/missions", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Radio, label: "Live", path: "/live", color: "text-red-500", bg: "bg-red-500/10" },
  { icon: Bell, label: "Notifications", path: "/notifications", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: ShoppingBag, label: "Market", path: "/store", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Rocket, label: "Boost", path: "/boost-profile", color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { icon: BarChart3, label: "Creator", path: "/creator-dashboard", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { icon: BarChart, label: "Analytics", path: "/streaming-analytics", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: SettingsIcon, label: "Settings", path: "/settings", color: "text-muted-foreground", bg: "bg-muted" },
];

export const MobileMoreMenu = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const unread = useUnreadNotifications();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.92 }}
          className="md:hidden fixed bottom-24 left-4 z-40 w-11 h-11 rounded-full bg-background/95 backdrop-blur-lg border border-border shadow-lg shadow-black/20 flex items-center justify-center"
          aria-label="More menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </motion.button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">More</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3">
          {moreItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const showBadge = item.path === "/notifications" && unread > 0;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-accent/5"
                  )}
                >
                  <div className={cn("relative w-11 h-11 rounded-xl flex items-center justify-center", item.bg)}>
                    <Icon className={cn("w-5 h-5", item.color)} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};