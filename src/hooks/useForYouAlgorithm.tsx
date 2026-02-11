import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  duration: number;
  user_id: string;
  created_at: string;
  view_count: number;
  user?: {
    username: string | null;
    avatar_url: string | null;
  };
  score?: number;
}

interface UserInterest {
  hashtag_id?: string;
  creator_id?: string;
  interest_score: number;
}

export const useForYouAlgorithm = () => {
  const { user } = useAuth();
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);

  // Fetch user interests
  const fetchUserInterests = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setUserInterests(data);
    }
  }, [user]);

  useEffect(() => {
    fetchUserInterests();
  }, [fetchUserInterests]);

  // Update user interest based on interaction
  const updateUserInterest = useCallback(async (
    type: "hashtag" | "creator",
    targetId: string,
    action: "view" | "like" | "comment" | "follow"
  ) => {
    if (!user) return;

    // Different weights for different actions
    const weights = {
      view: 0.5,
      like: 2.0,
      comment: 3.0,
      follow: 5.0
    };

    const scoreIncrease = weights[action];
    const column = type === "hashtag" ? "hashtag_id" : "creator_id";

    // Check if interest exists
    const { data: existing } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", user.id)
      .eq(column, targetId)
      .maybeSingle();

    if (existing) {
      // Update existing interest
      await supabase
        .from("user_interests")
        .update({
          interest_score: Math.min((existing.interest_score || 0) + scoreIncrease, 100),
          last_interaction: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // Create new interest
      await supabase
        .from("user_interests")
        .insert({
          user_id: user.id,
          [column]: targetId,
          interest_score: scoreIncrease,
          last_interaction: new Date().toISOString()
        });
    }

    // Refresh interests
    fetchUserInterests();
  }, [user, fetchUserInterests]);

  // Update hashtag interests when interacting with a reel
  const updateHashtagInterests = useCallback(async (
    reelId: string,
    action: "view" | "like" | "comment" | "follow"
  ) => {
    if (!user) return;

    // Get hashtags for this reel
    const { data: reelHashtags } = await supabase
      .from("reel_hashtags")
      .select("hashtag_id")
      .eq("reel_id", reelId);

    if (reelHashtags && reelHashtags.length > 0) {
      // Update interest for each hashtag
      for (const rh of reelHashtags) {
        await updateUserInterest("hashtag", rh.hashtag_id, action);
      }
    }
  }, [user, updateUserInterest]);

  // Calculate relevance score for a reel based on user interests
  const calculateReelScore = useCallback((reel: Reel, reelHashtags: string[]): number => {
    let score = 0;

    // Base score from engagement metrics
    const viewScore = Math.log(reel.view_count + 1) * 2;
    score += viewScore;

    // Recency boost (newer content gets slight boost)
    const ageInHours = (Date.now() - new Date(reel.created_at).getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 10 - ageInHours / 24); // Decays over 10 days
    score += recencyBoost;

    // User interest matching
    for (const interest of userInterests) {
      // Check creator match
      if (interest.creator_id === reel.user_id) {
        score += interest.interest_score * 3;
      }

      // Check hashtag match - now properly tracking hashtag interests
      if (interest.hashtag_id && reelHashtags.includes(interest.hashtag_id)) {
        score += interest.interest_score * 2.5;
      }
    }

    return score;
  }, [userInterests]);

  // Get personalized 'For You' feed
  const getForYouFeed = useCallback(async (): Promise<Reel[]> => {
    // Fetch all reels with view count
    const { data: reelsData } = await supabase
      .from("reels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!reelsData || reelsData.length === 0) return [];

    // Fetch hashtags for all reels
    const reelIds = reelsData.map(r => r.id);
    const { data: reelHashtags } = await supabase
      .from("reel_hashtags")
      .select("reel_id, hashtag_id")
      .in("reel_id", reelIds);

    // Group hashtags by reel
    const hashtagsByReel: Record<string, string[]> = {};
    reelHashtags?.forEach(rh => {
      if (!hashtagsByReel[rh.reel_id]) {
        hashtagsByReel[rh.reel_id] = [];
      }
      hashtagsByReel[rh.reel_id].push(rh.hashtag_id);
    });

    // Batch fetch user profiles instead of N+1 queries
    const userIds = [...new Set(reelsData.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const enrichedReels = reelsData.map(reel => ({
      ...reel,
      user: profileMap[reel.user_id]
        ? { username: profileMap[reel.user_id].username, avatar_url: profileMap[reel.user_id].avatar_url }
        : { username: null, avatar_url: null }
    }));

    // Calculate scores and sort
    const scoredReels = enrichedReels.map(reel => ({
      ...reel,
      score: calculateReelScore(reel, hashtagsByReel[reel.id] || [])
    }));

    // Sort by score (highest first) with some randomization for discovery
    scoredReels.sort((a, b) => {
      // Add slight randomization to prevent stale feeds
      const randomFactor = (Math.random() - 0.5) * 5;
      return (b.score || 0) - (a.score || 0) + randomFactor;
    });

    return scoredReels;
  }, [calculateReelScore]);

  // Record a view and update hashtag interests
  const recordView = useCallback(async (reelId: string, watchDuration: number, completed: boolean) => {
    await supabase.from("reel_views").insert({
      reel_id: reelId,
      user_id: user?.id || null,
      watch_duration: watchDuration,
      completed
    });

    // Update hashtag interests for views (lower weight for views)
    if (user && watchDuration > 3) { // Only track if watched more than 3 seconds
      await updateHashtagInterests(reelId, "view");
    }
  }, [user, updateHashtagInterests]);

  return {
    getForYouFeed,
    updateUserInterest,
    updateHashtagInterests,
    recordView,
    userInterests
  };
};
