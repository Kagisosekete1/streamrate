import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Music2, Flag, UserPlus, Eye, Layers, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HashtagText } from "@/components/HashtagText";
import { LinkPreview } from "@/components/LinkPreview";
import { extractFirstUrl } from "@/lib/urlPreview";
import { useForYouAlgorithm } from "@/hooks/useForYouAlgorithm";
import { DuetStitchModal } from "@/components/DuetStitchModal";
import { ReelComments } from "@/components/ReelComments";
import { AvatarViewModal } from "@/components/AvatarViewModal";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { ReportBlockModal } from "@/components/ReportBlockModal";

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

interface ReelViewerProps {
  reels: Reel[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onLoadMore?: () => void;
  showTabs?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ReelViewer = ({ reels, initialIndex = 0, isOpen, onClose, onLoadMore, showTabs, activeTab, onTabChange }: ReelViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { recordView, updateUserInterest, updateHashtagInterests } = useForYouAlgorithm();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideDirection, setSlideDirection] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [likesData, setLikesData] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [viewsCount, setViewsCount] = useState<Record<string, number>>({});
  const [viewRecorded, setViewRecorded] = useState<Record<string, boolean>>({});
  const [showDuetStitch, setShowDuetStitch] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [doubleTapPosition, setDoubleTapPosition] = useState({ x: 0, y: 0 });
  const [showAvatarView, setShowAvatarView] = useState(false);
  const [showReportBlock, setShowReportBlock] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const lastTapTime = useRef<number>(0);
  const viewStartTime = useRef<number>(0);
  const preloadedVideosRef = useRef<Record<string, HTMLVideoElement>>({});
  const playbackRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVideoTimeRef = useRef(0);
  const stalledChecksRef = useRef(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (playbackRetryTimeoutRef.current) {
        clearTimeout(playbackRetryTimeoutRef.current);
      }
      if (waitingRetryTimeoutRef.current) {
        clearTimeout(waitingRetryTimeoutRef.current);
      }
      if (playbackWatchdogRef.current) {
        clearInterval(playbackWatchdogRef.current);
      }
    };
  }, []);

  // Get current reel safely
  const currentReel = reels[currentIndex] || null;

  // Fetch likes, comments, and views data
  const fetchReelData = useCallback(async (reelId: string) => {
    if (!reelId) return;
    
    const { count: likesCount } = await supabase
      .from("reel_likes")
      .select("*", { count: "exact", head: true })
      .eq("reel_id", reelId);

    let isLiked = false;
    if (user) {
      const { data: likeData } = await supabase
        .from("reel_likes")
        .select("id")
        .eq("reel_id", reelId)
        .eq("user_id", user.id)
        .maybeSingle();
      isLiked = !!likeData;
    }

    setLikesData(prev => ({
      ...prev,
      [reelId]: { count: likesCount || 0, isLiked }
    }));

    const { count: commCount } = await supabase
      .from("reel_comments")
      .select("*", { count: "exact", head: true })
      .eq("reel_id", reelId);

    setCommentsCount(prev => ({
      ...prev,
      [reelId]: commCount || 0
    }));

    // Fetch view count from reels table
    const { data: reelData } = await supabase
      .from("reels")
      .select("view_count")
      .eq("id", reelId)
      .maybeSingle();

    setViewsCount(prev => ({
      ...prev,
      [reelId]: reelData?.view_count || 0
    }));
  }, [user]);

  // Check if following user
  const checkFollowing = useCallback(async (userId: string) => {
    if (!user || !userId || user.id === userId) return;
    
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    
    setIsFollowing(prev => ({
      ...prev,
      [userId]: !!data
    }));
  }, [user]);

  // Preload next 2 videos for instant switching
  useEffect(() => {
    if (!isOpen || reels.length === 0) return;

    const preloadVideo = (url: string, reelId: string) => {
      if (preloadedVideosRef.current[reelId]) return; // Already preloaded
      
      const video = document.createElement("video");
      video.src = url;
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.controls = false;
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("x-webkit-airplay", "allow");
      video.load();

      preloadedVideosRef.current[reelId] = video;
    };

    // Preload next 2 reels
    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < reels.length) {
        preloadVideo(reels[nextIndex].video_url, reels[nextIndex].id);
      }
    }

    // Also preload previous reel for going back
    if (currentIndex > 0) {
      preloadVideo(reels[currentIndex - 1].video_url, reels[currentIndex - 1].id);
    }
  }, [currentIndex, isOpen, reels]);

  // Cleanup preloaded videos on unmount
  useEffect(() => {
    return () => {
      Object.values(preloadedVideosRef.current).forEach((video) => {
        video.src = "";
        video.load();
      });
      preloadedVideosRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (isOpen && currentReel) {
      fetchReelData(currentReel.id);
      checkFollowing(currentReel.user_id);
      viewStartTime.current = Date.now();
      
      // Update user interest for viewing this creator
      updateUserInterest("creator", currentReel.user_id, "view");
    }
  }, [isOpen, currentReel?.id, currentReel?.user_id, fetchReelData, checkFollowing, updateUserInterest]);

  // Record view when switching reels or closing
  useEffect(() => {
    const reelId = currentReel?.id;
    const duration = currentReel?.duration;
    
    return () => {
      if (reelId && viewStartTime.current > 0 && !viewRecorded[reelId]) {
        const watchDuration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        const completed = duration ? watchDuration >= duration * 0.8 : false; // 80% watched
        recordView(reelId, watchDuration, completed);
        setViewRecorded(prev => ({ ...prev, [reelId]: true }));

        // Award XP for watching reel
        if (user && completed) {
          supabase.from("user_xp").select("total_xp, level").eq("user_id", user.id).single().then(({ data: xpData }) => {
            if (xpData) {
              const newXp = xpData.total_xp + 10;
              const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
              supabase.from("user_xp").update({ total_xp: newXp, level: newLevel }).eq("user_id", user.id);
            }
          });
        }
      }
    };
  }, [currentReel?.id, currentReel?.duration, recordView, viewRecorded]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Play/pause video
  useEffect(() => {
    if (waitingRetryTimeoutRef.current) {
      clearTimeout(waitingRetryTimeoutRef.current);
    }
    if (playbackRetryTimeoutRef.current) {
      clearTimeout(playbackRetryTimeoutRef.current);
    }

    if (videoRef.current && isOpen && currentReel) {
      if (isPlaying && !showComments) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error: DOMException) => {
            // AbortError can happen when quickly switching reels; only stop on autoplay policy blocks
            if (error?.name === "NotAllowedError") {
              setIsPlaying(false);
            }
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, isOpen, showComments, currentReel]);

  // Video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen || !currentReel) return;

    const handleTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
      lastVideoTimeRef.current = video.currentTime;
      stalledChecksRef.current = 0;
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentIndex, isOpen, currentReel]);

  // Playback watchdog to recover from stalled reels
  useEffect(() => {
    if (!isOpen || !currentReel) return;

    if (playbackWatchdogRef.current) {
      clearInterval(playbackWatchdogRef.current);
    }

    playbackWatchdogRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || !isPlaying || showComments) return;

      if (video.paused) {
        video.play().catch(() => {});
        return;
      }

      if (video.seeking || video.ended || video.readyState < 2) return;

      const delta = Math.abs(video.currentTime - lastVideoTimeRef.current);
      if (delta < 0.02) {
        stalledChecksRef.current += 1;
      } else {
        stalledChecksRef.current = 0;
        lastVideoTimeRef.current = video.currentTime;
      }

      if (stalledChecksRef.current >= 2) {
        const resumeFrom = video.currentTime;
        try {
          video.currentTime = Math.max(0, resumeFrom - 0.1);
        } catch {
          // Ignore seek failures and just replay
        }
        video.play().catch(() => {});
        stalledChecksRef.current = 0;
      }
    }, 1300);

    return () => {
      if (playbackWatchdogRef.current) {
        clearInterval(playbackWatchdogRef.current);
        playbackWatchdogRef.current = null;
      }
    };
  }, [currentReel?.id, isOpen, isPlaying, showComments]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  // Navigate to next/prev reel
  const goToReel = useCallback((direction: -1 | 1) => {
    if (showComments) return;
    setCaptionExpanded(false);
    if (direction === -1 && currentIndex < reels.length - 1) {
      setSlideDirection(-1);
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
      setVideoProgress(0);
      triggerHaptic();
      if (currentIndex >= reels.length - 4 && onLoadMore) {
        onLoadMore();
      }
    } else if (direction === 1 && currentIndex > 0) {
      setSlideDirection(1);
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
      setVideoProgress(0);
      triggerHaptic();
    }
  }, [showComments, currentIndex, reels.length, onLoadMore, triggerHaptic]);

  // Keyboard support (Arrow keys)
  useEffect(() => {
    if (!isOpen || showComments) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goToReel(-1); // next
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goToReel(1); // prev
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === "m") {
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showComments, goToReel]);

  // Scroll wheel support for desktop
  useEffect(() => {
    if (!isOpen || showComments) return;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let canScroll = true;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!canScroll) return;
      canScroll = false;
      
      if (e.deltaY > 30) {
        goToReel(-1); // scroll down = next
      } else if (e.deltaY < -30) {
        goToReel(1); // scroll up = prev
      }

      scrollTimeout = setTimeout(() => { canScroll = true; }, 500);
    };

    const container = containerRef.current;
    container?.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container?.removeEventListener("wheel", handleWheel);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isOpen, showComments, goToReel]);

  // Early return AFTER all hooks
  if (!isOpen || !currentReel || reels.length === 0) {
    return null;
  }

  // Handle swipe
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      goToReel(-1);
    } else if (info.offset.y > threshold) {
      goToReel(1);
    }
  };

  // Handle like with animation
  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }

    const reelId = currentReel.id;
    const currentLikeState = likesData[reelId];

    if (currentLikeState?.isLiked) {
      await supabase
        .from("reel_likes")
        .delete()
        .eq("reel_id", reelId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("reel_likes").insert({
        reel_id: reelId,
        user_id: user.id
      });
      // Update user interest for liking
      updateUserInterest("creator", currentReel.user_id, "like");
    }

    fetchReelData(reelId);
  };

  // Handle follow
  const handleFollow = async () => {
    if (!user) {
      toast({ title: "Please sign in to follow", variant: "destructive" });
      return;
    }

    const userId = currentReel.user_id;
    
    if (isFollowing[userId]) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      setIsFollowing(prev => ({ ...prev, [userId]: false }));
      toast({ title: "Unfollowed" });
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: userId
      });
      setIsFollowing(prev => ({ ...prev, [userId]: true }));
      toast({ title: "Following!" });
      // Update user interest for following
      updateUserInterest("creator", userId, "follow");
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      await navigator.share({
        title: currentReel.caption || "Check out this reel!",
        url: window.location.origin + `/reel/${currentReel.id}`
      });
    } catch {
      navigator.clipboard.writeText(window.location.origin + `/reel/${currentReel.id}`);
      toast({ title: "Link copied!" });
    }
  };

  // Toggle video play/pause
  const togglePlayPause = () => {
    if (showComments) return;
    setIsPlaying(prev => !prev);
  };

  // Handle double tap to like
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showComments) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const rect = e.currentTarget.getBoundingClientRect();
      setDoubleTapPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      
      // Show heart animation
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 1000);
      
      // Like the reel if not already liked
      if (!likesData[currentReel.id]?.isLiked) {
        handleLike();
      }
      
      lastTapTime.current = 0;
    } else {
      // Single tap - toggle play/pause after a short delay
      lastTapTime.current = now;
      setTimeout(() => {
        if (lastTapTime.current === now) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const likeData = likesData[currentReel.id] || { count: 0, isLiked: false };
  const commentCount = commentsCount[currentReel.id] || 0;
  const viewCount = viewsCount[currentReel.id] || currentReel.view_count || 0;

  // Format count - compact style
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <AnimatePresence>
      {isOpen && currentReel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
          ref={containerRef}
        >
          {/* Progress bar at top */}
          <div className="absolute top-0 left-0 right-0 z-50 h-0.5 bg-white/20">
            <motion.div
              className="h-full bg-white"
              style={{ width: `${videoProgress}%` }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-3 z-50 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Tabs overlay */}
          {showTabs && onTabChange && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex bg-black/40 backdrop-blur-sm rounded-full p-0.5">
              <button
                onClick={() => onTabChange("latest")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === "latest" ? "bg-white text-black" : "text-white/70"}`}
              >
                Latest
              </button>
              <button
                onClick={() => onTabChange("foryou")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === "foryou" ? "bg-white text-black" : "text-white/70"}`}
              >
                For You
              </button>
            </div>
          )}

          {/* Video container with swipe */}
          <motion.div
            drag={showComments ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative w-full h-full"
          >
            <AnimatePresence mode="sync" initial={false} custom={slideDirection}>
              <motion.div
                key={currentReel.id}
                custom={slideDirection}
                initial={{ y: slideDirection === -1 ? "100%" : slideDirection === 1 ? "-100%" : 0, opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: slideDirection === -1 ? "-100%" : "100%", opacity: 0.5 }}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
                onClick={handleVideoTap}
              >
                <video
                  ref={videoRef}
                  src={currentReel.video_url}
                  className="w-full h-full object-contain max-w-lg mx-auto"
                  loop
                  playsInline
                  muted={isMuted}
                  autoPlay
                  controls={false}
                  preload="auto"
                  poster=""
                  disablePictureInPicture
                  disableRemotePlayback
                  controlsList="nodownload nofullscreen noremoteplayback"
                  // @ts-ignore - webkit specific
                  webkit-playsinline="true"
                  x-webkit-airplay="deny"
                  style={{ WebkitAppearance: 'none' } as React.CSSProperties}
                  onLoadedData={(e) => {
                    const vid = e.currentTarget;
                    stalledChecksRef.current = 0;
                    lastVideoTimeRef.current = vid.currentTime;
                    if (isPlaying && !showComments) {
                      vid.play().catch(() => {});
                    }
                  }}
                  onCanPlayThrough={(e) => {
                    const vid = e.currentTarget;
                    stalledChecksRef.current = 0;
                    if (isPlaying && !showComments && vid.paused) {
                      vid.play().catch(() => {});
                    }
                  }}
                  onWaiting={() => {
                    // Handled by watchdog – no aggressive retries here
                  }}
                  onError={(e) => {
                    const vid = e.currentTarget;
                    const resumeFrom = Number.isFinite(vid.currentTime) ? vid.currentTime : 0;

                    if (playbackRetryTimeoutRef.current) {
                      clearTimeout(playbackRetryTimeoutRef.current);
                    }

                    playbackRetryTimeoutRef.current = setTimeout(() => {
                      const sourceUrl = currentReel.video_url;
                      const resumePlayback = () => {
                        if (resumeFrom > 0) {
                          try {
                            vid.currentTime = Math.max(0, resumeFrom - 0.1);
                          } catch {
                            // Ignore seek errors
                          }
                        }
                        if (isPlaying && !showComments) {
                          vid.play().catch(() => {});
                        }
                      };

                      vid.addEventListener("canplaythrough", resumePlayback, { once: true });
                      vid.src = sourceUrl;
                      vid.load();
                    }, 1000);
                  }}
                />

                {/* Double tap heart animation */}
                <AnimatePresence>
                  {showDoubleTapHeart && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute pointer-events-none z-50"
                      style={{ left: doubleTapPosition.x - 40, top: doubleTapPosition.y - 40 }}
                    >
                      <Heart className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Play/Pause overlay */}
                <AnimatePresence>
                  {!isPlaying && !showComments && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Right side actions - Facebook Reels style */}
            <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 z-30">
              {/* User avatar with follow button and online indicator */}
              <div className="relative mb-1">
                <img
                  src={currentReel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                  alt={currentReel.user?.username || "User"}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAvatarView(true);
                  }}
                />
                {/* Online indicator */}
                <OnlineIndicator 
                  userId={currentReel.user_id} 
                  className="absolute -bottom-0.5 -right-0.5"
                  size="sm"
                />
                {user && user.id !== currentReel.user_id && !isFollowing[currentReel.user_id] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-black"
                  >
                    <UserPlus className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>

              {/* Like */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart className={cn(
                    "w-5 h-5 transition-colors",
                    likeData.isLiked ? "fill-red-500 text-red-500" : "text-white"
                  )} />
                </motion.div>
                <span className="text-white text-[10px] font-medium mt-0.5">{formatCount(likeData.count)}</span>
              </button>

              {/* Comments */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-medium mt-0.5">{formatCount(commentCount)}</span>
              </button>

              {/* Report & Block - only show for other users */}
              {user && user.id !== currentReel.user_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReportBlock(true); }}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Flag className="w-5 h-5 text-white" />
                  </div>
                </button>
              )}

              {/* Duet/Stitch */}
              {user && user.id !== currentReel.user_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDuetStitch(true); }}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                </button>
              )}

              {/* Analytics - for own reels */}
              {user && user.id === currentReel.user_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/analytics/reels"); }}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                </button>
              )}

              {/* Share */}
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="flex flex-col items-center"
              >
                <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>

            </div>

            {/* Bottom info */}
            <div className="absolute left-3 bottom-24 right-20 space-y-1.5 z-20">
              {/* User info */}
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/streamer/${currentReel.user_id}`);
                  onClose();
                }}
              >
                <span className="text-white font-semibold text-sm">
                  @{currentReel.user?.username || "anonymous"}
                </span>
                {isFollowing[currentReel.user_id] && (
                  <span className="text-[10px] text-white/60 px-1.5 py-0.5 bg-white/10 rounded-full">Following</span>
                )}
              </div>

              {/* Caption with hashtags - truncated with See more/less */}
              {currentReel.caption && (() => {
                const words = currentReel.caption!.split(/\s+/);
                const isLong = words.length > 8;
                const truncatedText = isLong && !captionExpanded 
                  ? words.slice(0, 8).join(' ')
                  : currentReel.caption!;
                return (
                  <>
                    <div className="text-white text-xs leading-relaxed">
                      <HashtagText text={truncatedText} />
                      {isLong && !captionExpanded && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCaptionExpanded(true); }}
                          className="text-white/70 text-[11px] font-medium ml-1 inline"
                        >
                          ...See more
                        </button>
                      )}
                    </div>
                    {isLong && captionExpanded && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCaptionExpanded(false); }}
                        className="text-white/70 text-[11px] font-medium"
                      >
                        See less
                      </button>
                    )}
                    {(() => {
                      const previewUrl = extractFirstUrl(currentReel.caption || "");
                      return previewUrl ? <LinkPreview url={previewUrl} /> : null;
                    })()}
                  </>
                );
              })()}


              {/* View count */}
              <div className="flex items-center gap-2 text-white/60 text-[10px]">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatCount(viewCount)} views</span>
                </div>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(currentReel.created_at), { addSuffix: true })}</span>
              </div>

            </div>
          </motion.div>

          {/* Comments drawer - New component */}
          <ReelComments
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            reelId={currentReel.id}
            commentCount={commentCount}
            onCommentAdded={() => fetchReelData(currentReel.id)}
          />

          {/* Duet/Stitch Modal */}
          <DuetStitchModal
            isOpen={showDuetStitch}
            onClose={() => setShowDuetStitch(false)}
            reelId={currentReel.id}
            reelVideoUrl={currentReel.video_url}
            reelCaption={currentReel.caption || undefined}
            creatorUsername={currentReel.user?.username || undefined}
          />

          {/* Avatar View Modal */}
          <AvatarViewModal
            isOpen={showAvatarView}
            onClose={() => setShowAvatarView(false)}
            imageUrl={currentReel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face"}
            username={currentReel.user?.username || undefined}
          />

          {/* Report & Block Modal */}
          <ReportBlockModal
            isOpen={showReportBlock}
            onClose={() => setShowReportBlock(false)}
            userId={currentReel.user_id}
            username={currentReel.user?.username || undefined}
            reelId={currentReel.id}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
