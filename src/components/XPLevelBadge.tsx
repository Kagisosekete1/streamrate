import { motion } from "framer-motion";
import { Zap, Flame } from "lucide-react";
import { getLevelTitle, getXPForLevel, getXPForNextLevel } from "@/hooks/useGamification";

interface XPLevelBadgeProps {
  level: number;
  totalXP: number;
  streakDays: number;
  compact?: boolean;
}

export const XPLevelBadge = ({ level, totalXP, streakDays, compact = false }: XPLevelBadgeProps) => {
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const progressInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = xpNeeded > 0 ? Math.min((progressInLevel / xpNeeded) * 100, 100) : 100;
  const title = getLevelTitle(level);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
          <Zap className="w-3 h-3" />
          Lv.{level}
        </div>
        {streakDays > 0 && (
          <div className="flex items-center gap-0.5 bg-accent/10 text-accent rounded-full px-2 py-0.5 text-xs font-semibold">
            <Flame className="w-3 h-3" />
            {streakDays}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg">
              {level}
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-3 h-3 text-accent-foreground" />
            </motion.div>
          </div>
          <div>
            <p className="font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{totalXP.toLocaleString()} XP Total</p>
          </div>
        </div>
        {streakDays > 0 && (
          <div className="flex items-center gap-1 bg-accent/10 text-accent rounded-full px-3 py-1 text-sm font-semibold">
            <Flame className="w-4 h-4" />
            {streakDays} day streak
          </div>
        )}
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Level {level}</span>
          <span>Level {level + 1}</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {progressInLevel} / {xpNeeded} XP to next level
        </p>
      </div>
    </motion.div>
  );
};
