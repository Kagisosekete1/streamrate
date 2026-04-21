import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Tv, Gamepad2, Vote, Scissors, Bell } from "lucide-react";

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
  },
  {
    icon: Gamepad2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Squad Up (LFG)",
    description: "Find teammates for any game with rank, region & playstyle filters.",
  },
  {
    icon: Vote,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Stream Polls",
    description: "Streamers can run live polls — fans spend coins to vote.",
  },
  {
    icon: Scissors,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Clip It",
    description: "Capture epic stream moments and share them as Reels.",
  },
  {
    icon: Trophy,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    title: "Weekly Mega-Missions",
    description: "Bigger XP & coin rewards for week-long challenges.",
  },
  {
    icon: Bell,
    color: "text-green-500",
    bg: "bg-green-500/10",
    title: "Smart Notifications",
    description: "Get alerted when someone joins your party or votes on your polls.",
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