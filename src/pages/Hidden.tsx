import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import {
  Gift,
  Shield,
  BarChart,
  BarChart3,
  Rocket,
  Target,
  Trophy,
  Tv,
  Gamepad2,
  Scissors,
  Radio,
  ShoppingBag,
  Info,
  ChevronRight,
  Bell,
  Settings as SettingsIcon,
  Clapperboard,
} from "lucide-react";

const items = [
  { icon: Gift, label: "Invite & Referrals", desc: "Share your link, earn Blue Verification.", path: "/invite", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: Shield, label: "Security Findings", desc: "Recent security scan results.", path: "/security/findings", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: BarChart, label: "Streaming Analytics", desc: "Twitch, Kick, Discord stats.", path: "/streaming-analytics", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: BarChart3, label: "Creator Dashboard", desc: "Milestones and growth.", path: "/creator-dashboard", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { icon: Clapperboard, label: "Reel Analytics", desc: "Per-reel views and engagement.", path: "/analytics/reels", color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { icon: Rocket, label: "Boost Profile", desc: "Increase your visibility.", path: "/boost-profile", color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { icon: Target, label: "Daily Missions", desc: "Earn XP & coins each day.", path: "/missions", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: Trophy, label: "Leaderboard", desc: "Top streamers & ratings.", path: "/leaderboard", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Tv, label: "Watch Parties", desc: "Co-watch with friends.", path: "/watch-parties", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Gamepad2, label: "Squad Up", desc: "Find players to team with.", path: "/squad-up", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Scissors, label: "Clips", desc: "Your saved stream clips.", path: "/clips", color: "text-orange-500", bg: "bg-orange-500/10" },
  { icon: Radio, label: "Live", desc: "Currently live streamers.", path: "/live", color: "text-red-500", bg: "bg-red-500/10" },
  { icon: ShoppingBag, label: "Market", desc: "Seller marketplace.", path: "/store", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Bell, label: "Notifications", desc: "All your alerts.", path: "/notifications", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: SettingsIcon, label: "Settings", desc: "Manage your account.", path: "/settings", color: "text-muted-foreground", bg: "bg-muted" },
  { icon: Info, label: "About", desc: "About StreamRate.", path: "/about", color: "text-muted-foreground", bg: "bg-muted" },
];

const Hidden = () => {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Hidden Stuff</h1>
          <p className="text-sm text-muted-foreground">
            Less obvious features and pages — all in one place.
          </p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.path}
                to={it.path}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${it.bg}`}>
                  <Icon className={`w-5 h-5 ${it.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{it.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Hidden;