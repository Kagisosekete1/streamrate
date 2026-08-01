import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, MessageCircle, ChevronDown, ChevronUp, Trash2, Edit2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { EmojiPicker } from "@/components/EmojiPicker";
import { MentionInput } from "@/components/MentionInput";
import { HashtagText } from "@/components/HashtagText";
import { cn } from "@/lib/utils";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  replies_count: number;
  is_liked: boolean;
  replies?: Comment[];
}

interface ReelCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  commentCount: number;
  onCommentAdded: () => void;
}

export const ReelComments = ({ 
  isOpen, 
  onClose, 
  reelId, 
  commentCount,
  onCommentAdded 
}: ReelCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const enrichComment = useCallback(async (comment: any): Promise<Comment> => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", comment.user_id)
      .maybeSingle();

    const { count: repliesCount } = await supabase
      .from("reel_comments")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", comment.id);

    // For now, reel comments don't have a separate likes table, so default to 0
    return { 
      ...comment, 
      profiles: profileData,
      replies_count: repliesCount || 0,
      likes_count: 0,
      is_liked: false,
    };
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    
    const { data: commentsData } = await supabase
      .from("reel_comments")
      .select("*")
      .eq("reel_id", reelId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (commentsData) {
      const enriched = await Promise.all(commentsData.map(enrichComment));
      setComments(enriched);
    }
    
    setLoading(false);
  }, [reelId, enrichComment]);

  const fetchReplies = useCallback(async (parentId: string) => {
    const { data: repliesData } = await supabase
      .from("reel_comments")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: true });

    if (repliesData) {
      const enrichedReplies = await Promise.all(repliesData.map(enrichComment));
      
      setComments(prev => prev.map(comment => 
        comment.id === parentId 
          ? { ...comment, replies: enrichedReplies }
          : comment
      ));
    }
  }, [enrichComment]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  useEffect(() => {
    if (!isOpen) return;
    const channel = supabase
      .channel(`reel-comments-${reelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reel_comments", filter: `reel_id=eq.${reelId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, reelId, fetchComments]);

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: "Please sign in to comment", variant: "destructive" });
      return;
    }

    if (!newComment.trim()) return;

    const { error } = await supabase.from("reel_comments").insert({
      reel_id: reelId,
      user_id: user.id,
      content: newComment.trim(),
      parent_id: replyingTo?.id || null
    });

    if (error) {
      toast({ title: "Failed to add comment", variant: "destructive" });
      return;
    }

    // If replying, refresh that thread
    if (replyingTo) {
      fetchReplies(replyingTo.id);
      // Also expand that thread
      setExpandedReplies(prev => new Set(prev).add(replyingTo.id));
    }

    setNewComment("");
    setReplyingTo(null);
    fetchComments();
    onCommentAdded();
  };

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    if (!user) return;
    const { error } = await supabase
      .from("reel_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Failed to delete comment", variant: "destructive" });
      return;
    }
    toast({ title: "Comment deleted" });
    if (parentId) fetchReplies(parentId);
    fetchComments();
    onCommentAdded();
  };

  const handleEditComment = async (commentId: string, parentId: string | null) => {
    if (!user || !editText.trim()) return;
    const { error } = await supabase
      .from("reel_comments")
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
    if (parentId) fetchReplies(parentId);
    fetchComments();
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      fetchReplies(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.profiles?.username || "user"} `);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isOwner = user?.id === comment.user_id;
    const isEditing = editingCommentId === comment.id;
    const maxIndent = 3;

    return (
      <div key={comment.id} className="space-y-1">
        <div
          className={cn(
            "flex items-start gap-3",
            depth > 0 && depth <= maxIndent && "ml-10 border-l-2 border-border/50 pl-3",
            depth > maxIndent && "ml-6 border-l-2 border-border/30 pl-2"
          )}
        >
          <img
            src={comment.profiles?.avatar_url || getDefaultAvatar()}
            alt={comment.profiles?.username || "User"}
            onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }}
            className={cn(
              "rounded-full object-cover cursor-pointer flex-shrink-0",
              depth === 0 ? "w-9 h-9" : "w-7 h-7"
            )}
            onClick={() => navigate(`/streamer/${comment.user_id}`)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="font-semibold text-foreground text-sm cursor-pointer hover:underline"
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
                <button onClick={() => handleEditComment(comment.id, comment.parent_id)} className="text-primary hover:text-primary/80">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingCommentId(null); setEditText(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-foreground text-sm mt-1 break-words">
                <HashtagText text={comment.content} />
              </p>
            )}
            
            {/* Comment actions */}
            <div className="flex items-center gap-4 mt-2">
              <button 
                onClick={() => handleReply(comment)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Reply
              </button>
              
              {comment.replies_count > 0 && (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  {expandedReplies.has(comment.id) ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Hide replies
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      {comment.replies_count} {comment.replies_count === 1 ? "reply" : "replies"}
                    </>
                  )}
                </button>
              )}

              {isOwner && !isEditing && (
                <>
                  <button 
                    onClick={() => { setEditingCommentId(comment.id); setEditText(comment.content); }}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => handleDeleteComment(comment.id, comment.parent_id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nested Replies */}
        <AnimatePresence>
          {expandedReplies.has(comment.id) && comment.replies && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 h-[75vh] sm:h-[70vh] bg-card rounded-t-3xl z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">
            {commentCount} Comments
          </h3>
          <button onClick={onClose} className="p-2 -mr-2">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Comments list - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground/60">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => renderComment(comment, 0))
          )}
        </div>

        {/* Comment input - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 bg-card border-t border-border safe-area-bottom">
          {/* Replying indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-muted-foreground">
                Replying to @{replyingTo.profiles?.username || "user"}
              </span>
              <button 
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment("");
                }}
                className="text-xs text-primary"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <EmojiPicker onSelect={handleEmojiSelect} />
            
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="flex-1 bg-secondary rounded-full h-11 px-4 text-sm border-0 outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 flex-shrink-0"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
