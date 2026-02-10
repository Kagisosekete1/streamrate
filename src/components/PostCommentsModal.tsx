import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, ChevronDown, ChevronUp, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postImage?: string | null;
  postContent: string;
  authorName: string;
  authorAvatar: string;
}

export const PostCommentsModal = ({
  isOpen,
  onClose,
  postId,
  postImage,
  postContent,
  authorName,
  authorAvatar,
}: PostCommentsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fetchComments = async () => {
    if (!postId) return;
    
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("post_id", postId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    const commentsWithCounts = await Promise.all(
      (commentsData || []).map(async (comment) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", comment.user_id)
          .maybeSingle();

        const { count: likesCount } = await supabase
          .from("comment_likes")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", comment.id);

        const { count: repliesCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("parent_id", comment.id);

        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("comment_likes")
            .select("id")
            .eq("comment_id", comment.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }

        return {
          ...comment,
          profiles: profileData,
          likes_count: likesCount || 0,
          replies_count: repliesCount || 0,
          is_liked: isLiked,
        };
      })
    );

    setComments(commentsWithCounts);
    setLoading(false);
  };

  const fetchReplies = async (commentId: string) => {
    const { data: repliesData, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("parent_id", commentId)
      .order("created_at", { ascending: true });

    if (error) return;

    const repliesWithCounts = await Promise.all(
      (repliesData || []).map(async (reply) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", reply.user_id)
          .maybeSingle();

        const { count: likesCount } = await supabase
          .from("comment_likes")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", reply.id);

        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("comment_likes")
            .select("id")
            .eq("comment_id", reply.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }

        return {
          ...reply,
          profiles: profileData,
          likes_count: likesCount || 0,
          replies_count: 0,
          is_liked: isLiked,
        };
      })
    );

    setReplies((prev) => ({ ...prev, [commentId]: repliesWithCounts }));
  };

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
    }
  }, [isOpen, postId, user]);

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: "Please sign in to comment", variant: "destructive" });
      return;
    }

    if (!newComment.trim()) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Failed to add comment", variant: "destructive" });
      return;
    }

    setNewComment("");
    fetchComments();
  };

  const handleAddReply = async (parentId: string) => {
    if (!user) {
      toast({ title: "Please sign in to reply", variant: "destructive" });
      return;
    }

    if (!replyText.trim()) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: replyText.trim(),
      parent_id: parentId,
    });

    if (error) {
      toast({ title: "Failed to add reply", variant: "destructive" });
      return;
    }

    setReplyText("");
    setReplyingTo(null);
    fetchReplies(parentId);
    fetchComments();
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }

    if (isLiked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: user.id,
      });
    }

    fetchComments();
    expandedReplies.forEach((id) => fetchReplies(id));
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      if (!replies[commentId]) {
        fetchReplies(commentId);
      }
    }
    setExpandedReplies(newExpanded);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute left-4 right-4 top-1/2 -translate-y-1/2 mx-auto max-w-sm rounded-3xl bg-card border border-border shadow-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Comments</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Post Preview (optional) */}
          {postImage && (
            <div className="flex items-start gap-3 p-4 border-b border-border bg-secondary/30">
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground">{authorName}</span>
                <p className="text-sm text-muted-foreground line-clamp-2">{postContent}</p>
              </div>
              <img
                src={postImage}
                alt="Post"
                className="w-12 h-12 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Comments List */}
          <div className="overflow-y-auto max-h-[40vh] p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id}>
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      alt={comment.profiles?.username || "User"}
                      className="w-8 h-8 rounded-full object-cover cursor-pointer"
                      onClick={() => {
                        onClose();
                        navigate(`/streamer/${comment.user_id}`);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {comment.profiles?.username || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleLikeComment(comment.id, comment.is_liked)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Heart
                            className={cn(
                              "w-3.5 h-3.5",
                              comment.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                            )}
                          />
                          <span className={comment.is_liked ? "text-red-500" : "text-muted-foreground"}>
                            {comment.likes_count}
                          </span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          Reply
                        </button>
                        {comment.replies_count > 0 && (
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-1 text-xs text-primary"
                          >
                            {expandedReplies.has(comment.id) ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            {comment.replies_count} replies
                          </button>
                        )}
                      </div>

                      {/* Reply Input */}
                      {replyingTo === comment.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${comment.profiles?.username || "user"}...`}
                            className="flex-1 h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleAddReply(comment.id)}
                          />
                          <button
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!replyText.trim()}
                            className="text-primary disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Replies */}
                      {expandedReplies.has(comment.id) && replies[comment.id]?.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2 mt-3 ml-4 border-l-2 border-border pl-3">
                          <img
                            src={reply.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                            alt={reply.profiles?.username || "User"}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-xs text-foreground">
                              {reply.profiles?.username || "Anonymous"}
                            </span>
                            <p className="text-xs text-foreground">{reply.content}</p>
                            <button
                              onClick={() => handleLikeComment(reply.id, reply.is_liked)}
                              className="flex items-center gap-1 mt-1 text-xs"
                            >
                              <Heart
                                className={cn(
                                  "w-3 h-3",
                                  reply.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                )}
                              />
                              <span className={reply.is_liked ? "text-red-500" : "text-muted-foreground"}>
                                {reply.likes_count}
                              </span>
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

          {/* Comment Input */}
          <div className="sticky bottom-0 bg-card border-t border-border p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Smile className="w-6 h-6" />
              </button>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="text-primary font-semibold disabled:opacity-50"
              >
                Post
              </button>
            </div>
            {showEmojiPicker && (
              <div className="mt-2">
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
