import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, Smile, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmojiPicker } from "@/components/EmojiPicker";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  replies_count: number;
  is_liked: boolean;
}

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  imageUrl: string;
  postContent: string;
  authorName: string;
  authorAvatar: string;
  authorId: string;
  likesCount: number;
  commentsCount: number;
}

export const PhotoViewerModal = ({
  isOpen,
  onClose,
  postId,
  imageUrl,
  postContent,
  authorName,
  authorAvatar,
  authorId,
  likesCount,
  commentsCount,
}: PhotoViewerModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likesCount);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
      checkIfLiked();
    }
  }, [isOpen, postId, user]);

  const checkIfLiked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const handleLikePost = async () => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setIsLiked(false);
      setCurrentLikes((p) => p - 1);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      setIsLiked(true);
      setCurrentLikes((p) => p + 1);
    }
  };

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("post_id", postId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    const commentsWithCounts = await Promise.all(
      (commentsData || []).map(async (comment) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", comment.user_id)
          .maybeSingle();

        const { count: lCount } = await supabase
          .from("comment_likes")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", comment.id);

        const { count: rCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("parent_id", comment.id);

        let liked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("comment_likes")
            .select("id")
            .eq("comment_id", comment.id)
            .eq("user_id", user.id)
            .maybeSingle();
          liked = !!likeData;
        }

        return { ...comment, profiles: profileData, likes_count: lCount || 0, replies_count: rCount || 0, is_liked: liked };
      })
    );

    setComments(commentsWithCounts);
    setLoading(false);
  };

  const fetchReplies = async (commentId: string) => {
    const { data: repliesData } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("parent_id", commentId)
      .order("created_at", { ascending: true });

    const repliesWithCounts = await Promise.all(
      (repliesData || []).map(async (reply) => {
        const { data: profileData } = await supabase.from("profiles").select("username, avatar_url").eq("id", reply.user_id).maybeSingle();
        const { count: lCount } = await supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", reply.id);
        let liked = false;
        if (user) {
          const { data: likeData } = await supabase.from("comment_likes").select("id").eq("comment_id", reply.id).eq("user_id", user.id).maybeSingle();
          liked = !!likeData;
        }
        return { ...reply, profiles: profileData, likes_count: lCount || 0, replies_count: 0, is_liked: liked };
      })
    );

    setReplies((prev) => ({ ...prev, [commentId]: repliesWithCounts }));
  };

  const handleAddComment = async () => {
    if (!user) { toast({ title: "Please sign in to comment", variant: "destructive" }); return; }
    if (!newComment.trim()) return;
    await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: newComment.trim() });
    setNewComment("");
    fetchComments();
  };

  const handleAddReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return;
    await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: replyText.trim(), parent_id: parentId });
    setReplyText("");
    setReplyingTo(null);
    fetchReplies(parentId);
    fetchComments();
  };

  const handleLikeComment = async (commentId: string, commentIsLiked: boolean) => {
    if (!user) return;
    if (commentIsLiked) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
    }
    fetchComments();
    expandedReplies.forEach((id) => fetchReplies(id));
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) { newExpanded.delete(commentId); }
    else { newExpanded.add(commentId); if (!replies[commentId]) fetchReplies(commentId); }
    setExpandedReplies(newExpanded);
  };

  if (!isOpen) return null;

  // On mobile, just navigate to post detail
  if (isMobile) {
    navigate(`/post/${postId}`);
    onClose();
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-5xl max-h-[90vh] bg-card rounded-2xl overflow-hidden shadow-2xl flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Image */}
          <div className="flex-1 bg-black flex items-center justify-center min-w-0">
            <img
              src={imageUrl}
              alt="Post"
              className="w-full h-full max-h-[90vh] object-contain"
            />
          </div>

          {/* Right: Comments sidebar */}
          <div className="w-[360px] flex-shrink-0 flex flex-col border-l border-border max-h-[90vh]">
            {/* Author header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                onClick={() => { onClose(); navigate(`/streamer/${authorId}`); }}
              />
              <div className="flex-1 min-w-0">
                <span
                  className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary"
                  onClick={() => { onClose(); navigate(`/streamer/${authorId}`); }}
                >
                  {authorName}
                </span>
                <p className="text-xs text-muted-foreground line-clamp-2">{postContent}</p>
              </div>
            </div>

            {/* Likes & Actions */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <button onClick={handleLikePost} className="flex items-center gap-1.5">
                <Heart className={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", isLiked ? "text-red-500" : "text-muted-foreground")}>{currentLikes}</span>
              </button>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{commentsCount}</span>
              </div>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id}>
                    <div className="flex items-start gap-2">
                      <img
                        src={comment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                        alt={comment.profiles?.username || "User"}
                        className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        onClick={() => { onClose(); navigate(`/streamer/${comment.user_id}`); }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{comment.profiles?.username || "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}</span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-1.5">
                          <button onClick={() => handleLikeComment(comment.id, comment.is_liked)} className="flex items-center gap-1 text-xs">
                            <Heart className={cn("w-3.5 h-3.5", comment.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                            <span className={comment.is_liked ? "text-red-500" : "text-muted-foreground"}>{comment.likes_count}</span>
                          </button>
                          <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs text-muted-foreground hover:text-primary">Reply</button>
                          {comment.replies_count > 0 && (
                            <button onClick={() => toggleReplies(comment.id)} className="flex items-center gap-1 text-xs text-primary">
                              {expandedReplies.has(comment.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {comment.replies_count} replies
                            </button>
                          )}
                        </div>

                        {replyingTo === comment.id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Reply to ${comment.profiles?.username || "user"}...`} className="flex-1 h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddReply(comment.id)} />
                            <button onClick={() => handleAddReply(comment.id)} disabled={!replyText.trim()} className="text-primary disabled:opacity-50"><Send className="w-4 h-4" /></button>
                          </div>
                        )}

                        {expandedReplies.has(comment.id) && replies[comment.id]?.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2 mt-3 ml-4 border-l-2 border-border pl-3">
                            <img src={reply.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <div className="flex-1">
                              <span className="font-medium text-xs text-foreground">{reply.profiles?.username || "Anonymous"}</span>
                              <p className="text-xs text-foreground">{reply.content}</p>
                              <button onClick={() => handleLikeComment(reply.id, reply.is_liked)} className="flex items-center gap-1 mt-1 text-xs">
                                <Heart className={cn("w-3 h-3", reply.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                                <span className={reply.is_liked ? "text-red-500" : "text-muted-foreground"}>{reply.likes_count}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-muted-foreground hover:text-foreground">
                  <Smile className="w-5 h-5" />
                </button>
                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 h-9" onKeyDown={(e) => e.key === "Enter" && handleAddComment()} />
                <button onClick={handleAddComment} disabled={!newComment.trim()} className="text-primary font-semibold text-sm disabled:opacity-50">Post</button>
              </div>
              {showEmojiPicker && (
                <div className="mt-2">
                  <EmojiPicker onSelect={(emoji) => { setNewComment((p) => p + emoji); setShowEmojiPicker(false); }} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
