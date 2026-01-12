import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp, Trash2, Edit2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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

interface CommentSectionProps {
  postId: string;
}

export const CommentSection = ({ postId }: CommentSectionProps) => {
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const fetchComments = async () => {
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

    // Get likes counts and user likes
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

    if (error) {
      console.error("Error fetching replies:", error);
      return;
    }

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

        const { count: repliesCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("parent_id", reply.id);

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
          replies_count: repliesCount || 0,
          is_liked: isLiked,
        };
      })
    );

    setReplies((prev) => ({ ...prev, [commentId]: repliesWithCounts }));
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user]);

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
    // Refresh replies if they're visible
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

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    if (!user) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to delete comment", variant: "destructive" });
      return;
    }

    toast({ title: "Comment deleted" });
    if (parentId) {
      fetchReplies(parentId);
    }
    fetchComments();
  };

  const handleEditComment = async (commentId: string, parentId: string | null) => {
    if (!user || !editText.trim()) return;

    const { error } = await supabase
      .from("comments")
      .update({ content: editText.trim() })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to edit comment", variant: "destructive" });
      return;
    }

    toast({ title: "Comment updated" });
    setEditingCommentId(null);
    setEditText("");
    if (parentId) {
      fetchReplies(parentId);
    }
    fetchComments();
  };

  const startReplyWithMention = (commentId: string, username: string | null) => {
    setReplyingTo(commentId);
    setReplyToUsername(username);
    setReplyText(username ? `@${username} ` : "");
  };

  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      // Every odd index is a username (captured group)
      if (index % 2 === 1) {
        return (
          <span
            key={index}
            className="text-primary cursor-pointer hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation();
              // Find user by username and navigate
              supabase
                .from("profiles")
                .select("id")
                .eq("username", part)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    navigate(`/streamer/${data.id}`);
                  }
                });
            }}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const renderComment = (comment: Comment, isReply = false, parentId: string | null = null) => {
    const isOwner = user?.id === comment.user_id;
    const isEditing = editingCommentId === comment.id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("py-3", isReply && "ml-8 border-l-2 border-border/50 pl-4")}
      >
        <div className="flex items-start gap-3">
          <img
            src={comment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
            alt={comment.profiles?.username || "User"}
            className="w-8 h-8 rounded-full object-cover cursor-pointer"
            onClick={() => navigate(`/streamer/${comment.user_id}`)}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span 
                className="font-medium text-foreground text-sm cursor-pointer hover:text-primary"
                onClick={() => navigate(`/streamer/${comment.user_id}`)}
              >
                {comment.profiles?.username || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => handleEditComment(comment.id, parentId)}
                  className="text-primary hover:text-primary/80"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditText("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-foreground/80 text-sm mt-1">
                {renderContentWithMentions(comment.content)}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLikeComment(comment.id, comment.is_liked)}
                className="flex items-center gap-1 text-xs"
              >
                <Heart
                  className={cn(
                    "w-4 h-4",
                    comment.is_liked ? "fill-accent text-accent" : "text-muted-foreground"
                  )}
                />
                <span className={comment.is_liked ? "text-accent" : "text-muted-foreground"}>
                  {comment.likes_count}
                </span>
              </button>

              <button
                onClick={() => startReplyWithMention(comment.id, comment.profiles?.username)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="w-4 h-4" />
                Reply
              </button>

              {comment.replies_count > 0 && (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  {expandedReplies.has(comment.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {comment.replies_count} {comment.replies_count === 1 ? "reply" : "replies"}
                </button>
              )}

              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditText(comment.content);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteComment(comment.id, parentId)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

          {/* Reply input */}
          <AnimatePresence>
            {replyingTo === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mt-3"
              >
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddReply(comment.id);
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="gaming"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyText.trim()}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested replies */}
          <AnimatePresence>
            {expandedReplies.has(comment.id) && replies[comment.id] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {replies[comment.id].map((reply) => renderComment(reply, true, comment.id))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
  };

  return (
    <div className="space-y-4">
      {/* Add comment input */}
      <div className="flex items-center gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <Button
          variant="gaming"
          size="sm"
          onClick={handleAddComment}
          disabled={!newComment.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-border/30">
        {loading ? (
          <div className="py-4 text-center text-muted-foreground">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">No comments yet. Be the first!</div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
};
