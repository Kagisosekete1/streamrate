import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  id: string;
  streamerName: string;
  streamerPicture: string;
  streamerId: string;
  content: string;
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
  likes: initialLikes,
  comments,
  createdAt,
  isLiked: initialIsLiked = false,
  index = 0,
}: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-card rounded-xl p-4 border border-border/50 card-glow"
    >
      {/* Header */}
      <Link to={`/streamer/${streamerId}`} className="flex items-center gap-3 mb-3">
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
          <span className={cn(
            "text-sm",
            isLiked ? "text-accent" : "text-muted-foreground"
          )}>
            {likes}
          </span>
        </button>

        <Link 
          to={`/post/${id}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{comments}</span>
        </Link>

        <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
