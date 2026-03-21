import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { StreamerCard } from "@/components/StreamerCard";
import { Search, Filter, Hash, Users, MapPin, TrendingUp, Trophy, Contact, Crown, Sparkles, ChevronDown, ShoppingBag, Tv, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TrendingStreamersSection } from "@/components/TrendingStreamersSection";

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
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [filteredStreamers, setFilteredStreamers] = useState<Streamer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    leaderboard: false,
    suggested: false,
    popular: false,
    watchlive: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Fetch ALL new members (not just streamers)
  const [newMembers, setNewMembers] = useState<Array<{id: string; username: string | null; full_name: string | null; avatar_url: string | null; created_at: string | null}>>([]);
  
  useEffect(() => {
    const fetchNewMembers = async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, created_at")
        .gte("created_at", threeDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) setNewMembers(data);
    };
    fetchNewMembers();
  }, []);

  const filterStreamers = () => {
    let filtered = [...streamers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(query) ||
          s.username?.toLowerCase().includes(query) ||
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

  // Trending streamers for the TrendingStreamersSection
  const trendingStreamers = useMemo(() => 
    [...streamers]
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        username: s.username || s.full_name,
        avatar_url: s.avatar_url,
        average_rating: s.average_rating,
      })),
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
          {/* New Members Section - ALL users */}
          {!searchQuery && newMembers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-foreground">New Members</h2>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                  {newMembers.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {newMembers.slice(0, 15).map((member) => (
                  <Link
                    key={member.id}
                    to={`/streamer/${member.id}`}
                    className="flex flex-col items-center gap-1.5 min-w-[72px]"
                  >
                    <div className="relative">
                      <div className="p-[2px] rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                        <img
                          src={member.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                          alt={member.username || member.full_name || "New member"}
                          className="w-14 h-14 rounded-full object-cover border-2 border-background"
                        />
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full uppercase">
                        New
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate w-full text-center">
                      {member.username || member.full_name || "User"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {/* Leaderboard Section - Collapsible */}
          {!searchQuery && topStreamers.length > 0 && (
            <section>
              <button 
                onClick={() => toggleSection("leaderboard")}
                className="w-full flex items-center gap-2 mb-3 group"
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Leaderboard
                </h2>
                <Link
                  to="/leaderboard"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  • View Full Rankings →
                </Link>
                <ChevronDown className={cn("w-4 h-4 ml-auto text-muted-foreground transition-transform", expandedSections.leaderboard && "rotate-180")} />
              </button>
              {expandedSections.leaderboard && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  {topStreamers.slice(0, 3).map((streamer, index) => (
                    <StreamerCard
                      key={streamer.id}
                      id={streamer.id}
                      name={streamer.full_name || "Anonymous"}
                      profilePicture={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      country={streamer.country || "Unknown"}
                      averageRating={streamer.average_rating}
                      totalReviews={streamer.total_reviews}
                      index={index}
                      rank={index + 1}
                      showRank={true}
                      hasStreamingPlatform={!!(streamer.twitch_url || streamer.kick_url || streamer.youtube_gaming_url)}
                    />
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* Quick Links - Market & Leaderboard */}
          <section className="grid grid-cols-2 gap-3">
            <Link
              to="/store"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground text-sm">Market</p>
                <p className="text-[10px] text-muted-foreground">Gear & accessories</p>
              </div>
            </Link>
            <Link
              to="/leaderboard"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground text-sm">Leaderboard</p>
                <p className="text-[10px] text-muted-foreground">Top streamers</p>
              </div>
            </Link>
          </section>

          {/* Add from Contacts - Mobile Only */}
          <section className="md:hidden">
            <button 
              onClick={() => {
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
              <button onClick={() => toggleSection("suggested")} className="w-full flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-foreground">Suggested for You</h2>
                <ChevronDown className={cn("w-4 h-4 ml-auto text-muted-foreground transition-transform", expandedSections.suggested && "rotate-180")} />
              </button>
              {expandedSections.suggested && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  {suggestedStreamers.slice(0, 3).map((streamer, index) => (
                    <StreamerCard
                      key={streamer.id}
                      id={streamer.id}
                      name={streamer.full_name || "Anonymous"}
                      profilePicture={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      country={streamer.country || "Unknown"}
                      averageRating={streamer.average_rating}
                      totalReviews={streamer.total_reviews}
                      index={index}
                      hasStreamingPlatform={!!(streamer.twitch_url || streamer.kick_url || streamer.youtube_gaming_url)}
                    />
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* Popular This Week */}
          {!searchQuery && popularThisWeek.length > 0 && (
            <section>
              <button onClick={() => toggleSection("popular")} className="w-full flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-foreground">Popular This Week</h2>
                <ChevronDown className={cn("w-4 h-4 ml-auto text-muted-foreground transition-transform", expandedSections.popular && "rotate-180")} />
              </button>
              {expandedSections.popular && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  {popularThisWeek.map((streamer, index) => (
                    <StreamerCard
                      key={streamer.id}
                      id={streamer.id}
                      name={streamer.full_name || "Anonymous"}
                      profilePicture={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      country={streamer.country || "Unknown"}
                      averageRating={streamer.average_rating}
                      totalReviews={streamer.total_reviews}
                      index={index}
                      hasStreamingPlatform={!!(streamer.twitch_url || streamer.kick_url || streamer.youtube_gaming_url)}
                    />
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* Watch Live - Streamers with streaming platforms */}
          {!searchQuery && streamers.filter(s => s.twitch_url || s.kick_url || s.youtube_gaming_url).length > 0 && (
            <section>
              <button onClick={() => toggleSection("watchlive")} className="w-full flex items-center gap-2 mb-3">
                <Tv className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-foreground">Watch Live</h2>
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                <ChevronDown className={cn("w-4 h-4 ml-auto text-muted-foreground transition-transform", expandedSections.watchlive && "rotate-180")} />
              </button>
              {expandedSections.watchlive && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  {streamers
                    .filter(s => s.twitch_url || s.kick_url || s.youtube_gaming_url)
                    .map((streamer, index) => (
                      <StreamerCard
                        key={streamer.id}
                        id={streamer.id}
                        name={streamer.full_name || "Anonymous"}
                        profilePicture={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                        country={streamer.country || "Unknown"}
                        averageRating={streamer.average_rating}
                        totalReviews={streamer.total_reviews}
                        index={index}
                        hasStreamingPlatform={true}
                      />
                    ))}
                </motion.div>
              )}
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
