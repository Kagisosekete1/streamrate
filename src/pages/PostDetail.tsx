import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ThumbsUp, Share2, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { CommentSection } from "@/components/CommentSection";
import { ShareMenu } from "@/components/ShareMenu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LinkPreview } from "@/components/LinkPreview";
import { extractFirstUrl } from "@/lib/urlPreview";
import { HashtagText } from "@/components/HashtagText";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    username?: string | null;
  } | null;
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const highlightCommentId = searchParams.get("commentId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detect if user came from external (no in-app history)
  const isFromExternal = window.history.length <= 2;

  const handleBack = () => {
    if (isFromExternal) {
      navigate("/home");
    } else {
      navigate(-1);
    }
  };

  const refreshEngagement = useCallback(async () => {
    if (!id) return;
    const [{ count: likes }, { count: comments }, likedResult] = await Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
      supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
      user
        ? supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setLikesCount(likes || 0);
    setCommentsCount(comments || 0);
    setIsLiked(!!likedResult.data);
  }, [id, user?.id]);

  const fetchPost = async () => {
    if (!id) return;

    const { data: postData, error } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !postData) {
      console.error("Error fetching post:", error);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("id", postData.user_id)
      .maybeSingle();

    setPost({
      ...postData,
      profiles: profileData,
    });

    await refreshEngagement();

    setLoading(false);
  };

  useEffect(() => {
    fetchPost();
  }, [id, user, refreshEngagement]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`post-detail-engagement-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${id}` }, refreshEngagement)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${id}` }, refreshEngagement)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refreshEngagement]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }
    if (!id) return;

    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      const { error } = await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
      if (error) toast({ title: "Couldn't remove like", variant: "destructive" });
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      const { error } = await supabase
        .from("post_likes")
        .upsert({ post_id: id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (error) toast({ title: "Couldn't save like", variant: "destructive" });
    }
    refreshEngagement();
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">Post not found</p>
        <button
          onClick={() => navigate("/home")}
          className="text-primary font-medium hover:underline"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const previewUrl = extractFirstUrl(post.content);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Facebook-style top bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img
              src={post.profiles?.avatar_url || getDefaultAvatar()}
              alt={post.profiles?.full_name || "User"}
              onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
            />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {post.profiles?.full_name || "Anonymous"}'s Post
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Post content - Facebook card style */}
      <main className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-b border-border"
        >
          {/* Author header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <img
              src={post.profiles?.avatar_url || getDefaultAvatar()}
              alt={post.profiles?.full_name || "User"}
              onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/10"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-[15px] leading-tight">
                {post.profiles?.full_name || "Anonymous"}
              </h4>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-xs">{timeAgo}</span>
                <span className="text-xs">·</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Post text */}
          <div className="px-4 pb-3">
            <div className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">
              <HashtagText text={post.content} />
            </div>
          </div>

          {/* Link preview */}
          {previewUrl && (
            <div className="px-0 pb-1">
              <LinkPreview url={previewUrl} />
            </div>
          )}

          {/* Post image - full width like Facebook */}
          {post.image_url && (
            <div className="bg-muted/20">
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full max-h-[600px] object-contain"
              />
            </div>
          )}

          {/* Engagement counts bar */}
          <div className="flex items-center justify-between px-4 py-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {likesCount > 0 && (
                <>
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <ThumbsUp className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-sm">{formatCount(likesCount)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {commentsCount > 0 && (
                <span>{formatCount(commentsCount)} comments</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border" />

          {/* Action buttons bar - Facebook style */}
          <div className="flex items-center px-2 py-1">
            <button
              onClick={handleLike}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-colors hover:bg-muted/50",
                isLiked ? "text-primary" : "text-muted-foreground"
              )}
            >
              <motion.div whileTap={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 500 }}>
                <ThumbsUp className={cn("w-5 h-5", isLiked && "fill-primary")} />
              </motion.div>
              <span className="text-sm font-medium">Like</span>
            </button>

            <button
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => {
                document.getElementById("comment-input")?.focus();
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <span className="text-sm font-medium">Comment</span>
            </button>

            <ShareMenu
              postId={post.id}
              title={post.content.slice(0, 50)}
              authorUsername={post.profiles?.username || null}
              authorName={post.profiles?.full_name || null}
            />
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border" />
        </motion.div>

        {/* Comments section */}
        <div className="bg-card">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-base font-semibold text-foreground">Comments</h2>
          </div>
          <div className="px-4 pb-4">
            <CommentSection postId={post.id} postOwnerId={post.user_id} highlightCommentId={highlightCommentId} />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PostDetail;
