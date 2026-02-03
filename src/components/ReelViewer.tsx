import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Music2, Flag, UserPlus, Eye, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HashtagText } from "@/components/HashtagText";
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
}

export const ReelViewer = ({ reels, initialIndex = 0, isOpen, onClose }: ReelViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { recordView, updateUserInterest, updateHashtagInterests } = useForYouAlgorithm();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
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
  const [preloadedVideos, setPreloadedVideos] = useState<Record<string, HTMLVideoElement>>({});
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [doubleTapPosition, setDoubleTapPosition] = useState({ x: 0, y: 0 });
  const [showAvatarView, setShowAvatarView] = useState(false);
  const [showReportBlock, setShowReportBlock] = useState(false);
  const lastTapTime = useRef<number>(0);
  const viewStartTime = useRef<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (preloadedVideos[reelId]) return; // Already preloaded
      
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      // Remove default controls and poster to prevent grey play button
      video.controls = false;
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
      
      // Start loading
      video.load();
      
      setPreloadedVideos(prev => ({
        ...prev,
        [reelId]: video
      }));
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
  }, [currentIndex, isOpen, reels, preloadedVideos]);

  // Cleanup preloaded videos on unmount
  useEffect(() => {
    return () => {
      Object.values(preloadedVideos).forEach(video => {
        video.src = '';
        video.load();
      });
    };
  }, [preloadedVideos]);

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
      }
    };
  }, [currentReel?.id, currentReel?.duration, recordView, viewRecorded]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Play/pause video
  useEffect(() => {
    if (videoRef.current && isOpen && currentReel) {
      if (isPlaying && !showComments) {
        videoRef.current.play();
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
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentIndex, isOpen, currentReel]);

  // Early return AFTER all hooks
  if (!isOpen || !currentReel || reels.length === 0) {
    return null;
  }

  // Handle swipe
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (showComments) return; // Disable swipe when comments are open
    
    const threshold = 50;
    if (info.offset.y < -threshold && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
      setVideoProgress(0);
    } else if (info.offset.y > threshold && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
      setVideoProgress(0);
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

          {/* Video container with swipe */}
          <motion.div
            drag={showComments ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Video */}
            <div 
              className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center"
              onClick={handleVideoTap}
            >
              <video
                ref={videoRef}
                src={currentReel.video_url}
                className="w-full h-full object-contain [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden [&::-webkit-media-controls-panel]:hidden [&::-webkit-media-controls-play-button]:hidden [&::-webkit-media-controls-start-playback-button]:!hidden [&::-webkit-media-controls-overlay-play-button]:hidden"
                loop
                playsInline
                muted={isMuted}
                autoPlay
                controls={false}
                preload="auto"
                poster=""
                disablePictureInPicture
                disableRemotePlayback
                // @ts-ignore - webkit specific
                webkit-playsinline="true"
                x-webkit-airplay="deny"
                style={{ 
                  WebkitAppearance: 'none',
                  // @ts-ignore - vendor prefix
                  MozAppearance: 'none'
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
            </div>

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

              {/* Music disc animation */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-600 flex items-center justify-center border-2 border-gray-700"
              >
                <Music2 className="w-4 h-4 text-white" />
              </motion.div>
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

              {/* Caption with hashtags */}
              {currentReel.caption && (
                <div className="text-white text-xs leading-relaxed line-clamp-2">
                  <HashtagText text={currentReel.caption} />
                </div>
              )}

              {/* Music info bar */}
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Music2 className="w-3 h-3 text-white flex-shrink-0" />
                <motion.div
                  animate={{ x: [-100, 200] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="text-white text-[11px] whitespace-nowrap"
                >
                  Original sound - @{currentReel.user?.username || "user"}
                </motion.div>
              </div>

              {/* View count & counter */}
              <div className="flex items-center gap-2 text-white/60 text-[10px]">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatCount(viewCount)} views</span>
                </div>
                <span>•</span>
                <span>{currentIndex + 1}/{reels.length}</span>
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
