import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StreamerCard } from "@/components/StreamerCard";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

interface Streamer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  average_rating: number;
  total_reviews: number;
}

const Streamers = () => {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [filteredStreamers, setFilteredStreamers] = useState<Streamer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filters = ["Most Rated", "Trending", "New", "Country"];

  useEffect(() => {
    fetchStreamers();
  }, []);

  useEffect(() => {
    filterStreamers();
  }, [searchQuery, streamers, activeFilter]);

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
      .select("id, full_name, avatar_url, country, bio")
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
      // Would need created_at field, for now just reverse
      filtered.reverse();
    } else if (activeFilter === "Country") {
      filtered.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
    }

    setFilteredStreamers(filtered);
  };

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
            Discover Streamers
          </motion.h1>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, country..."
                className="pl-10 pr-4 bg-secondary/80 border-border/50 focus:bg-secondary"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 w-11 flex items-center justify-center rounded-lg bg-secondary border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
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

      {/* Streamers List */}
      <main className="px-4 py-4">
        <p className="text-sm text-muted-foreground mb-4">
          {filteredStreamers.length} streamers found
        </p>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading streamers...
          </div>
        ) : filteredStreamers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No streamers found" : "No streamers registered yet"}
          </div>
        ) : (
          <div className="space-y-3">
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
      </main>

      </div>
    </AppLayout>
  );
};

export default Streamers;
