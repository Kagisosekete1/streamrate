import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, ChevronDown, ChevronUp, Smile, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { EmojiPicker } from "@/components/EmojiPicker";
import { HashtagText } from "@/components/HashtagText";
import { getDefaultAvatar } from "@/utils/defaultAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const enrichComment = useCallback(async (comment: any): Promise<Comment> => {
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
  }, [user]);

  const fetchComments = useCallback(async () => {
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
      (commentsData || []).map(enrichComment)
    );

    setComments(commentsWithCounts);
    setLoading(false);
  }, [postId, enrichComment]);

  const fetchReplies = useCallback(async (commentId: string) => {
    const { data: repliesData, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("parent_id", commentId)
      .order("created_at", { ascending: true });

    if (error) return;

    const repliesWithCounts = await Promise.all(
      (repliesData || []).map(enrichComment)
    );

    setReplies((prev) => ({ ...prev, [commentId]: repliesWithCounts }));
  }, [enrichComment]);

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();

      // Realtime subscription
      const channel = supabase
        .channel(`modal-comments-${postId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
          () => {
            fetchComments();
            // Refresh all expanded replies
            expandedReplies.forEach((id) => fetchReplies(id));
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comment_likes" },
          () => {
            fetchComments();
            expandedReplies.forEach((id) => fetchReplies(id));
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [isOpen, postId]);

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
    
    // Auto-expand the parent to show the new reply
    setExpandedReplies((prev) => new Set(prev).add(parentId));
    fetchReplies(parentId);
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    if (!user) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    if (parentId) fetchReplies(parentId);
    fetchComments();
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }

    if (isLiked) {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      if (error) {
        toast({ title: "Couldn't remove like", variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("comment_likes").upsert(
        { comment_id: commentId, user_id: user.id },
        { onConflict: "comment_id,user_id", ignoreDuplicates: true }
      );
      if (error) {
        toast({ title: "Couldn't save like", variant: "destructive" });
        return;
      }
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

  const renderComment = (comment: Comment, depth = 0) => {
    const maxIndent = 4;
    const isOwner = user?.id === comment.user_id;

    return (
      <div key={comment.id}>
        <div
          className={cn(
            "flex items-start gap-3 py-2",
            depth > 0 && depth <= maxIndent && "ml-6 border-l-2 border-border/50 pl-3 mt-2",
            depth > maxIndent && "ml-3 border-l-2 border-border/30 pl-2 mt-2"
          )}
        >
          <img
            src={comment.profiles?.avatar_url || getDefaultAvatar()}
            alt={comment.profiles?.username || "User"}
            className={cn("rounded-full object-cover cursor-pointer flex-shrink-0", depth > 0 ? "w-6 h-6" : "w-8 h-8")}
            onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }}
            onClick={() => { onClose(); navigate(`/streamer/${comment.user_id}`); }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-medium text-sm text-foreground cursor-pointer hover:text-primary"
                onClick={() => { onClose(); navigate(`/streamer/${comment.user_id}`); }}
              >
                {comment.profiles?.username || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}
              </span>
            </div>
            <div className="text-sm text-foreground mt-0.5">
              <HashtagText text={comment.content} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLikeComment(comment.id, comment.is_liked)}
                className="flex items-center gap-1 text-xs"
              >
                <Heart className={cn("w-3.5 h-3.5", comment.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                <span className={comment.is_liked ? "text-red-500" : "text-muted-foreground"}>{comment.likes_count}</span>
              </button>
              <button
                onClick={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyText(comment.profiles?.username ? `@${comment.profiles.username} ` : "");
                }}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Reply
              </button>
              {comment.replies_count > 0 && (
                <button onClick={() => toggleReplies(comment.id)} className="flex items-center gap-1 text-xs text-primary">
                  {expandedReplies.has(comment.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {comment.replies_count} {comment.replies_count === 1 ? "reply" : "replies"}
                </button>
              )}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteComment(comment.id, comment.parent_id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddReply(comment.id); }}
                  autoFocus
                />
                <button onClick={() => handleAddReply(comment.id)} disabled={!replyText.trim()} className="text-primary disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Nested replies — recursive */}
            {expandedReplies.has(comment.id) && replies[comment.id]?.map((reply) => renderComment(reply, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
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

          {/* Post Preview */}
          {postImage && (
            <div className="flex items-start gap-3 p-4 border-b border-border bg-secondary/30">
              <img src={authorAvatar || getDefaultAvatar()} alt={authorName} className="w-8 h-8 rounded-full object-cover" onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground">{authorName}</span>
                <p className="text-sm text-muted-foreground line-clamp-2">{postContent}</p>
              </div>
              <img src={postImage} alt="Post" className="w-12 h-12 rounded-lg object-cover" />
            </div>
          )}

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
              comments.map((comment) => renderComment(comment))
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
