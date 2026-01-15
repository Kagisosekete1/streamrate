import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, TrendingUp, Film, Play } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelViewer } from "@/components/ReelViewer";

interface Hashtag {
  id: string;
  name: string;
  use_count: number;
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

const Hashtags = () => {
  const navigate = useNavigate();
  const { tag } = useParams();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(tag || null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchTrendingHashtags = useCallback(async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .order("use_count", { ascending: false })
      .limit(50);

    if (data) {
      setHashtags(data);
    }
  }, []);

  const fetchReelsByHashtag = useCallback(async (hashtagName: string) => {
    setLoading(true);
    
    // First get the hashtag ID
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

    // Get reels linked to this hashtag
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
      // Enrich with user data
      const enrichedReels = await Promise.all(
        reelsData.map(async (reel) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", reel.user_id)
            .maybeSingle();

          return {
            ...reel,
            user: profileData || { username: null, avatar_url: null }
          };
        })
      );
      setReels(enrichedReels);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrendingHashtags();
  }, [fetchTrendingHashtags]);

  useEffect(() => {
    if (selectedHashtag) {
      fetchReelsByHashtag(selectedHashtag);
    } else {
      setReels([]);
      setLoading(false);
    }
  }, [selectedHashtag, fetchReelsByHashtag]);

  useEffect(() => {
    if (tag) {
      setSelectedHashtag(tag);
    }
  }, [tag]);

  const openReel = (index: number) => {
    setViewerIndex(index);
    setShowViewer(true);
  };

  const handleSelectHashtag = (hashtagName: string) => {
    setSelectedHashtag(hashtagName);
    navigate(`/hashtags/${hashtagName}`, { replace: true });
  };

  const clearSelection = () => {
    setSelectedHashtag(null);
    navigate("/hashtags", { replace: true });
  };

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

      {/* Trending Hashtags Section */}
      {!selectedHashtag && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Trending Hashtags</h2>
          </div>
          
          {hashtags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hashtags yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {hashtags.map((hashtag, index) => (
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
                      <p className="text-xs text-muted-foreground">{hashtag.use_count} reels</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Hashtag Reels */}
      {selectedHashtag && (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 mb-3">
            <button
              onClick={clearSelection}
              className="text-sm text-primary hover:underline"
            >
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
              <p className="text-muted-foreground text-sm">
                Be the first to use #{selectedHashtag}!
              </p>
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
                  <video
                    src={reel.video_url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2">
                      <img
                        src={reel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                        alt={reel.user?.username || "User"}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-white text-xs truncate">
                        @{reel.user?.username || "user"}
                      </span>
                    </div>
                  </div>
                  {/* Duration badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs">
                    {reel.duration}s
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reel Viewer */}
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
