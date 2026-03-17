import { motion, AnimatePresence } from "framer-motion";
import { Target, Gift, Flame, Check, Coins, Zap, ChevronRight, Trophy } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { XPLevelBadge } from "@/components/XPLevelBadge";
import { CoinBalance } from "@/components/CoinBalance";
import { useGamification } from "@/hooks/useGamification";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Missions = () => {
  const { xp, coins, missions, badges, loading, claimMission } = useGamification();
  const navigate = useNavigate();

  const completedCount = missions.filter((m) => m.completed).length;
  const claimedCount = missions.filter((m) => m.claimed).length;
  const totalMissions = missions.length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg text-foreground">Daily Missions</h1>
            </div>
            <CoinBalance balance={coins.balance} compact />
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
          {/* XP Card */}
          <XPLevelBadge
            level={xp.level}
            totalXP={xp.total_xp}
            streakDays={xp.streak_days}
          />

          {/* Daily Progress */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" />
                <span className="font-semibold text-sm text-foreground">Today's Progress</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {claimedCount}/{totalMissions} claimed
              </span>
            </div>
            <Progress value={(claimedCount / Math.max(totalMissions, 1)) * 100} className="h-2" />
            {claimedCount === totalMissions && totalMissions > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-accent font-semibold mt-2 text-center"
              >
                🎉 All missions completed! Come back tomorrow!
              </motion.p>
            )}
          </div>

          {/* Coin Balance */}
          <div className="flex items-center gap-3">
            <CoinBalance balance={coins.balance} />
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate("/leaderboard")}
            >
              <Trophy className="w-4 h-4 mr-1" /> Leaderboard
            </Button>
          </div>

          {/* Missions List */}
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" />
              Missions
            </h2>
            <AnimatePresence>
              {missions.map((mission, i) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card border rounded-xl p-4 ${
                    mission.claimed
                      ? "border-green-500/30 bg-green-500/5"
                      : mission.completed
                      ? "border-accent/30 bg-accent/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{mission.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{mission.title}</p>
                        {mission.claimed && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{mission.description}</p>
                      <div className="mt-2">
                        <Progress
                          value={(mission.progress / mission.target_count) * 100}
                          className="h-1.5"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {mission.progress}/{mission.target_count}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-0.5 text-primary">
                              <Zap className="w-3 h-3" />
                              {mission.xp_reward}
                            </span>
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Coins className="w-3 h-3" />
                              {mission.coin_reward}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {mission.completed && !mission.claimed && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                        onClick={() => claimMission(mission.id)}
                      >
                        Claim
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Badges Section */}
          {badges.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Your Badges
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.05 }}
                    className="bg-card border border-border rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl mb-1">{badge.badge_icon}</div>
                    <p className="text-xs font-medium text-foreground truncate">
                      {badge.badge_name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Missions;
