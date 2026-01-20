import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, MessageCircle, TrendingUp, Clock, Users, Film, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface ReelAnalyticsData {
  id: string;
  caption: string | null;
  video_url: string;
  created_at: string;
  view_count: number;
  duration: number;
  likes_count: number;
  comments_count: number;
  avg_watch_time: number;
  completion_rate: number;
}

const ReelAnalytics = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [reels, setReels] = useState<ReelAnalyticsData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    avgEngagementRate: 0,
    totalWatchTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    // Fetch user's reels
    const { data: reelsData } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!reelsData || reelsData.length === 0) {
      setIsLoading(false);
      return;
    }

    const reelIds = reelsData.map(r => r.id);

    // Fetch likes counts
    const likesPromises = reelIds.map(async (id) => {
      const { count } = await supabase
        .from("reel_likes")
        .select("*", { count: "exact", head: true })
        .eq("reel_id", id);
      return { id, count: count || 0 };
    });

    // Fetch comments counts
    const commentsPromises = reelIds.map(async (id) => {
      const { count } = await supabase
        .from("reel_comments")
        .select("*", { count: "exact", head: true })
        .eq("reel_id", id);
      return { id, count: count || 0 };
    });

    // Fetch view analytics
    const viewsPromises = reelIds.map(async (id) => {
      const { data: views } = await supabase
        .from("reel_views")
        .select("watch_duration, completed")
        .eq("reel_id", id);
      
      const totalWatchTime = views?.reduce((sum, v) => sum + (v.watch_duration || 0), 0) || 0;
      const completedViews = views?.filter(v => v.completed).length || 0;
      const totalViews = views?.length || 0;
      
      return {
        id,
        avgWatchTime: totalViews > 0 ? totalWatchTime / totalViews : 0,
        completionRate: totalViews > 0 ? (completedViews / totalViews) * 100 : 0,
        totalWatchTime,
      };
    });

    const [likesResults, commentsResults, viewsResults] = await Promise.all([
      Promise.all(likesPromises),
      Promise.all(commentsPromises),
      Promise.all(viewsPromises),
    ]);

    // Map data
    const likesMap = Object.fromEntries(likesResults.map(r => [r.id, r.count]));
    const commentsMap = Object.fromEntries(commentsResults.map(r => [r.id, r.count]));
    const viewsMap = Object.fromEntries(viewsResults.map(r => [r.id, r]));

    const enrichedReels: ReelAnalyticsData[] = reelsData.map(reel => ({
      ...reel,
      likes_count: likesMap[reel.id] || 0,
      comments_count: commentsMap[reel.id] || 0,
      avg_watch_time: viewsMap[reel.id]?.avgWatchTime || 0,
      completion_rate: viewsMap[reel.id]?.completionRate || 0,
    }));

    setReels(enrichedReels);

    // Calculate totals
    const totalViews = enrichedReels.reduce((sum, r) => sum + (r.view_count || 0), 0);
    const totalLikes = enrichedReels.reduce((sum, r) => sum + r.likes_count, 0);
    const totalComments = enrichedReels.reduce((sum, r) => sum + r.comments_count, 0);
    const totalWatchTime = viewsResults.reduce((sum, r) => sum + r.totalWatchTime, 0);
    const avgEngagementRate = totalViews > 0 
      ? ((totalLikes + totalComments) / totalViews) * 100 
      : 0;

    setTotalStats({
      totalViews,
      totalLikes,
      totalComments,
      avgEngagementRate,
      totalWatchTime,
    });

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchAnalytics();
    }
  }, [user, loading, fetchAnalytics]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatWatchTime = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    return `${Math.floor(seconds)}s`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Reel Analytics
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(totalStats.totalViews)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(totalStats.totalLikes)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(totalStats.totalComments)}
                  </p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {totalStats.avgEngagementRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Watch Time Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatWatchTime(totalStats.totalWatchTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Watch Time</p>
                  </div>
                </div>
                <Film className="w-8 h-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Individual Reels */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Your Reels
          </h2>

          {reels.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No reels yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create your first reel to see analytics
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reels.map((reel, index) => (
                <motion.div
                  key={reel.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="bg-card border-border cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => navigate(`/reel/${reel.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="w-16 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          <video
                            src={reel.video_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {reel.caption || "No caption"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
                          </p>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-xs">{formatNumber(reel.view_count || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Heart className="w-3.5 h-3.5" />
                              <span className="text-xs">{formatNumber(reel.likes_count)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="text-xs">{formatNumber(reel.comments_count)}</span>
                            </div>
                          </div>

                          {/* Engagement metrics */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Avg watch: </span>
                              <span className="text-primary font-medium">
                                {reel.avg_watch_time.toFixed(1)}s
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="text-muted-foreground">Completion: </span>
                              <span className="text-accent font-medium">
                                {reel.completion_rate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ReelAnalytics;