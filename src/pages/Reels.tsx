import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelViewer } from "@/components/ReelViewer";
import { useForYouAlgorithm } from "@/hooks/useForYouAlgorithm";
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
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reelIdFromQuery = searchParams.get("reelId");
  const targetReelId = id || reelIdFromQuery;
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [forYouReels, setForYouReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"foryou" | "latest">("latest");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const REELS_PER_PAGE = 20;
  const { getForYouFeed } = useForYouAlgorithm();

  const fetchReels = useCallback(async () => {
    try {
      // Fetch reels and profiles in parallel for faster loading
      const reelsPromise = supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, REELS_PER_PAGE - 1);

      const [{ data: reelsData, error }] = await Promise.all([reelsPromise]);

      if (error) {
        console.error("Error fetching reels:", error);
        setLoading(false);
        return;
      }

      if (reelsData && reelsData.length > 0) {
        // Fetch profiles in parallel immediately
        const userIds = [...new Set(reelsData.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = profiles ? Object.fromEntries(profiles.map(p => [p.id, p])) : {};

        // Shuffle and enrich in one pass
        const enriched = [...reelsData]
          .sort(() => Math.random() - 0.5)
          .map(reel => ({
            ...reel,
            user: profileMap[reel.user_id]
              ? { username: profileMap[reel.user_id].username, avatar_url: profileMap[reel.user_id].avatar_url }
              : { username: null, avatar_url: null }
          }));

        setReels(enriched);
        setHasMore(reelsData.length >= REELS_PER_PAGE);
      } else {
        setReels([]);
      }
    } catch (err) {
      console.error("Error in fetchReels:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchForYouReels = useCallback(async () => {
    const fyReels = await getForYouFeed();
    setForYouReels(fyReels);
  }, [getForYouFeed]);

  const loadMoreReels = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = reels.length;
      const { data: moreData } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + REELS_PER_PAGE - 1);

      if (!moreData || moreData.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      setHasMore(moreData.length >= REELS_PER_PAGE);

      const userIds = [...new Set(moreData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      const profileMap = profiles ? Object.fromEntries(profiles.map(p => [p.id, p])) : {};

      const enriched = moreData.map(reel => ({
        ...reel,
        user: profileMap[reel.user_id]
          ? { username: profileMap[reel.user_id].username, avatar_url: profileMap[reel.user_id].avatar_url }
          : { username: null, avatar_url: null }
      }));

      setReels(prev => [...prev, ...enriched]);
    } catch (err) {
      console.error("Error loading more reels:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, reels.length]);

  useEffect(() => {
    fetchReels();
    fetchForYouReels();
  }, [fetchReels, fetchForYouReels]);

  const currentReelsList = activeTab === "foryou" ? forYouReels : reels;

  // Find initial index if deep-linked
  const initialIndex = targetReelId ? Math.max(0, currentReelsList.findIndex(r => r.id === targetReelId)) : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (currentReelsList.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white text-center p-4">
        <div>
          <p className="text-lg font-semibold mb-2">No Reels Yet</p>
          <p className="text-white/60 text-sm">Be the first to share a reel!</p>
        </div>
      </div>
    );
  }

  return (
    <ReelViewer
      reels={currentReelsList}
      initialIndex={initialIndex}
      isOpen={true}
      onClose={() => window.history.back()}
      onLoadMore={activeTab === "latest" ? loadMoreReels : undefined}
      showTabs={true}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as "foryou" | "latest")}
    />
  );
};

export default Reels;
