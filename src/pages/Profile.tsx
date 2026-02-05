import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, Edit2, Users, Star, MessageCircle, Camera, X, ImageIcon, Eye, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadModal } from "@/components/ImageUploadModal";
import { ProfilePreviewModal } from "@/components/ProfilePreviewModal";
import { HeaderPositionModal } from "@/components/HeaderPositionModal";
import { ReelViewer } from "@/components/ReelViewer";
import { ProfileContentGrid } from "@/components/ProfileContentGrid";
import { FollowersModal } from "@/components/FollowersModal";
import { LastSeenDisplay } from "@/components/LastSeenDisplay";
import { SocialLinks } from "@/components/SocialLinks";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url?: string | null;
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

type ProfileTab = "posts" | "photos" | "reels" | "saved";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, userRole, loading, signOut, updateProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    country: "",
    twitch_url: "",
    discord_url: "",
    kick_url: "",
    youtube_gaming_url: "",
  });
  const [socialLinks, setSocialLinks] = useState({
    twitch_url: null as string | null,
    discord_url: null as string | null,
    kick_url: null as string | null,
    youtube_gaming_url: null as string | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [showHeaderPreview, setShowHeaderPreview] = useState(false);
  const [headerPreviewSrc, setHeaderPreviewSrc] = useState<string | null>(null);
  const [selectedHeaderFile, setSelectedHeaderFile] = useState<File | null>(null);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [showHeaderPositionModal, setShowHeaderPositionModal] = useState(false);
  const [reels, setReels] = useState<any[]>([]);
  const [showReelViewer, setShowReelViewer] = useState(false);
  const [reelViewerIndex, setReelViewerIndex] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following">("followers");
  const [showUpdatePostsDialog, setShowUpdatePostsDialog] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [isUpdatingPosts, setIsUpdatingPosts] = useState(false);


  useEffect(() => {
    // Redirect only after auth check completes
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    // Fetch data immediately when user is available
    if (user) {
      fetchUserData();
      fetchHeaderUrl();
      fetchSavedPosts();
      fetchUserReels();
    }

    // Set up realtime subscription for profile changes
    const profileChannel = supabase
      .channel("profile-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          // Refresh user data when any profile changes
          if (user) {
            fetchUserData();
            fetchSavedPosts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user, loading]);

  const fetchUserReels = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Enrich reels with user data
      const enrichedReels = data.map(reel => ({
        ...reel,
        user: {
          username: profile?.username,
          avatar_url: profile?.avatar_url
        }
      }));
      setReels(enrichedReels);
    }
  };

  // Sync form data only when modal opens (matching Settings pattern)
  useEffect(() => {
    if (showEditModal && profile) {
      setEditForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        country: profile.country || "",
        twitch_url: socialLinks.twitch_url || "",
        discord_url: socialLinks.discord_url || "",
        kick_url: socialLinks.kick_url || "",
        youtube_gaming_url: socialLinks.youtube_gaming_url || "",
      });
    }
  }, [showEditModal]);

  const fetchHeaderUrl = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("header_url, twitch_url, discord_url, kick_url, youtube_gaming_url")
      .eq("id", user.id)
      .single();
    
    if (data) {
      if (data.header_url) {
        setHeaderUrl(data.header_url);
      }
      setSocialLinks({
        twitch_url: (data as any).twitch_url || null,
        discord_url: (data as any).discord_url || null,
        kick_url: (data as any).kick_url || null,
        youtube_gaming_url: (data as any).youtube_gaming_url || null,
      });
    }
  };

  const fetchSavedPosts = async () => {
    if (!user) return;

    // Fetch bookmarked posts
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id);

    if (!bookmarks || bookmarks.length === 0) {
      setSavedPosts([]);
      return;
    }

    const postIds = bookmarks.map(b => b.post_id);
    
    const { data: savedPostsData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id")
      .in("id", postIds)
      .order("created_at", { ascending: false });

    const savedWithCounts = await Promise.all(
      (savedPostsData || []).map(async (post) => {
        const { count: likes } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: comments } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        // Fetch author info
        const { data: authorData } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", post.user_id)
          .single();

        return {
          ...post,
          likes_count: likes || 0,
          comments_count: comments || 0,
          author: authorData || undefined,
        };
      })
    );

    setSavedPosts(savedWithCounts);
  };

  const fetchUserData = async () => {
    if (!user) return;

    // Fetch user posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const postsWithCounts = await Promise.all(
      (postsData || []).map(async (post) => {
        const { count: likes } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: comments } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        return {
          ...post,
          likes_count: likes || 0,
          comments_count: comments || 0,
        };
      })
    );

    setPosts(postsWithCounts);

    // Fetch followers count
    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id);

    setFollowersCount(followers || 0);

    // Fetch following count
    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id);

    setFollowingCount(following || 0);

    // Fetch ratings if streamer
    if (userRole === "streamer") {
      const { data: ratings } = await supabase
        .from("ratings")
        .select("stars")
        .eq("streamer_id", user.id);

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setReviewsCount(ratings.length);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
    navigate("/auth");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewImageSrc(previewUrl);
    setSelectedFile(file);
    setShowImagePreview(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfilePicture = async (fileOrBlob: File | Blob) => {
    if (!user) return;

    setIsUploading(true);
    const fileName = `${user.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileOrBlob);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const { error } = await updateProfile({ avatar_url: urlData.publicUrl });

    if (error) {
      toast({ title: "Failed to update avatar", variant: "destructive" });
    } else {
      toast({ title: "Profile picture saved!" });
      
      // Check if user has posts and ask if they want to update them
      if (posts.length > 0) {
        setNewAvatarUrl(urlData.publicUrl);
        setShowUpdatePostsDialog(true);
      }
    }
    
    setIsUploading(false);
    setShowImagePreview(false);
    if (previewImageSrc) {
      URL.revokeObjectURL(previewImageSrc);
    }
    setPreviewImageSrc(null);
    setSelectedFile(null);
  };

  const handleUpdatePostsWithNewAvatar = async () => {
    if (!user || !newAvatarUrl) return;
    
    setIsUpdatingPosts(true);
    
    // Note: Posts don't store avatar_url directly - they reference user_id
    // The avatar is fetched from profiles when displaying posts
    // So we just need to confirm the profile is updated (which it already is)
    
    toast({ 
      title: "Posts updated!", 
      description: "Your new profile picture will appear on all your posts." 
    });
    
    setIsUpdatingPosts(false);
    setShowUpdatePostsDialog(false);
    setNewAvatarUrl(null);
  };

  const handleSkipUpdatePosts = () => {
    setShowUpdatePostsDialog(false);
    setNewAvatarUrl(null);
  };

  const handleCancelImagePreview = () => {
    setShowImagePreview(false);
    if (previewImageSrc) {
      URL.revokeObjectURL(previewImageSrc);
    }
    setPreviewImageSrc(null);
    setSelectedFile(null);
  };

  // Header photo handlers
  const handleHeaderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setHeaderPreviewSrc(previewUrl);
    setSelectedHeaderFile(file);
    setShowHeaderPositionModal(true);
    
    if (headerInputRef.current) {
      headerInputRef.current.value = "";
    }
  };

  const handleSavePositionedHeader = async (blob: Blob) => {
    if (!user) return;

    setIsUploadingHeader(true);
    const fileName = `${user.id}/header_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploadingHeader(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    
    const { error } = await supabase
      .from("profiles")
      .update({ header_url: urlData.publicUrl })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to update header", variant: "destructive" });
    } else {
      setHeaderUrl(urlData.publicUrl);
      toast({ title: "Header photo saved!" });
    }
    
    setIsUploadingHeader(false);
    if (headerPreviewSrc) {
      URL.revokeObjectURL(headerPreviewSrc);
    }
    setHeaderPreviewSrc(null);
    setSelectedHeaderFile(null);
  };

  const handleCloseHeaderPositionModal = () => {
    setShowHeaderPositionModal(false);
    if (headerPreviewSrc) {
      URL.revokeObjectURL(headerPreviewSrc);
    }
    setHeaderPreviewSrc(null);
    setSelectedHeaderFile(null);
  };

  const handleSaveHeader = async (fileOrBlob: File | Blob) => {
    if (!user) return;

    setIsUploadingHeader(true);
    const fileName = `${user.id}/header_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileOrBlob);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploadingHeader(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    
    const { error } = await supabase
      .from("profiles")
      .update({ header_url: urlData.publicUrl })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to update header", variant: "destructive" });
    } else {
      setHeaderUrl(urlData.publicUrl);
      toast({ title: "Header photo saved!" });
    }
    
    setIsUploadingHeader(false);
    setShowHeaderPreview(false);
    if (headerPreviewSrc) {
      URL.revokeObjectURL(headerPreviewSrc);
    }
    setHeaderPreviewSrc(null);
    setSelectedHeaderFile(null);
  };

  const handleCancelHeaderPreview = () => {
    setShowHeaderPreview(false);
    if (headerPreviewSrc) {
      URL.revokeObjectURL(headerPreviewSrc);
    }
    setHeaderPreviewSrc(null);
    setSelectedHeaderFile(null);
  };

  const handleRemoveHeader = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ header_url: null })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to remove header", variant: "destructive" });
    } else {
      setHeaderUrl(null);
      toast({ title: "Header removed" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPostId(postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      toast({ title: "Failed to delete post", variant: "destructive" });
      setDeletingPostId(null);
      return;
    }

    toast({ title: "Post deleted" });
    setPosts(posts.filter(p => p.id !== postId));
    setDeletingPostId(null);
  };

  const handleSaveProfile = async () => {
    // Validate username uniqueness
    if (editForm.username && editForm.username !== profile?.username) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", editForm.username)
        .neq("id", user.id)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Username taken",
          description: "This username is already in use. Please choose a different one.",
          variant: "destructive",
        });
        return;
      }
    }

    // Update profile with basic info and social links
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name,
        username: editForm.username,
        bio: editForm.bio,
        country: editForm.country,
        twitch_url: editForm.twitch_url || null,
        discord_url: editForm.discord_url || null,
        kick_url: editForm.kick_url || null,
        youtube_gaming_url: editForm.youtube_gaming_url || null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update local social links state
    setSocialLinks({
      twitch_url: editForm.twitch_url || null,
      discord_url: editForm.discord_url || null,
      kick_url: editForm.kick_url || null,
      youtube_gaming_url: editForm.youtube_gaming_url || null,
    });

    // Refresh profile in auth context
    await updateProfile({});

    toast({
      title: "Profile updated!",
    });
    setShowEditModal(false);
  };

  // Show skeleton while loading or no user (will redirect)
  if (loading || !user) {
    return (
      <AppLayout showBottomNav={true}>
        <div className="min-h-screen bg-background pb-20 md:pb-8">
          {/* Header skeleton */}
          <div className="h-40 w-full bg-secondary animate-pulse" />
          <div className="px-4 -mt-12 relative z-10">
            <div className="w-24 h-24 rounded-full bg-secondary border-4 border-background animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-5 w-32 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header with Banner - Header now behind profile picture */}
      <header className="relative">
        {/* Header Banner - clickable to upload */}
        <div 
          className="h-40 w-full bg-cover bg-center relative cursor-pointer group"
          style={{ 
            backgroundImage: headerUrl 
              ? `url(${headerUrl})` 
              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            backgroundSize: 'cover'
          }}
          onClick={() => headerInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
          
          {/* Header upload overlay hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 rounded-full px-4 py-2 flex items-center gap-2">
              <Camera className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">Change Header</span>
            </div>
          </div>
          
          {/* Header upload button */}
          <input
            type="file"
            accept="image/*"
            onChange={handleHeaderSelect}
            ref={headerInputRef}
            className="hidden"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              headerInputRef.current?.click();
            }}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <ImageIcon className="w-4 h-4 text-white" />
          </button>
          
          {/* Remove header button - only show if header exists */}
          {headerUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveHeader();
              }}
              className="absolute bottom-2 right-12 w-8 h-8 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors z-10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Top right actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setShowProfilePreview(true)}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Eye className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Profile info - overlapping the header */}
        <div className="relative px-4 pb-6 -mt-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <img
                src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"}
                alt={profile.full_name || "User"}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-background shadow-xl"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>

            <h1 className="mt-4 text-xl font-bold text-foreground">
              {profile.username || "Anonymous"}
            </h1>
            <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium mt-1 capitalize">
              {userRole || "User"}
            </span>
            {profile.bio && (
              <p className="text-muted-foreground text-sm text-center mt-2 max-w-xs">
                {profile.bio}
              </p>
            )}
            
            {/* Country & Last Seen */}
            {profile.country && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                <MapPin className="w-3 h-3" />
                <span>{profile.country}</span>
              </div>
            )}
            <LastSeenDisplay userId={user.id} className="mt-1" />
            
            {/* Social Links */}
            <SocialLinks
              twitchUrl={socialLinks.twitch_url}
              discordUrl={socialLinks.discord_url}
              kickUrl={socialLinks.kick_url}
              youtubeGamingUrl={socialLinks.youtube_gaming_url}
              className="mt-3"
            />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mt-6"
          >
            <button 
              className="text-center hover:opacity-80 transition-opacity"
              onClick={() => {
                setFollowersModalType("followers");
                setShowFollowersModal(true);
              }}
            >
              <span className="text-lg font-bold text-foreground">{followersCount}</span>
              <p className="text-xs text-muted-foreground">Followers</p>
            </button>
            <button 
              className="text-center hover:opacity-80 transition-opacity"
              onClick={() => {
                setFollowersModalType("following");
                setShowFollowersModal(true);
              }}
            >
              <span className="text-lg font-bold text-foreground">{followingCount}</span>
              <p className="text-xs text-muted-foreground">Following</p>
            </button>
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{posts.length}</span>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Actions */}
      <section className="px-4 py-2">
        <div className="flex gap-3">
          <Button variant="gaming" className="flex-1" onClick={() => setShowEditModal(true)}>
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Quick Stats for Streamers */}
      {userRole === "streamer" && (
        <section className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <Star className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{averageRating || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <MessageCircle className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{reviewsCount}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <Users className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{followersCount}</p>
              <p className="text-xs text-muted-foreground">Fans</p>
            </div>
          </div>
        </section>
      )}

      {/* Profile Content Grid */}
      <ProfileContentGrid
        posts={posts}
        savedPosts={savedPosts}
        reels={reels}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReelClick={(index) => {
          setReelViewerIndex(index);
          setShowReelViewer(true);
        }}
        onPostDelete={handleDeletePost}
        onReelDelete={(reelId) => {
          setReels(reels.filter(r => r.id !== reelId));
        }}
        isOwnProfile={true}
      />

      {/* Edit Profile Modal - Matching Settings style */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
                <button
                  onClick={handleSaveProfile}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Save
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Username
                  </label>
                  <Input
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    placeholder="Your username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    maxLength={200}
                    placeholder="Tell us about yourself..."
                    className="w-full min-h-[80px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{editForm.bio.length}/200</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Country
                  </label>
                  <Input
                    value={editForm.country}
                    onChange={(e) =>
                      setEditForm({ ...editForm, country: e.target.value })
                    }
                    placeholder="Your country"
                  />
                </div>

                {/* Social Links Section */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-semibold text-foreground mb-3">Social Links</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Twitch
                      </label>
                      <Input
                        value={editForm.twitch_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, twitch_url: e.target.value })
                        }
                        placeholder="twitch.tv/yourusername"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Discord
                      </label>
                      <Input
                        value={editForm.discord_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, discord_url: e.target.value })
                        }
                        placeholder="discord.gg/invite"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Kick
                      </label>
                      <Input
                        value={editForm.kick_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, kick_url: e.target.value })
                        }
                        placeholder="kick.com/yourusername"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        YouTube Gaming
                      </label>
                      <Input
                        value={editForm.youtube_gaming_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, youtube_gaming_url: e.target.value })
                        }
                        placeholder="youtube.com/@yourchannel"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Upload Modal with Compression */}
      {selectedFile && previewImageSrc && (
        <ImageUploadModal
          isOpen={showImagePreview}
          onClose={handleCancelImagePreview}
          imageSrc={previewImageSrc}
          originalFile={selectedFile}
          onSave={handleSaveProfilePicture}
          isSaving={isUploading}
          title="Profile Picture"
          previewType="avatar"
        />
      )}

      {/* Header Upload Modal with Compression */}
      {selectedHeaderFile && headerPreviewSrc && !showHeaderPositionModal && (
        <ImageUploadModal
          isOpen={showHeaderPreview}
          onClose={handleCancelHeaderPreview}
          imageSrc={headerPreviewSrc}
          originalFile={selectedHeaderFile}
          onSave={handleSaveHeader}
          isSaving={isUploadingHeader}
          title="Header Photo"
          previewType="header"
        />
      )}

      {/* Header Position Modal */}
      {headerPreviewSrc && (
        <HeaderPositionModal
          isOpen={showHeaderPositionModal}
          onClose={handleCloseHeaderPositionModal}
          imageSrc={headerPreviewSrc}
          onSave={handleSavePositionedHeader}
        />
      )}

      {/* Profile Preview Modal */}
      <ProfilePreviewModal
        isOpen={showProfilePreview}
        onClose={() => setShowProfilePreview(false)}
        profile={profile}
        headerUrl={headerUrl}
        userRole={userRole}
        stats={{
          followers: followersCount,
          following: followingCount,
          posts: posts.length,
          averageRating: averageRating,
          reviewsCount: reviewsCount,
        }}
      />

      {/* Reel Viewer */}
      <ReelViewer
        reels={reels}
        initialIndex={reelViewerIndex}
        isOpen={showReelViewer}
        onClose={() => setShowReelViewer(false)}
      />

      {/* Followers Modal */}
      {user && (
        <FollowersModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={user.id}
          type={followersModalType}
        />
      )}

      {/* Update Posts with New Avatar Dialog */}
      <AnimatePresence>
        {showUpdatePostsDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-card rounded-3xl p-6 border border-border shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Update Your Posts?
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Your new profile picture has been saved. It will automatically appear on all your posts and reels.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkipUpdatePosts}
                  >
                    Got it!
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </AppLayout>
  );
};

export default Profile;
