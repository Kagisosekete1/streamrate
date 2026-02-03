import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Award, Star, ArrowLeft, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";

interface Streamer {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  average_rating: number;
  total_reviews: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Set up realtime subscription
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => fetchLeaderboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    // Get all users with streamer role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "streamer");

    const streamerIds = roleData?.map((r) => r.user_id) || [];

    if (streamerIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get streamer profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, country")
      .in("id", streamerIds);

    // Get ratings for each streamer
    const streamersWithRatings = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: ratings } = await supabase
          .from("ratings")
          .select("stars")
          .eq("streamer_id", profile.id);

        const totalReviews = ratings?.length || 0;
        const averageRating =
          totalReviews > 0
            ? Math.round(
                (ratings!.reduce((sum, r) => sum + r.stars, 0) / totalReviews) * 10
              ) / 10
            : 0;

        return {
          ...profile,
          average_rating: averageRating,
          total_reviews: totalReviews,
        };
      })
    );

    // Sort by rating
    streamersWithRatings.sort((a, b) => {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
      return b.total_reviews - a.total_reviews;
    });

    setStreamers(streamersWithRatings);
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30";
      default:
        return "bg-card border-border/50";
    }
  };

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h1 className="text-lg font-semibold text-foreground">Leaderboard</h1>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Top 3 Podium - Only show if we have at least 3 streamers */}
        {!loading && streamers.length >= 3 && streamers[0] && streamers[1] && streamers[2] && (
          <div className="px-4 py-6">
            <div className="flex items-end justify-center gap-3">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <img
                    src={streamers[1]?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                    alt={streamers[1]?.full_name || ""}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-400"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold">
                    2
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground text-center truncate max-w-20">
                  {streamers[1]?.username || streamers[1]?.full_name || "User"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">{streamers[1]?.average_rating}</span>
                </div>
                <div className="h-16 w-20 bg-gray-400/30 rounded-t-lg mt-2" />
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center -mb-4"
              >
                <Crown className="w-8 h-8 text-yellow-500 mb-1" />
                <div className="relative">
                  <img
                    src={streamers[0]?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                    alt={streamers[0]?.full_name || ""}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-yellow-500"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-bold">
                    1
                  </div>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground text-center truncate max-w-24">
                  {streamers[0]?.username || streamers[0]?.full_name || "User"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">{streamers[0]?.average_rating}</span>
                </div>
                <div className="h-24 w-24 bg-yellow-500/30 rounded-t-lg mt-2" />
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <img
                    src={streamers[2]?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                    alt={streamers[2]?.full_name || ""}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-amber-600"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">
                    3
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground text-center truncate max-w-20">
                  {streamers[2]?.username || streamers[2]?.full_name || "User"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">{streamers[2]?.average_rating}</span>
                </div>
                <div className="h-12 w-20 bg-amber-600/30 rounded-t-lg mt-2" />
              </motion.div>
            </div>
          </div>
        )}

        {/* Full Rankings List */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Full Rankings</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : streamers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No streamers ranked yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streamers.map((streamer, index) => (
                <motion.button
                  key={streamer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate(`/streamer/${streamer.id}`)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01]",
                    getRankStyle(index + 1)
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 flex items-center justify-center">
                    {getRankIcon(index + 1) || (
                      <span className="text-lg font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                    alt={streamer.full_name || ""}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {streamer.username || streamer.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {streamer.country || "Unknown"} • {streamer.total_reviews} reviews
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1.5 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-foreground">
                      {streamer.average_rating || "N/A"}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
