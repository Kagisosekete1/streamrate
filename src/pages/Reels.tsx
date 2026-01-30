import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Film, Play, Hash, Eye, Sparkles, BarChart3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelViewer } from "@/components/ReelViewer";
import { BottomNav } from "@/components/BottomNav";
import { useForYouAlgorithm } from "@/hooks/useForYouAlgorithm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  duration: number;
  user_id: string;
  created_at: string;
  view_count?: number;
  user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const Reels = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [forYouReels, setForYouReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("foryou");
  const { getForYouFeed } = useForYouAlgorithm();

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

  const fetchForYouReels = useCallback(async () => {
    const fyReels = await getForYouFeed();
    setForYouReels(fyReels);
  }, [getForYouFeed]);

  useEffect(() => {
    fetchReels();
    fetchForYouReels();
  }, [fetchReels, fetchForYouReels]);

  // Format view count
  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const openReel = (index: number, isForYou: boolean = false) => {
    setViewerIndex(index);
    setActiveTab(isForYou ? "foryou" : "latest");
    setShowViewer(true);
  };

  const currentReelsList = activeTab === "foryou" ? forYouReels : reels;

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
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Reels</h1>
          <div className="flex items-center gap-2">
            {user && (
              <button 
                onClick={() => navigate("/analytics/reels")}
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => navigate("/hashtags")}
              className="p-2 text-primary"
            >
              <Hash className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs for For You / Latest */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-lg px-4 py-2">
          <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto h-9">
            <TabsTrigger value="foryou" className="gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              For You
            </TabsTrigger>
            <TabsTrigger value="latest" className="gap-1.5 text-sm">
              <Film className="w-3.5 h-3.5" />
              Latest
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="foryou" className="p-1.5 mt-0">
          {forYouReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Discover Reels</h3>
              <p className="text-muted-foreground text-sm px-8">
                Watch and interact with reels to get personalized recommendations
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {forYouReels.map((reel, index) => (
                <ReelCard 
                  key={reel.id} 
                  reel={reel} 
                  index={index} 
                  onOpen={() => openReel(index, true)}
                  formatViewCount={formatViewCount}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="latest" className="p-1.5 mt-0">
          {reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Film className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">No Reels Yet</h3>
              <p className="text-muted-foreground text-sm px-8">
                Be the first to share a reel!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {reels.map((reel, index) => (
                <ReelCard 
                  key={reel.id} 
                  reel={reel} 
                  index={index} 
                  onOpen={() => openReel(index, false)}
                  formatViewCount={formatViewCount}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reel Viewer */}
      <ReelViewer
        reels={currentReelsList}
        initialIndex={viewerIndex}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          // Update URL when closing viewer
          if (id) {
            navigate("/reels", { replace: true });
          }
          // Refresh For You feed after watching
          fetchForYouReels();
        }}
      />

      <BottomNav />
    </div>
  );
};

// Reusable Reel Card Component - Uses video frame as thumbnail
const ReelCard = ({ 
  reel, 
  index, 
  onOpen, 
  formatViewCount 
}: { 
  reel: Reel; 
  index: number; 
  onOpen: () => void;
  formatViewCount: (count: number) => string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="aspect-[9/16] cursor-pointer relative group overflow-hidden bg-secondary rounded-lg"
      onClick={onOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video element - shows first frame as thumbnail, plays on hover */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
      
      {/* Play icon overlay - shown when not hovering */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>
      
      {/* Bottom gradient info */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <img
              src={reel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
              alt={reel.user?.username || "User"}
              className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-white/30"
            />
            <span className="text-white text-[10px] truncate font-medium">
              {reel.user?.username || "user"}
            </span>
          </div>
          {/* View count */}
          <div className="flex items-center gap-0.5 text-white/90">
            <Eye className="w-2.5 h-2.5" />
            <span className="text-[10px] font-medium">{formatViewCount(reel.view_count || 0)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Reels;