import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { StreamerCard } from "@/components/StreamerCard";
import { Search, Filter, Hash, Users, MapPin, TrendingUp, Trophy, Contact, Crown, Sparkles, Tv } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Streamer {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  average_rating: number;
  total_reviews: number;
  created_at?: string;
  twitch_url?: string | null;
  kick_url?: string | null;
  youtube_gaming_url?: string | null;
}

interface Hashtag {
  id: string;
  name: string;
  use_count: number;
}

const Streamers = () => {
  const navigate = useNavigate();
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [filteredStreamers, setFilteredStreamers] = useState<Streamer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);

  const filters = ["Most Rated", "Trending", "New", "Country"];

  useEffect(() => {
    fetchStreamers();
    fetchTrendingHashtags();
    
    // Set up realtime subscription for streamers
    const channel = supabase
      .channel("streamers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => fetchStreamers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchStreamers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterStreamers();
  }, [searchQuery, streamers, activeFilter]);

  const fetchTrendingHashtags = async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .order("use_count", { ascending: false })
      .limit(10);
    
    if (data) {
      setTrendingHashtags(data);
    }
  };

  const fetchStreamers = async () => {
    // Get all users with streamer role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "streamer");

    if (roleError) {
      console.error("Error fetching streamers:", roleError);
      setLoading(false);
      return;
    }

    const streamerIds = roleData?.map((r) => r.user_id) || [];

    if (streamerIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get streamer profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, country, bio, created_at, twitch_url, kick_url, youtube_gaming_url")
      .in("id", streamerIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      setLoading(false);
      return;
    }

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

    // Sort by rating by default
    streamersWithRatings.sort((a, b) => b.average_rating - a.average_rating);
    
    setStreamers(streamersWithRatings);
    setFilteredStreamers(streamersWithRatings);
    setLoading(false);
  };

  const filterStreamers = () => {
    let filtered = [...streamers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(query) ||
          s.country?.toLowerCase().includes(query)
      );
    }

    // Apply sort filter
    if (activeFilter === "Most Rated") {
      filtered.sort((a, b) => b.average_rating - a.average_rating);
    } else if (activeFilter === "Trending") {
      filtered.sort((a, b) => b.total_reviews - a.total_reviews);
    } else if (activeFilter === "New") {
      filtered.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } else if (activeFilter === "Country") {
      filtered.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
    }

    setFilteredStreamers(filtered);
  };

  // Derived data for sections
  const topStreamers = useMemo(() => 
    [...streamers].sort((a, b) => b.average_rating - a.average_rating).slice(0, 5),
    [streamers]
  );

  const popularThisWeek = useMemo(() => 
    [...streamers].sort((a, b) => b.total_reviews - a.total_reviews).slice(0, 5),
    [streamers]
  );

  const suggestedStreamers = useMemo(() => 
    [...streamers].sort(() => Math.random() - 0.5).slice(0, 5),
    [streamers]
  );

  // Streamers with streaming platform links
  const streamingStreamers = useMemo(() => 
    streamers.filter(s => s.twitch_url || s.kick_url || s.youtube_gaming_url),
    [streamers]
  );

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-foreground mb-4"
            >
              Discover
            </motion.h1>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streamers, hashtags..."
                  className="pl-10 pr-4 bg-secondary/80 border-border/50 focus:bg-secondary"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-lg border transition-all",
                  showFilters 
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex flex-wrap gap-2"
              >
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() =>
                      setActiveFilter(activeFilter === filter ? null : filter)
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </header>

        <main className="px-4 py-4 space-y-6">
          {/* Trending Hashtags Section */}
          {trendingHashtags.length > 0 && !searchQuery && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Trending Hashtags</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/hashtags/${tag.name}`}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    #{tag.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {tag.use_count}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Live Streams Section */}
          {!searchQuery && streamingStreamers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Tv className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-foreground">Watch Streams</h2>
                <span className="text-xs text-muted-foreground">• Tap to watch</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {streamingStreamers.slice(0, 6).map((streamer) => (
                  <Link
                    key={streamer.id}
                    to={`/streamer/${streamer.id}`}
                    className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <img
                      src={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      alt={streamer.full_name || "Streamer"}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {streamer.username || streamer.full_name || "Streamer"}
                      </p>
                      <div className="flex items-center gap-1">
                        {streamer.twitch_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Twitch</span>}
                        {streamer.youtube_gaming_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">YT</span>}
                        {streamer.kick_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Kick</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard Section */}
          {!searchQuery && topStreamers.length > 0 && (
            <section>
              <button 
                onClick={() => navigate("/leaderboard")}
                className="flex items-center gap-2 mb-3 group"
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Leaderboard
                </h2>
                <span className="text-xs text-muted-foreground">• View Full Rankings →</span>
              </button>
              <div className="space-y-2">
                {topStreamers.slice(0, 3).map((streamer, index) => (
                  <StreamerCard
                    key={streamer.id}
                    id={streamer.id}
                    name={streamer.full_name || "Anonymous"}
                    profilePicture={
                      streamer.avatar_url ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                    }
                    country={streamer.country || "Unknown"}
                    averageRating={streamer.average_rating}
                    totalReviews={streamer.total_reviews}
                    index={index}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add from Contacts - Mobile Only */}
          <section className="md:hidden">
            <button 
              onClick={() => {
                // This would trigger native contacts API in a mobile app
                navigator.vibrate?.(50);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Contact className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground">Add Streamers from Contacts</p>
                <p className="text-xs text-muted-foreground">Find friends who are on StreamRate</p>
              </div>
            </button>
          </section>

          {/* Suggested Streamers */}
          {!searchQuery && suggestedStreamers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-foreground">Suggested for You</h2>
              </div>
              <div className="space-y-2">
                {suggestedStreamers.slice(0, 3).map((streamer, index) => (
                  <StreamerCard
                    key={streamer.id}
                    id={streamer.id}
                    name={streamer.full_name || "Anonymous"}
                    profilePicture={
                      streamer.avatar_url ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                    }
                    country={streamer.country || "Unknown"}
                    averageRating={streamer.average_rating}
                    totalReviews={streamer.total_reviews}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Popular This Week */}
          {!searchQuery && popularThisWeek.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-foreground">Popular This Week</h2>
              </div>
              <div className="space-y-2">
                {popularThisWeek.map((streamer, index) => (
                  <StreamerCard
                    key={streamer.id}
                    id={streamer.id}
                    name={streamer.full_name || "Anonymous"}
                    profilePicture={
                      streamer.avatar_url ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                    }
                    country={streamer.country || "Unknown"}
                    averageRating={streamer.average_rating}
                    totalReviews={streamer.total_reviews}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Streamers (when searching or filtered) */}
          {(searchQuery || activeFilter) && (
            <section>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredStreamers.length} streamers found
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredStreamers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No streamers found" : "No streamers registered yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStreamers.map((streamer, index) => (
                    <StreamerCard
                      key={streamer.id}
                      id={streamer.id}
                      name={streamer.full_name || "Anonymous"}
                      profilePicture={
                        streamer.avatar_url ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                      }
                      country={streamer.country || "Unknown"}
                      averageRating={streamer.average_rating}
                      totalReviews={streamer.total_reviews}
                      index={index}
                      rank={index + 1}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </AppLayout>
  );
};

export default Streamers;
