import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Send, Music2, Bookmark, UserPlus, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HashtagText } from "@/components/HashtagText";
import { useForYouAlgorithm } from "@/hooks/useForYouAlgorithm";

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
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesData, setLikesData] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [viewsCount, setViewsCount] = useState<Record<string, number>>({});
  const [viewRecorded, setViewRecorded] = useState<Record<string, boolean>>({});
  const viewStartTime = useRef<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentReel = reels[currentIndex];

  // Fetch likes, comments, and views data
  const fetchReelData = useCallback(async (reelId: string) => {
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
    if (!user || user.id === userId) return;
    
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

  // Fetch comments
  const fetchComments = useCallback(async (reelId: string) => {
    const { data: commentsData } = await supabase
      .from("reel_comments")
      .select("*")
      .eq("reel_id", reelId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (commentsData) {
      const enrichedComments = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", comment.user_id)
            .maybeSingle();

          return { ...comment, profiles: profileData };
        })
      );
      setComments(enrichedComments);
    }
  }, []);

  useEffect(() => {
    if (isOpen && currentReel) {
      fetchReelData(currentReel.id);
      checkFollowing(currentReel.user_id);
      viewStartTime.current = Date.now();
      
      // Update user interest for viewing this creator
      updateUserInterest("creator", currentReel.user_id, "view");
    }
  }, [isOpen, currentReel?.id, fetchReelData, checkFollowing, updateUserInterest]);

  // Record view when switching reels or closing
  useEffect(() => {
    return () => {
      if (currentReel && viewStartTime.current > 0 && !viewRecorded[currentReel.id]) {
        const watchDuration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        const completed = watchDuration >= currentReel.duration * 0.8; // 80% watched
        recordView(currentReel.id, watchDuration, completed);
        setViewRecorded(prev => ({ ...prev, [currentReel.id]: true }));
      }
    };
  }, [currentReel?.id]);

  useEffect(() => {
    if (showComments && currentReel) {
      fetchComments(currentReel.id);
    }
  }, [showComments, currentReel?.id, fetchComments]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Play/pause video
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && isOpen) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, isOpen]);

  // Video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentIndex]);

  // Handle swipe
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

  // Handle comment
  const handleAddComment = async () => {
    if (!user) {
      toast({ title: "Please sign in to comment", variant: "destructive" });
      return;
    }

    if (!newComment.trim()) return;

    const { error } = await supabase.from("reel_comments").insert({
      reel_id: currentReel.id,
      user_id: user.id,
      content: newComment.trim()
    });

    if (error) {
      toast({ title: "Failed to add comment", variant: "destructive" });
      return;
    }

    // Update user interest for commenting
    updateUserInterest("creator", currentReel.user_id, "comment");

    setNewComment("");
    fetchComments(currentReel.id);
    fetchReelData(currentReel.id);
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
    setIsPlaying(prev => !prev);
  };

  if (!isOpen || !currentReel) return null;

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
      {isOpen && (
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
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Video */}
            <div 
              className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center"
              onClick={togglePlayPause}
            >
              <video
                ref={videoRef}
                src={currentReel.video_url}
                className="w-full h-full object-contain"
                loop
                playsInline
                muted={isMuted}
                autoPlay
              />

              {/* Play/Pause overlay */}
              <AnimatePresence>
                {!isPlaying && (
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

            {/* Right side actions - Facebook Reels style (smaller, aligned) */}
            <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 z-30">
              {/* User avatar with follow button */}
              <div className="relative mb-1">
                <img
                  src={currentReel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                  alt={currentReel.user?.username || "User"}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/streamer/${currentReel.user_id}`);
                    onClose();
                  }}
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

              {/* Bookmark */}
              <button
                onClick={(e) => { e.stopPropagation(); toast({ title: "Saved!" }); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-white" />
                </div>
              </button>

              {/* Share */}
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </button>

              {/* Mute/Unmute - aligned with volume */}
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

            {/* Bottom info - aligned with volume button */}
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

          {/* Comments drawer */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 h-[70vh] bg-card rounded-t-3xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground">
                    {commentCount} Comments
                  </h3>
                  <button onClick={() => setShowComments(false)}>
                    <X className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(70vh-160px)]">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      No comments yet. Be the first!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <img
                          src={comment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                          alt={comment.profiles?.username || "User"}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer"
                          onClick={() => navigate(`/streamer/${comment.user_id}`)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {comment.profiles?.username || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-foreground text-sm mt-1">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment input */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border safe-area-bottom">
                  <div className="flex items-center gap-3">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-secondary rounded-full"
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
                    >
                      <Send className="w-5 h-5 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
