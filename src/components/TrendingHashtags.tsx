import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hash, TrendingUp, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TrendingHashtag {
  id: string;
  name: string;
  use_count: number;
  daily_count?: number;
  is_trending?: boolean;
}

const TRENDING_THRESHOLD = 1000;

export const TrendingHashtags = () => {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Try to get daily trending first
    const { data: dailyData } = await supabase
      .from("hashtag_daily_usage")
      .select("hashtag_id, daily_count")
      .eq("usage_date", today)
      .gte("daily_count", TRENDING_THRESHOLD)
      .order("daily_count", { ascending: false })
      .limit(10);

    if (dailyData && dailyData.length > 0) {
      const hashtagIds = dailyData.map(d => d.hashtag_id);
      const { data: hashtagsData } = await supabase
        .from("hashtags")
        .select("id, name, use_count")
        .in("id", hashtagIds);

      if (hashtagsData) {
        const dailyMap = new Map(dailyData.map(d => [d.hashtag_id, d.daily_count]));
        const trending = hashtagsData.map(h => ({
          ...h,
          is_trending: true,
          daily_count: dailyMap.get(h.id) || 0
        })).sort((a, b) => (b.daily_count || 0) - (a.daily_count || 0));
        setHashtags(trending);
        setLoading(false);
        return;
      }
    }

    // Fallback: show popular hashtags by total use_count
    const { data } = await supabase
      .from("hashtags")
      .select("id, name, use_count")
      .order("use_count", { ascending: false })
      .limit(10);

    if (data) {
      setHashtags(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-secondary animate-pulse" />
          <div className="w-32 h-5 rounded bg-secondary animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-24 h-8 rounded-full bg-secondary animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return null;
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getHashtagStyle = (index: number, isTrending?: boolean) => {
    if (isTrending && index === 0) {
      return "bg-gradient-to-r from-primary to-accent text-primary-foreground border-0";
    }
    if (isTrending || index < 3) {
      return "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30";
    }
    return "bg-secondary/50 text-foreground border-border hover:bg-secondary";
  };

  return (
    <section className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Trending Hashtags</h2>
          </div>
          <button 
            onClick={() => navigate("/hashtags")}
            className="text-sm text-primary hover:underline"
          >
            See all
          </button>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {hashtags.map((hashtag, index) => (
          <motion.button
            key={hashtag.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/hashtags/${hashtag.name}`)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all flex-shrink-0 ${getHashtagStyle(index, hashtag.is_trending)}`}
          >
            {hashtag.is_trending ? (
              <Flame className="w-3.5 h-3.5" />
            ) : index === 0 ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <Hash className="w-3.5 h-3.5" />
            )}
            <span className="text-sm font-medium whitespace-nowrap">{hashtag.name}</span>
            <span className={`text-xs ${(hashtag.is_trending && index === 0) ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {formatCount(hashtag.daily_count || hashtag.use_count)}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
};
