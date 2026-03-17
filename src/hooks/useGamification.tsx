import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserXP {
  total_xp: number;
  level: number;
  streak_days: number;
  last_streak_date: string | null;
}

interface UserCoins {
  balance: number;
}

interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
}

interface DailyMission {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  coin_reward: number;
  action_type: string;
  target_count: number;
  icon: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer",
  2: "Rookie",
  3: "Regular",
  4: "Rising Star",
  5: "Trendsetter",
  6: "Influencer",
  7: "Star",
  8: "Superstar",
  9: "Legend",
  10: "Icon",
};

export const getLevelTitle = (level: number): string => {
  if (level >= 10) return "Icon";
  return LEVEL_TITLES[level] || "Newcomer";
};

export const getXPForLevel = (level: number): number => {
  return (level - 1) * (level - 1) * 100;
};

export const getXPForNextLevel = (level: number): number => {
  return level * level * 100;
};

export const useGamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [xp, setXP] = useState<UserXP>({ total_xp: 0, level: 1, streak_days: 0, last_streak_date: null });
  const [coins, setCoins] = useState<UserCoins>({ balance: 0 });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch or create XP record
    let { data: xpData } = await supabase
      .from("user_xp")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!xpData) {
      const { data: newXP } = await supabase
        .from("user_xp")
        .insert({ user_id: user.id })
        .select()
        .single();
      xpData = newXP;
    }

    if (xpData) {
      setXP({
        total_xp: xpData.total_xp,
        level: xpData.level,
        streak_days: xpData.streak_days,
        last_streak_date: xpData.last_streak_date,
      });
    }

    // Fetch or create coins
    let { data: coinData } = await supabase
      .from("user_coins")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!coinData) {
      const { data: newCoins } = await supabase
        .from("user_coins")
        .insert({ user_id: user.id })
        .select()
        .single();
      coinData = newCoins;
    }

    if (coinData) {
      setCoins({ balance: coinData.balance });
    }

    // Fetch badges
    const { data: badgeData } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });
    setBadges(badgeData || []);

    // Fetch missions with today's progress
    const { data: missionData } = await supabase
      .from("daily_missions")
      .select("*")
      .eq("is_active", true);

    const today = new Date().toISOString().split("T")[0];
    const { data: progressData } = await supabase
      .from("user_daily_missions")
      .select("*")
      .eq("user_id", user.id)
      .eq("mission_date", today);

    const progressMap = new Map(
      (progressData || []).map((p) => [p.mission_id, p])
    );

    const enrichedMissions: DailyMission[] = (missionData || []).map((m) => {
      const prog = progressMap.get(m.id);
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        xp_reward: m.xp_reward,
        coin_reward: m.coin_reward,
        action_type: m.action_type,
        target_count: m.target_count,
        icon: m.icon,
        progress: prog?.progress || 0,
        completed: prog?.completed || false,
        claimed: prog?.claimed || false,
      };
    });

    setMissions(enrichedMissions);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addXP = useCallback(
    async (amount: number, reason?: string) => {
      if (!user) return;
      const newTotal = xp.total_xp + amount;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newTotal / 100)) + 1);

      const leveledUp = newLevel > xp.level;

      await supabase
        .from("user_xp")
        .update({ total_xp: newTotal, level: newLevel })
        .eq("user_id", user.id);

      setXP((prev) => ({ ...prev, total_xp: newTotal, level: newLevel }));

      if (leveledUp) {
        toast({
          title: `🎉 Level Up! You're now Level ${newLevel}`,
          description: `${getLevelTitle(newLevel)} — Keep going!`,
        });
      }
    },
    [user, xp, toast]
  );

  const addCoins = useCallback(
    async (amount: number, description?: string) => {
      if (!user) return;
      const newBalance = coins.balance + amount;

      await supabase
        .from("user_coins")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount,
        type: amount > 0 ? "earn" : "spend",
        description: description || "Reward",
      });

      setCoins({ balance: newBalance });
    },
    [user, coins]
  );

  const claimMission = useCallback(
    async (missionId: string) => {
      if (!user) return;
      const mission = missions.find((m) => m.id === missionId);
      if (!mission || !mission.completed || mission.claimed) return;

      const today = new Date().toISOString().split("T")[0];

      await supabase
        .from("user_daily_missions")
        .update({ claimed: true })
        .eq("user_id", user.id)
        .eq("mission_id", missionId)
        .eq("mission_date", today);

      await addXP(mission.xp_reward, `Mission: ${mission.title}`);
      await addCoins(mission.coin_reward, `Mission: ${mission.title}`);

      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, claimed: true } : m))
      );

      toast({
        title: `✅ Mission Complete!`,
        description: `+${mission.xp_reward} XP, +${mission.coin_reward} Coins`,
      });
    },
    [user, missions, addXP, addCoins, toast]
  );

  const updateMissionProgress = useCallback(
    async (actionType: string, increment: number = 1) => {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const mission = missions.find((m) => m.action_type === actionType);
      if (!mission || mission.claimed) return;

      // Upsert progress
      const newProgress = Math.min(mission.progress + increment, mission.target_count);
      const completed = newProgress >= mission.target_count;

      const { data: existing } = await supabase
        .from("user_daily_missions")
        .select("id")
        .eq("user_id", user.id)
        .eq("mission_id", mission.id)
        .eq("mission_date", today)
        .single();

      if (existing) {
        await supabase
          .from("user_daily_missions")
          .update({ progress: newProgress, completed })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_daily_missions").insert({
          user_id: user.id,
          mission_id: mission.id,
          progress: newProgress,
          completed,
          mission_date: today,
        });
      }

      setMissions((prev) =>
        prev.map((m) =>
          m.id === mission.id ? { ...m, progress: newProgress, completed } : m
        )
      );

      if (completed && !mission.completed) {
        toast({
          title: `🎯 Mission Ready to Claim!`,
          description: `"${mission.title}" — tap to claim rewards`,
        });
      }
    },
    [user, missions, toast]
  );

  return {
    xp,
    coins,
    badges,
    missions,
    loading,
    addXP,
    addCoins,
    claimMission,
    updateMissionProgress,
    refetch: fetchAll,
  };
};
