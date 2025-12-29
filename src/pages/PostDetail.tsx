import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { CommentSection } from "@/components/CommentSection";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    if (!id) return;

    const { data: postData, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        image_url,
        created_at,
        user_id,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !postData) {
      console.error("Error fetching post:", error);
      setLoading(false);
      return;
    }

    setPost(postData);

    // Get counts
    const { count: likes } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id);

    const { count: comments } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id);

    setLikesCount(likes || 0);
    setCommentsCount(comments || 0);

    // Check if user liked
    if (user) {
      const { data: likeData } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsLiked(!!likeData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPost();
  }, [id, user]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }

    if (!id) return;

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      await supabase.from("post_likes").insert({
        post_id: id,
        user_id: user.id,
      });
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Post</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Post content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-4 border border-border/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <img
              src={post.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
              alt={post.profiles?.full_name || "User"}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div>
              <h4 className="font-semibold text-foreground">
                {post.profiles?.full_name || "Anonymous"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <p className="text-foreground/90 leading-relaxed mb-4">{post.content}</p>

          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full rounded-lg mb-4"
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-border/30">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 group transition-all duration-200"
            >
              <motion.div
                whileTap={{ scale: 1.3 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <Heart
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isLiked
                      ? "fill-accent text-accent"
                      : "text-muted-foreground group-hover:text-accent"
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isLiked ? "text-accent" : "text-muted-foreground"
                )}
              >
                {likesCount}
              </span>
            </button>

            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">{commentsCount} comments</span>
            </div>

            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Comments section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Comments</h2>
          <CommentSection postId={post.id} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PostDetail;
