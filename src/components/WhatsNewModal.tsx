import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Tv, Gamepad2, Vote, Scissors, Bell, Play, Users, Zap, Coins, Film } from "lucide-react";

interface WhatsNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: string;
  onUpdate: () => void;
  updating: boolean;
}

const FEATURES = [
  {
    icon: Tv,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "Watch Parties",
    description: "Host live streams together with friends and react in real-time.",
    preview: (
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded bg-purple-500/30 flex items-center justify-center">
          <Play className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className="flex-1">
          <div className="h-1.5 bg-purple-500/30 rounded w-3/4 mb-1" />
          <div className="flex items-center gap-1 text-[10px] text-purple-500">
            <Users className="w-2.5 h-2.5" /> 12 watching
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Gamepad2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Squad Up (LFG)",
    description: "Find teammates for any game with rank, region & playstyle filters.",
    preview: (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mt-2 space-y-1">
        <div className="flex gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-500 font-medium">Valorant</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/30 text-yellow-500 font-medium">Diamond</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-medium">EU West</span>
        </div>
        <div className="h-1 bg-blue-500/20 rounded w-full" />
      </div>
    ),
  },
  {
    icon: Vote,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Stream Polls",
    description: "Streamers can run live polls — fans spend coins to vote.",
    preview: (
      <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-2 mt-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1.5 bg-pink-500/30 rounded overflow-hidden">
            <div className="h-full w-2/3 bg-pink-500 rounded" />
          </div>
          <span className="text-[9px] text-pink-500 font-bold">67%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1.5 bg-pink-500/30 rounded overflow-hidden">
            <div className="h-full w-1/3 bg-pink-500/60 rounded" />
          </div>
          <span className="text-[9px] text-muted-foreground font-bold">33%</span>
        </div>
      </div>
    ),
  },
  {
    icon: Scissors,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Clip It",
    description: "Capture epic stream moments and share them as Reels.",
    preview: (
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mt-2 flex items-center gap-2">
        <div className="w-10 h-7 rounded bg-orange-500/30 flex items-center justify-center">
          <Film className="w-3.5 h-3.5 text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="h-1 bg-orange-500/30 rounded w-full mb-1" />
          <div className="h-1 bg-orange-500/20 rounded w-2/3" />
        </div>
        <Scissors className="w-3 h-3 text-orange-500" />
      </div>
    ),
  },
  {
    icon: Trophy,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    title: "Weekly Mega-Missions",
    description: "Bigger XP & coin rewards for week-long challenges.",
    preview: (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-2 mt-2 flex items-center justify-between">
        <div className="flex-1">
          <div className="h-1.5 bg-yellow-500/30 rounded overflow-hidden">
            <div className="h-full w-2/5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded" />
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">2/5 done</div>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary">
            <Zap className="w-2.5 h-2.5" />200
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-500">
            <Coins className="w-2.5 h-2.5" />100
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    color: "text-green-500",
    bg: "bg-green-500/10",
    title: "Smart Notifications",
    description: "Get alerted when someone joins your party or votes on your polls.",
    preview: (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mt-2 flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center shrink-0">
          <Bell className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-semibold text-foreground">New Poll Vote</div>
          <div className="h-1 bg-green-500/20 rounded w-3/4 mt-1" />
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      </div>
    ),
  },
];

export const WhatsNewModal = ({ open, onOpenChange, version, onUpdate, updating }: WhatsNewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </motion.div>
          </div>
          <DialogTitle className="text-center text-xl">
            What's New in v{version}
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            Fresh features to level up your gaming social experience
          </p>
        </DialogHeader>

        <div className="space-y-2.5 my-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className={`shrink-0 w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{feature.description}</p>
                  {feature.preview}
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button
          onClick={onUpdate}
          disabled={updating}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
          size="lg"
        >
          {updating ? "Updating..." : "Update Now"}
        </Button>
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          Remind me later
        </button>
      </DialogContent>
    </Dialog>
  );
};