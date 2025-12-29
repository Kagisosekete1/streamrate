import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  id: string;
  streamerName: string;
  streamerPicture: string;
  streamerId: string;
  content: string;
  imageUrl?: string | null;
  likes: number;
  comments: number;
  createdAt: Date;
  isLiked?: boolean;
  index?: number;
}

export const PostCard = ({
  id,
  streamerName,
  streamerPicture,
  streamerId,
  content,
  imageUrl,
  likes: initialLikes,
  comments,
  createdAt,
  isLiked: initialIsLiked = false,
  index = 0,
}: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setIsLiked(false);
      setLikes(likes - 1);
    } else {
      await supabase.from("post_likes").insert({
        post_id: id,
        user_id: user.id,
      });
      setIsLiked(true);
      setLikes(likes + 1);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/post/${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-card rounded-xl p-4 border border-border/50 card-glow cursor-pointer"
      onClick={() => navigate(`/post/${id}`)}
    >
      {/* Header */}
      <Link
        to={`/streamer/${streamerId}`}
        className="flex items-center gap-3 mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={streamerPicture}
          alt={streamerName}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
        />
        <div>
          <h4 className="font-semibold text-foreground text-sm">{streamerName}</h4>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>
      </Link>

      {/* Content */}
      <p className="text-foreground/90 text-sm leading-relaxed mb-4">{content}</p>

      {/* Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Post image"
          className="w-full rounded-lg mb-4 max-h-64 object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-border/30">
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
                "w-5 h-5 transition-colors",
                isLiked
                  ? "fill-accent text-accent"
                  : "text-muted-foreground group-hover:text-accent"
              )}
            />
          </motion.div>
          <span
            className={cn("text-sm", isLiked ? "text-accent" : "text-muted-foreground")}
          >
            {likes}
          </span>
        </button>

        <button
          onClick={handleCommentClick}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{comments}</span>
        </button>

        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
