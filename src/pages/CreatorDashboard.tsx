import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Star, Eye, Clapperboard, MessageCircle, BarChart3, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { XPLevelBadge } from "@/components/XPLevelBadge";
import { CoinBalance } from "@/components/CoinBalance";
import { useGamification } from "@/hooks/useGamification";

interface Stats {
  followers: number;
  ratings: number;
  avgRating: number;
  totalReelViews: number;
  totalPostLikes: number;
  totalComments: number;
  profileViews: number;
  reelsCount: number;
  postsCount: number;
}

const CreatorDashboard = () => {
  const { user } = useAuth();
  const { xp, coins } = useGamification();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topRaters, setTopRaters] = useState<{ username: string; stars: number; avatar_url: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      setLoading(true);

      const [
        { count: followers },
        { data: ratingsData },
        { data: reelsData },
        { count: postsCount },
        { data: postLikesData },
        { data: commentsData },
        { count: profileViews },
      ] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("ratings").select("stars, fan_id").eq("streamer_id", user.id),
        supabase.from("reels").select("id, view_count").eq("user_id", user.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("post_likes").select("post_id, posts!inner(user_id)").eq("posts.user_id", user.id),
        supabase.from("comments").select("post_id, posts!inner(user_id)").eq("posts.user_id", user.id),
        supabase.from("profile_views").select("*", { count: "exact", head: true }).eq("profile_id", user.id),
      ]);

      const ratings = ratingsData || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
      const totalReelViews = (reelsData || []).reduce((s, r) => s + (r.view_count || 0), 0);

      // Get top raters
      const fanIds = [...new Set(ratings.map((r) => r.fan_id))].slice(0, 5);
      let raters: typeof topRaters = [];
      if (fanIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", fanIds);
        raters = fanIds.map((fid) => {
          const p = profiles?.find((pr) => pr.id === fid);
          const r = ratings.find((rt) => rt.fan_id === fid);
          return { username: p?.username || "Anonymous", stars: r?.stars || 0, avatar_url: p?.avatar_url };
        });
      }

      setTopRaters(raters);
      setStats({
        followers: followers || 0,
        ratings: ratings.length,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReelViews,
        totalPostLikes: postLikesData?.length || 0,
        totalComments: commentsData?.length || 0,
        profileViews: profileViews || 0,
        reelsCount: reelsData?.length || 0,
        postsCount: postsCount || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { label: "Followers", value: stats?.followers || 0, icon: Users, color: "text-primary" },
    { label: "Avg Rating", value: stats?.avgRating || 0, icon: Star, color: "text-yellow-500" },
    { label: "Reviews", value: stats?.ratings || 0, icon: Star, color: "text-accent" },
    { label: "Profile Views", value: stats?.profileViews || 0, icon: Eye, color: "text-green-500" },
    { label: "Reel Views", value: stats?.totalReelViews || 0, icon: Clapperboard, color: "text-purple-500" },
    { label: "Post Likes", value: stats?.totalPostLikes || 0, icon: TrendingUp, color: "text-pink-500" },
    { label: "Comments", value: stats?.totalComments || 0, icon: MessageCircle, color: "text-blue-400" },
    { label: "Total Posts", value: stats?.postsCount || 0, icon: BarChart3, color: "text-orange-500" },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg text-foreground">Creator Dashboard</h1>
            </div>
            <CoinBalance balance={coins.balance} compact />
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
          <XPLevelBadge level={xp.level} totalXP={xp.total_xp} streakDays={xp.streak_days} />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {typeof stat.value === "number" && stat.value >= 1000
                      ? `${(stat.value / 1000).toFixed(1)}k`
                      : stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Top Raters */}
          {topRaters.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Recent Raters
              </h3>
              <div className="space-y-2">
                {topRaters.map((rater, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                        {rater.avatar_url ? (
                          <img src={rater.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {rater.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-foreground">@{rater.username}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      {Array.from({ length: rater.stars }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-3">🏆 Milestones</h3>
            <div className="space-y-2">
              {[
                { label: "50,000 Followers", target: 50000, current: stats?.followers || 0 },
                { label: "25,000 Ratings", target: 25000, current: stats?.ratings || 0 },
                { label: "1M Reel Views", target: 1000000, current: stats?.totalReelViews || 0 },
              ].map((milestone) => {
                const pct = Math.min((milestone.current / milestone.target) * 100, 100);
                return (
                  <div key={milestone.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{milestone.label}</span>
                      <span className="text-muted-foreground">
                        {milestone.current.toLocaleString()}/{milestone.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatorDashboard;
