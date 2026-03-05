import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, TrendingUp, Film, Play, Search, Flame, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelViewer } from "@/components/ReelViewer";
import { Input } from "@/components/ui/input";
import { ReelThumbnail } from "@/components/ReelThumbnail";

interface Hashtag {
  id: string;
  name: string;
  use_count: number;
  is_trending?: boolean;
  daily_count?: number;
}

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  duration: number;
  user_id: string;
  created_at: string;
  user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const TRENDING_THRESHOLD = 1000;

const Hashtags = () => {
  const navigate = useNavigate();
  const { tag } = useParams();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(tag || null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Hashtag[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchTrendingHashtags = useCallback(async () => {
    // Get today's date for daily usage
    const today = new Date().toISOString().split("T")[0];

    // Get daily usage data for today
    const { data: dailyData } = await supabase
      .from("hashtag_daily_usage")
      .select("hashtag_id, daily_count")
      .eq("usage_date", today)
      .gte("daily_count", TRENDING_THRESHOLD)
      .order("daily_count", { ascending: false });

    if (dailyData && dailyData.length > 0) {
      const hashtagIds = dailyData.map(d => d.hashtag_id);
      const { data: hashtagsData } = await supabase
        .from("hashtags")
        .select("*")
        .in("id", hashtagIds);

      if (hashtagsData) {
        const dailyMap = new Map(dailyData.map(d => [d.hashtag_id, d.daily_count]));
        const trending = hashtagsData.map(h => ({
          ...h,
          is_trending: true,
          daily_count: dailyMap.get(h.id) || 0
        })).sort((a, b) => (b.daily_count || 0) - (a.daily_count || 0));
        setTrendingHashtags(trending);
      }
    } else {
      setTrendingHashtags([]);
    }
  }, []);

  const fetchAllHashtags = useCallback(async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .order("use_count", { ascending: false })
      .limit(50);

    if (data) {
      setHashtags(data);
    }
  }, []);

  const searchHashtags = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const cleanQuery = query.replace(/^#/, "");
    
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .ilike("name", `%${cleanQuery}%`)
      .order("use_count", { ascending: false })
      .limit(20);

    setSearchResults(data || []);
    setIsSearching(false);
  }, []);

  const fetchReelsByHashtag = useCallback(async (hashtagName: string) => {
    setLoading(true);
    
    const { data: hashtagData } = await supabase
      .from("hashtags")
      .select("id")
      .eq("name", hashtagName)
      .maybeSingle();

    if (!hashtagData) {
      setReels([]);
      setLoading(false);
      return;
    }

    const { data: reelHashtags } = await supabase
      .from("reel_hashtags")
      .select("reel_id")
      .eq("hashtag_id", hashtagData.id);

    if (!reelHashtags || reelHashtags.length === 0) {
      setReels([]);
      setLoading(false);
      return;
    }

    const reelIds = reelHashtags.map(rh => rh.reel_id);

    const { data: reelsData } = await supabase
      .from("reels")
      .select("*")
      .in("id", reelIds)
      .order("created_at", { ascending: false });

    if (reelsData) {
      const enrichedReels = await Promise.all(
        reelsData.map(async (reel) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", reel.user_id)
            .maybeSingle();
          return { ...reel, user: profileData || { username: null, avatar_url: null } };
        })
      );
      setReels(enrichedReels);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrendingHashtags();
    fetchAllHashtags();
  }, [fetchTrendingHashtags, fetchAllHashtags]);

  useEffect(() => {
    if (selectedHashtag) {
      fetchReelsByHashtag(selectedHashtag);
    } else {
      setReels([]);
      setLoading(false);
    }
  }, [selectedHashtag, fetchReelsByHashtag]);

  useEffect(() => {
    if (tag) setSelectedHashtag(tag);
  }, [tag]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => searchHashtags(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchHashtags]);

  const openReel = (index: number) => {
    setViewerIndex(index);
    setShowViewer(true);
  };

  const handleSelectHashtag = (hashtagName: string) => {
    setSelectedHashtag(hashtagName);
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/hashtags/${hashtagName}`, { replace: true });
  };

  const clearSelection = () => {
    setSelectedHashtag(null);
    navigate("/hashtags", { replace: true });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const displayList = searchQuery.trim() ? searchResults : hashtags;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            {selectedHashtag ? `#${selectedHashtag}` : "Discover"}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Search Bar (only when no hashtag selected) */}
      {!selectedHashtag && (
        <div className="px-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hashtags..."
              className="pl-10 pr-10 bg-secondary rounded-full h-11 border-0"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content when no hashtag selected */}
      {!selectedHashtag && (
        <div className="p-4 space-y-6">
          {/* Trending Section */}
          {!searchQuery.trim() && trendingHashtags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="font-semibold">Trending Today</h2>
              </div>
              
              <div className="space-y-2">
                {trendingHashtags.map((hashtag, index) => (
                  <motion.button
                    key={hashtag.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectHashtag(hashtag.name)}
                    className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-500">#{index + 1}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">#{hashtag.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCount(hashtag.daily_count || 0)} uses today · {formatCount(hashtag.use_count)} total
                      </p>
                    </div>
                    <Flame className="w-4 h-4 text-orange-500" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* All / Search Results */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                {searchQuery.trim() ? <Search className="w-4 h-4 text-primary" /> : <TrendingUp className="w-4 h-4 text-primary" />}
              </div>
              <h2 className="font-semibold">
                {searchQuery.trim() ? `Results for "${searchQuery}"` : "Popular Hashtags"}
              </h2>
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery.trim() ? "No hashtags found" : "No hashtags yet"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {displayList.map((hashtag, index) => (
                  <motion.button
                    key={hashtag.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelectHashtag(hashtag.name)}
                    className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">#{hashtag.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCount(hashtag.use_count)} uses</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Hashtag Reels */}
      {selectedHashtag && (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 mb-3">
            <button onClick={clearSelection} className="text-sm text-primary hover:underline">
              ← All hashtags
            </button>
            <span className="text-sm text-muted-foreground">
              {reels.length} reel{reels.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Reels Yet</h3>
              <p className="text-muted-foreground text-sm">Be the first to use #{selectedHashtag}!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {reels.map((reel, index) => (
                <motion.div
                  key={reel.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-[9/16] cursor-pointer relative group rounded-lg overflow-hidden"
                  onClick={() => openReel(index)}
                >
                  <ReelThumbnail
                    videoUrl={reel.video_url}
                    onClick={() => openReel(index)}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2">
                      <img
                        src={reel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                        alt={reel.user?.username || "User"}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-white text-xs truncate">@{reel.user?.username || "user"}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs">
                    {reel.duration}s
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <ReelViewer
        reels={reels}
        initialIndex={viewerIndex}
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
      />
    </div>
  );
};

export default Hashtags;
