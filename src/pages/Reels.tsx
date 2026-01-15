import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Film, Play, Hash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelViewer } from "@/components/ReelViewer";
import { BottomNav } from "@/components/BottomNav";

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

const Reels = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchReels = useCallback(async () => {
    const { data: reelsData } = await supabase
      .from("reels")
      .select("*")
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

      // If specific reel ID is provided, open viewer at that index
      if (id) {
        const index = enrichedReels.findIndex(r => r.id === id);
        if (index !== -1) {
          setViewerIndex(index);
          setShowViewer(true);
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const openReel = (index: number) => {
    setViewerIndex(index);
    setShowViewer(true);
  };

  if (loading) {
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
          <h1 className="text-lg font-semibold text-foreground">Reels</h1>
          <button 
            onClick={() => navigate("/hashtags")}
            className="p-2 -mr-2 text-primary"
          >
            <Hash className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Reels Grid */}
      <div className="p-2">
        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reels Yet</h3>
            <p className="text-muted-foreground text-sm">
              Be the first to share a reel!
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
                {/* Play icon overlay - always visible on mobile */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-100 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </div>
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

      {/* Reel Viewer */}
      <ReelViewer
        reels={reels}
        initialIndex={viewerIndex}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          // Update URL when closing viewer
          if (id) {
            navigate("/reels", { replace: true });
          }
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Reels;