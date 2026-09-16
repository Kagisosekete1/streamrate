import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquareText, Bookmark, MoreHorizontal, Trash2, Edit2, Flag, Eye } from "lucide-react";
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
import { extractFirstUrl } from "@/lib/urlPreview";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

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
  manualBadge?: string | null;
  manualExpiresAt?: string | null;
  signupNumber?: number | null;
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
  manualBadge,
  manualExpiresAt,
  signupNumber,
  index = 0,
  onDelete,
  onUpdate,
}: PostCardProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(comments);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarView, setShowAvatarView] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  // `updated_at` is also touched by engagement counters, so it cannot prove
  // that the author edited the post. Only mark it after a real content edit.
  const [wasEdited, setWasEdited] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReportBlock, setShowReportBlock] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showSeenList, setShowSeenList] = useState(false);
  const [postViewers, setPostViewers] = useState<Array<{ user_id: string; username: string | null; full_name: string | null; avatar_url: string | null; viewed_at: string }>>([]);

  const isOwner = user?.id === streamerId;
  const canSeePostViews = profile?.email?.toLowerCase() === "kagisosekete5@gmail.com";

  useEffect(() => setLikes(initialLikes), [id, initialLikes]);
  useEffect(() => setCommentsCount(comments), [id, comments]);
  useEffect(() => setIsLiked(initialIsLiked), [id, initialIsLiked]);
  useEffect(() => setIsBookmarked(initialIsBookmarked), [id, initialIsBookmarked]);
  useEffect(() => setContent(initialContent), [id, initialContent]);
  useEffect(() => setImageUrl(initialImageUrl), [id, initialImageUrl]);

  const refreshEngagement = useCallback(async () => {
    const [{ count: likeCount }, { count: commentCount }, likedResult] = await Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
      supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
      user
        ? supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setLikes(likeCount || 0);
    setCommentsCount(commentCount || 0);
    setIsLiked(!!likedResult.data);
  }, [id, user?.id]);

  useEffect(() => {
    refreshEngagement();
  }, [refreshEngagement]);

  // Realtime likes & comments count
  useEffect(() => {
    const channel = supabase
      .channel(`post-counts-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${id}` },
        refreshEngagement
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${id}` },
        refreshEngagement
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, refreshEngagement]);

  useEffect(() => {
    if (!canSeePostViews) return;
    supabase
      .rpc("get_post_viewers", { _post_id: id })
      .then(({ data }) => setPostViewers(data || []));
  }, [canSeePostViews, id]);

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
    const { data, error } = await supabase.rpc("delete_own_post", { _post_id: id });

    if (error || data !== true) {
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
      setIsLiked(false);
      setLikes((prev) => Math.max(0, prev - 1));
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Couldn't remove like", variant: "destructive" });
        refreshEngagement();
        return;
      }
      refreshEngagement();
    } else {
      setIsLiked(true);
      setLikes((prev) => prev + 1);
      const { error } = await supabase.from("post_likes").upsert(
        { post_id: id, user_id: user.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true }
      );
      if (error) {
        toast({ title: "Couldn't save like", variant: "destructive" });
        refreshEngagement();
        return;
      }
      refreshEngagement();

      // Award XP for liking
      try {
        const { data: xpData } = await supabase.from("user_xp").select("total_xp, level").eq("user_id", user.id).single();
        if (xpData) {
          const newXp = xpData.total_xp + 5;
          const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
          await supabase.from("user_xp").update({ total_xp: newXp, level: newLevel }).eq("user_id", user.id);
        }
      } catch {}
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isLiked) return;

    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    const { error } = await supabase.from("post_likes").upsert(
      { post_id: id, user_id: user.id },
      { onConflict: "post_id,user_id", ignoreDuplicates: true }
    );
    if (error) {
      setShowHeartAnimation(false);
      toast({ title: "Couldn't save like", variant: "destructive" });
      refreshEngagement();
      return;
    }
    setIsLiked(true);
    setLikes((prev) => prev + 1);
    refreshEngagement();
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
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-[2px] rounded-full story-ring">
              <div className="p-[1px] rounded-full bg-background">
                <img
                  src={streamerPicture || getDefaultAvatar()}
                  alt={streamerName}
                  onError={(event) => { event.currentTarget.src = getDefaultAvatar(); }}
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
              <VerificationBadge email={streamerEmail} signupNumber={signupNumber} manualBadge={manualBadge} manualExpiresAt={manualExpiresAt} />
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
        const previewUrl = extractFirstUrl(content);
        return previewUrl ? <LinkPreview url={previewUrl} /> : null;
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
                {commentsCount > 0 && (
                  <span className="text-sm font-semibold text-foreground">{commentsCount}</span>
                )}
              </button>
            )}
            <ShareMenu postId={id} title={content.slice(0, 50)} imageUrl={imageUrl} authorUsername={streamerName} />
          </div>
        </div>

        {/* Likes count - clickable */}
        <button 
          onClick={handleLikesClick}
          className="font-semibold text-sm text-foreground hover:opacity-70 transition-opacity text-left"
        >
          {likes.toLocaleString()} likes
        </button>

        {canSeePostViews && (
          <div className="mt-2">
            <button
              onClick={() => setShowSeenList((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              {postViewers.length.toLocaleString()} seen
            </button>
            {showSeenList && (
              <div className="mt-2 space-y-1 rounded-lg border border-border bg-secondary/40 p-2">
                {postViewers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No views yet</p>
                ) : (
                  postViewers.slice(0, 20).map((viewer) => (
                    <div key={`${viewer.user_id}-${viewer.viewed_at}`} className="flex items-center gap-2 text-xs">
                      <img src={viewer.avatar_url || "/placeholder.svg"} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-medium text-foreground truncate">{viewer.username || viewer.full_name || "User"}</span>
                      <span className="ml-auto text-muted-foreground">{formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* View comments */}
        {!isPrivate && commentsCount > 0 && (
          <button 
            onClick={handleCommentClick}
            className="text-sm text-muted-foreground mt-3 mb-3"
          >
            View all {commentsCount} comments
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
