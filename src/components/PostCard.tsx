import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquareText, Bookmark, MoreHorizontal, Trash2, Edit2, Flag, BookmarkPlus, Send, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ShareMenu } from "@/components/ShareMenu";
import { EditPostModal } from "@/components/EditPostModal";
import { AvatarViewModal } from "@/components/AvatarViewModal";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { ReportBlockModal } from "@/components/ReportBlockModal";
import { PostCommentsModal } from "@/components/PostCommentsModal";
import { LikesModal } from "@/components/LikesModal";
import { VerificationBadge } from "@/utils/verificationBadge";

// Caption component with "See more" truncation
import { HashtagText } from "@/components/HashtagText";
import { LinkPreview } from "@/components/LinkPreview";

const CaptionWithSeeMore = ({ streamerName, streamerId, content, hasImage }: { streamerName: string; streamerId: string; content: string; hasImage?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = hasImage ? content.length > 80 : content.length > 250;

  return (
    <div className="mb-2">
      <span className="text-sm">
        <Link 
          to={`/streamer/${streamerId}`} 
          className="font-semibold text-foreground mr-1"
        >
          {streamerName}
        </Link>
        {shouldTruncate && !expanded ? (
          <>
            {hasImage ? (
              <HashtagText text={content.slice(0, 80)} className="text-foreground" />
            ) : (
              <span className="line-clamp-5">
                <HashtagText text={content} className="text-foreground" />
              </span>
            )}
            {hasImage && <span className="text-foreground">...</span>}
            <button 
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-muted-foreground ml-1 text-sm"
            >
              See more
            </button>
          </>
        ) : (
          <HashtagText text={content} className="text-foreground" />
        )}
      </span>
    </div>
  );
};
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  isPrivate?: boolean;
  streamerEmail?: string | null;
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
  isPrivate = false,
  streamerEmail,
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
  const [showAvatarView, setShowAvatarView] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [wasEdited, setWasEdited] = useState(
    updatedAt && createdAt && updatedAt.getTime() > createdAt.getTime() + 1000
  );
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReportBlock, setShowReportBlock] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);

  const isOwner = user?.id === streamerId;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ title: "Please sign in to save", variant: "destructive" });
      return;
    }

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setIsBookmarked(false);
      toast({ title: "Removed from saved" });
    } else {
      await supabase.from("bookmarks").insert({
        post_id: id,
        user_id: user.id,
      });
      setIsBookmarked(true);
      toast({ title: "Saved" });
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

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isLiked) return;

    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    await supabase.from("post_likes").insert({
      post_id: id,
      user_id: user.id,
    });
    setIsLiked(true);
    setLikes(likes + 1);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCommentsModal(true);
  };

  const handleLikesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (likes > 0) {
      setShowLikesModal(true);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border-b border-border"
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-[2px] rounded-full story-ring">
              <div className="p-[1px] rounded-full bg-background">
                <img
                  src={streamerPicture}
                  alt={streamerName}
                  className="w-9 h-9 rounded-full object-cover cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAvatarView(true);
                  }}
                />
              </div>
            </div>
            <OnlineIndicator 
              userId={streamerId}
              className="absolute -bottom-0.5 -right-0.5"
              size="sm"
            />
          </div>
          <div>
            <Link
              to={`/streamer/${streamerId}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-sm text-foreground hover:text-muted-foreground inline-flex items-center gap-1"
            >
              {streamerName}
              <VerificationBadge email={streamerEmail} />
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(createdAt, { addSuffix: false })}</span>
              {wasEdited && <span>• Edited</span>}
            </div>
          </div>
        </div>
        
        {/* 3-dot menu for edit/delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-foreground hover:text-muted-foreground rounded-full hover:bg-secondary/50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-card border-border">
            {/* Save/Bookmark option for everyone */}
            <DropdownMenuItem onClick={handleBookmark} className="gap-3">
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-foreground")} />
              {isBookmarked ? "Unsave" : "Save Post"}
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem onClick={() => setShowEditModal(true)} className="gap-3">
                  <Edit2 className="w-4 h-4" />
                  Edit Post
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive gap-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
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
            {!isOwner && (
              <DropdownMenuItem 
                onClick={() => setShowReportBlock(true)} 
                className="gap-3 text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4" />
                Report & Block
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image FIRST - Instagram style (full width, double tap to like) */}
      {imageUrl && (
        <div 
          className="relative w-full bg-black"
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={imageUrl}
            alt="Post"
            className="w-full object-contain max-h-[600px]"
          />
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
            </motion.div>
          )}
        </div>
      )}

      {/* Link preview when no image */}
      {!imageUrl && (() => {
        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        return urlMatch ? <LinkPreview url={urlMatch[0]} /> : null;
      })()}

      {/* Caption AFTER image */}
      <div className="px-4 pt-3">
        <CaptionWithSeeMore
          streamerName={streamerName}
          streamerId={streamerId}
          content={content}
          hasImage={!!imageUrl}
        />
      </div>

      {/* Actions - below content */}
      <div className="px-4 pt-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="hover:opacity-60 transition-opacity">
              <Heart
                className={cn(
                  "w-6 h-6 transition-all",
                  isLiked ? "fill-red-500 text-red-500 scale-110" : "text-foreground"
                )}
              />
            </button>
            {!isPrivate && (
              <button onClick={handleCommentClick} className="hover:opacity-60 transition-opacity flex items-center gap-1">
                <MessageSquareText className="w-6 h-6 text-foreground" />
                {comments > 0 && (
                  <span className="text-sm font-semibold text-foreground">{comments}</span>
                )}
              </button>
            )}
            <ShareMenu postId={id} title={content.slice(0, 50)} imageUrl={imageUrl} />
          </div>
        </div>

        {/* Likes count - clickable */}
        <button 
          onClick={handleLikesClick}
          className="font-semibold text-sm text-foreground hover:opacity-70 transition-opacity text-left"
        >
          {likes.toLocaleString()} likes
        </button>

        {/* View comments */}
        {!isPrivate && (
          <button 
            onClick={handleCommentClick}
            className="text-sm text-muted-foreground mt-3 mb-3"
          >
            {comments > 0 ? `View all ${comments} comments` : "Add a comment..."}
          </button>
        )}
      </div>

      {/* Spacing */}
      <div className="h-3" />

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

      {/* Avatar View Modal */}
      <AvatarViewModal
        isOpen={showAvatarView}
        onClose={() => setShowAvatarView(false)}
        imageUrl={streamerPicture}
        username={streamerName}
      />

      {/* Report & Block Modal */}
      <ReportBlockModal
        isOpen={showReportBlock}
        onClose={() => setShowReportBlock(false)}
        userId={streamerId}
        username={streamerName}
        postId={id}
      />

      {/* Comments Modal */}
      <PostCommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        postId={id}
        postImage={imageUrl}
        postContent={content}
        authorName={streamerName}
        authorAvatar={streamerPicture}
      />

      {/* Likes Modal */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        postId={id}
        type="post"
      />
    </motion.article>
  );
};
