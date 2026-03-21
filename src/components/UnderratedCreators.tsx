import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

interface Creator {
  id: string;
  username: string | null;
  avatar_url: string | null;
  followers_count: number;
  avg_rating: number;
}

export const UnderratedCreators = () => {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .limit(200);

      if (!profiles || profiles.length === 0) return;

      // Get follow counts
      const { data: followsData } = await supabase.from("follows").select("following_id");
      const followCounts: Record<string, number> = {};
      (followsData || []).forEach((f) => {
        followCounts[f.following_id] = (followCounts[f.following_id] || 0) + 1;
      });

      // Get ratings
      const { data: ratingsData } = await supabase.from("ratings").select("streamer_id, stars");
      const ratingMap: Record<string, number[]> = {};
      (ratingsData || []).forEach((r) => {
        if (!ratingMap[r.streamer_id]) ratingMap[r.streamer_id] = [];
        ratingMap[r.streamer_id].push(r.stars);
      });

      // Filter: under 100 followers, has content
      const underrated = profiles
        .map((p) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          followers_count: followCounts[p.id] || 0,
          avg_rating: ratingMap[p.id]
            ? ratingMap[p.id].reduce((a, b) => a + b, 0) / ratingMap[p.id].length
            : 0,
        }))
        .filter((p) => p.followers_count < 100 && p.followers_count > 0)
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 5);

      setCreators(underrated);
    };
    fetch();
  }, []);

  if (creators.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm text-foreground">Overrated Creators</h3>
        <span className="text-xs text-muted-foreground">🔥 Most hyped</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {creators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-24"
          >
            <Link
              to={`/streamer/${creator.id}`}
              className="block bg-card border border-border rounded-xl p-3 text-center cursor-pointer hover:border-accent/50 transition-colors"
            >
            <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden border-2 border-accent/30">
              <img
                src={creator.avatar_url || getDefaultAvatar()}
                alt={creator.username || ""}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs font-medium text-foreground truncate">
              @{creator.username || "user"}
            </p>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-muted-foreground">
                {creator.avg_rating.toFixed(1)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {creator.followers_count} followers
            </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
