import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Trash2, Edit2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ShareMenu } from "@/components/ShareMenu";
import { EditPostModal } from "@/components/EditPostModal";
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
  updatedAt?: Date;
  isLiked?: boolean;
  isBookmarked?: boolean;
  index?: number;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export const PostCard = ({
  id,
  streamerName,
  streamerPicture,
  streamerId,
  content: initialContent,
  imageUrl: initialImageUrl,
  likes: initialLikes,
  comments,
  createdAt,
  updatedAt,
  isLiked: initialIsLiked = false,
  isBookmarked: initialIsBookmarked = false,
  index = 0,
  onDelete,
  onUpdate,
}: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [wasEdited, setWasEdited] = useState(
    updatedAt && createdAt && updatedAt.getTime() > createdAt.getTime() + 1000
  );

  const isOwner = user?.id === streamerId;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ title: "Please sign in to bookmark", variant: "destructive" });
      return;
    }

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setIsBookmarked(false);
      toast({ title: "Removed from bookmarks" });
    } else {
      await supabase.from("bookmarks").insert({
        post_id: id,
        user_id: user.id,
      });
      setIsBookmarked(true);
      toast({ title: "Saved to bookmarks" });
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;

    setIsDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      toast({ title: "Failed to delete post", variant: "destructive" });
      setIsDeleting(false);
      return;
    }

    toast({ title: "Post deleted" });
    onDelete?.();
  };

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
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>
            {wasEdited && (
              <span className="text-xs text-muted-foreground italic">• Edited</span>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <p className="text-foreground/90 text-sm leading-relaxed mb-4">{content}</p>

      {/* Image */}
      {imageUrl && (
        <div className="relative mb-4 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt="Post image"
            className="w-full max-h-96 object-contain bg-secondary/30 md:max-h-[500px] lg:max-h-[600px]"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-6">
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

          <ShareMenu postId={id} title={content.slice(0, 50)} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBookmark}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Bookmark
              className={cn(
                "w-5 h-5 transition-colors",
                isBookmarked && "fill-primary text-primary"
              )}
            />
          </button>

          {isOwner && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        postId={id}
        initialContent={content}
        initialImageUrl={imageUrl}
        onSave={(newContent, newImageUrl) => {
          setContent(newContent);
          setImageUrl(newImageUrl);
          setWasEdited(true);
          onUpdate?.();
        }}
      />
    </motion.div>
  );
};
