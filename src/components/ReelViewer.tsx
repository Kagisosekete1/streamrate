import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, ChevronUp, ChevronDown, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesData, setLikesData] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentReel = reels[currentIndex];

  // Fetch likes and comments data
  const fetchReelData = useCallback(async (reelId: string) => {
    // Fetch likes count
    const { count: likesCount } = await supabase
      .from("reel_likes")
      .select("*", { count: "exact", head: true })
      .eq("reel_id", reelId);

    // Check if user liked
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

    // Fetch comments count
    const { count: commCount } = await supabase
      .from("reel_comments")
      .select("*", { count: "exact", head: true })
      .eq("reel_id", reelId);

    setCommentsCount(prev => ({
      ...prev,
      [reelId]: commCount || 0
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
    }
  }, [isOpen, currentReel?.id, fetchReelData]);

  useEffect(() => {
    if (showComments && currentReel) {
      fetchComments(currentReel.id);
    }
  }, [showComments, currentReel?.id, fetchComments]);

  // Reset index when reels change
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

  // Handle swipe
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    } else if (info.offset.y > threshold && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  // Navigate with arrows
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  const goToNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  // Handle like
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
    }

    fetchReelData(reelId);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          ref={containerRef}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation arrows */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={cn(
                "w-10 h-10 rounded-full bg-black/50 flex items-center justify-center",
                currentIndex === 0 && "opacity-30"
              )}
            >
              <ChevronUp className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === reels.length - 1}
              className={cn(
                "w-10 h-10 rounded-full bg-black/50 flex items-center justify-center",
                currentIndex === reels.length - 1 && "opacity-30"
              )}
            >
              <ChevronDown className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Video container with swipe */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
          >
            {/* Video */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={togglePlayPause}
            >
              <video
                ref={videoRef}
                src={currentReel.video_url}
                className="max-h-full max-w-full object-contain"
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
                    <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white ml-1" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right side actions */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
              {/* Like */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                className="flex flex-col items-center gap-1"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  likeData.isLiked ? "bg-accent/20" : "bg-black/50"
                )}>
                  <Heart className={cn(
                    "w-7 h-7",
                    likeData.isLiked ? "fill-accent text-accent" : "text-white"
                  )} />
                </div>
                <span className="text-white text-xs font-medium">{likeData.count}</span>
              </button>

              {/* Comments */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{commentCount}</span>
              </button>

              {/* Share */}
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  <Share2 className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Share</span>
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  {isMuted ? (
                    <VolumeX className="w-7 h-7 text-white" />
                  ) : (
                    <Volume2 className="w-7 h-7 text-white" />
                  )}
                </div>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute left-4 bottom-8 right-20 space-y-2">
              {/* User info */}
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/streamer/${currentReel.user_id}`);
                  onClose();
                }}
              >
                <img
                  src={currentReel.user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                  alt={currentReel.user?.username || "User"}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
                <span className="text-white font-semibold">
                  @{currentReel.user?.username || "anonymous"}
                </span>
              </div>

              {/* Caption */}
              {currentReel.caption && (
                <p className="text-white text-sm line-clamp-3">
                  {currentReel.caption}
                </p>
              )}

              {/* Reel counter */}
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <span>{currentIndex + 1} / {reels.length}</span>
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
                className="absolute bottom-0 left-0 right-0 h-[60vh] bg-card rounded-t-3xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">
                    {commentCount} Comments
                  </h3>
                  <button onClick={() => setShowComments(false)}>
                    <X className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(60vh-140px)]">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Be the first!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <img
                          src={comment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                          alt={comment.profiles?.username || "User"}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {comment.profiles?.username || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-foreground/80 text-sm mt-1">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment input */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-secondary"
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
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