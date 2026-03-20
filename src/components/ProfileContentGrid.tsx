import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3X3, Image, Film, Bookmark, Hash, Trash2, Play, Heart, MessageCircle, Eye, MoreVertical, MoreHorizontal, Target, Rocket, BarChart3 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HashtagText } from "./HashtagText";
import { useIsMobile } from "@/hooks/use-mobile";
import { PhotoViewerModal } from "./PhotoViewerModal";
import { ReelThumbnail } from "./ReelThumbnail";
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

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface SavedPost extends Post {
  user_id: string;
  author?: {
    username: string;
    avatar_url: string;
  };
}

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  duration: number;
  view_count: number;
  created_at: string;
}

type TabType = "posts" | "photos" | "reels" | "saved" | "more";

interface ProfileContentGridProps {
  posts: Post[];
  savedPosts: SavedPost[];
  reels: Reel[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onReelClick: (index: number) => void;
  onPostDelete: (postId: string) => void;
  onReelDelete: (reelId: string) => void;
  isOwnProfile: boolean;
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
}

export const ProfileContentGrid = ({
  posts,
  savedPosts,
  reels,
  activeTab,
  onTabChange,
  onReelClick,
  onPostDelete,
  onReelDelete,
  isOwnProfile,
  authorName = "User",
  authorAvatar = "",
  authorId = "",
}: ProfileContentGridProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoViewerPost, setPhotoViewerPost] = useState<Post | null>(null);

  const tabs: { id: TabType; icon: typeof Grid3X3; label: string }[] = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "photos", icon: Image, label: "Photos" },
    { id: "reels", icon: Film, label: "Reels" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    ...(isOwnProfile && isMobile ? [{ id: "more" as TabType, icon: MoreHorizontal, label: "More" }] : []),
  ];

  const photos = posts.filter((p) => p.image_url);

  const getContent = () => {
    switch (activeTab) {
      case "posts":
        return posts;
      case "photos":
        return photos;
      case "reels":
        return reels;
      case "saved":
        return savedPosts;
      default:
        return [];
    }
  };

  const content = getContent();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleDeleteReel = async (reelId: string) => {
    setDeletingId(reelId);
    try {
      const { error } = await supabase.from("reels").delete().eq("id", reelId);
      if (error) throw error;
      toast({ title: "Reel deleted" });
      onReelDelete(reelId);
    } catch {
      toast({ title: "Failed to delete reel", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full">
      {/* Modern Tab Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex justify-center">
          <div className="flex gap-1 p-1.5 bg-secondary/50 rounded-2xl mx-4 my-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeProfileTab"
                      className="absolute inset-0 bg-primary rounded-xl shadow-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-4 lg:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "more" ? (
              /* More Menu - Quick links */
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Target, label: "Missions", path: "/missions", color: "text-green-500", bg: "bg-green-500/10" },
                  { icon: Rocket, label: "Boost", path: "/boost-profile", color: "text-blue-500", bg: "bg-blue-500/10" },
                  { icon: BarChart3, label: "Dashboard", path: "/creator-dashboard", color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.bg)}>
                        <Icon className={cn("w-5 h-5", item.color)} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  {activeTab === "posts" && <Grid3X3 className="w-8 h-8 text-muted-foreground" />}
                  {activeTab === "photos" && <Image className="w-8 h-8 text-muted-foreground" />}
                  {activeTab === "reels" && <Film className="w-8 h-8 text-muted-foreground" />}
                  {activeTab === "saved" && <Bookmark className="w-8 h-8 text-muted-foreground" />}
                </div>
                <p className="text-muted-foreground font-medium">
                  No {activeTab} yet
                </p>
              </div>
            ) : activeTab === "photos" ? (
              /* Photos Grid - 3 columns on mobile, 4 on tablet, 5 on desktop */
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2">
                {(content as Post[]).map((post) => (
                  <motion.div
                    key={post.id}
                    whileHover={{ scale: 1.02 }}
                    className="aspect-square relative group cursor-pointer rounded-lg sm:rounded-xl overflow-hidden"
                    onClick={() => {
                      if (isMobile) {
                        navigate(`/post/${post.id}`);
                      } else {
                        setPhotoViewerPost(post);
                      }
                    }}
                  >
                    <img
                      src={post.image_url!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                      <div className="flex items-center gap-3 text-white text-xs font-medium">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatCount(post.likes_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatCount(post.comments_count)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : activeTab === "reels" ? (
              /* Reels Grid - Modern TikTok-style */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {(content as Reel[]).map((reel, index) => (
                  <motion.div
                    key={reel.id}
                    whileHover={{ scale: 1.02 }}
                    className="aspect-[9/16] relative group cursor-pointer rounded-xl sm:rounded-2xl overflow-hidden bg-secondary/50"
                  >
                    <ReelThumbnail
                      videoUrl={reel.video_url}
                      onClick={() => onReelClick(index)}
                    />
                    
                    {/* No play overlay - clean thumbnail */}

                    {/* Bottom gradient with info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <div className="flex items-center justify-between text-white text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          <span>{formatCount(reel.view_count || 0)}</span>
                        </div>
                        <span>{reel.duration}s</span>
                      </div>
                      {reel.caption && (
                        <p className="text-white/80 text-[10px] sm:text-xs mt-1 line-clamp-1">
                          <HashtagText text={reel.caption} />
                        </p>
                      )}
                    </div>

                    {/* Delete button for own reels */}
                    {isOwnProfile && (
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Reel
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Reel</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this reel? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteReel(reel.id)}
                                    disabled={deletingId === reel.id}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {deletingId === reel.id ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : activeTab === "saved" ? (
              /* Saved Posts - Card layout */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(content as SavedPost[]).map((post) => (
                  <motion.div
                    key={post.id}
                    whileHover={{ y: -2 }}
                    className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    {post.image_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3 sm:p-4">
                      {post.author && (
                        <div
                          className="flex items-center gap-2 mb-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/streamer/${post.user_id}`);
                          }}
                        >
                          <img
                            src={post.author.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                            @{post.author.username || "user"}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-foreground line-clamp-2">
                        <HashtagText text={post.content} />
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatCount(post.likes_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatCount(post.comments_count)}
                        </span>
                        <span className="ml-auto">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Posts - Facebook-style card layout */
              <div className="space-y-4">
                {(content as Post[]).map((post) => (
                  <motion.div
                    key={post.id}
                    whileHover={{ y: -1 }}
                    className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm"
                  >
                    {/* Author header */}
                    <div className="flex items-center gap-3 p-3 pb-2">
                      <img
                        src={authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover cursor-pointer"
                        onClick={() => authorId && navigate(`/streamer/${authorId}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => authorId && navigate(`/streamer/${authorId}`)}
                        >
                          {authorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {isOwnProfile && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onPostDelete(post.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>

                    {/* Post image - full width */}
                    {post.image_url && (
                      <div
                        className="w-full cursor-pointer"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full object-contain max-h-[500px] bg-black"
                        />
                      </div>
                    )}

                    {/* Content & engagement */}
                    <div className="p-3">
                      <p
                        className="text-sm text-foreground line-clamp-3 cursor-pointer hover:text-primary/80 transition-colors mb-2"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        <HashtagText text={post.content} />
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {formatCount(post.likes_count)}
                        </span>
                        <span
                          className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => navigate(`/post/${post.id}`)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {formatCount(post.comments_count)} comments
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Facebook-style Photo Viewer for desktop/tablet */}
      {photoViewerPost && (
        <PhotoViewerModal
          isOpen={!!photoViewerPost}
          onClose={() => setPhotoViewerPost(null)}
          postId={photoViewerPost.id}
          imageUrl={photoViewerPost.image_url!}
          postContent={photoViewerPost.content}
          authorName={authorName}
          authorAvatar={authorAvatar}
          authorId={authorId}
          likesCount={photoViewerPost.likes_count}
          commentsCount={photoViewerPost.comments_count}
        />
      )}
    </div>
  );
};
