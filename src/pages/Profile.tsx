import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, Edit2, Users, Star, MessageCircle, Camera, X, Save, Trash2, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
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

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchUserData();
      fetchHeaderUrl();
    }
  }, [user, loading]);

  // Sync form data only when modal opens (matching Settings pattern)
  useEffect(() => {
    if (showEditModal && profile) {
      setEditForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        country: profile.country || "",
      });
    }
  }, [showEditModal]);

  const fetchHeaderUrl = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("header_url")
      .eq("id", user.id)
      .single();
    
    if (data?.header_url) {
      setHeaderUrl(data.header_url);
    }
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

  const handleSaveProfilePicture = async () => {
    if (!user || !selectedFile) return;

    setIsUploading(true);
    const fileName = `${user.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, selectedFile);

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
    }
    
    setIsUploading(false);
    setShowImagePreview(false);
    setPreviewImageSrc(null);
    setSelectedFile(null);
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
    setShowHeaderPreview(true);
    
    if (headerInputRef.current) {
      headerInputRef.current.value = "";
    }
  };

  const handleSaveHeader = async () => {
    if (!user || !selectedHeaderFile) return;

    setIsUploadingHeader(true);
    const fileName = `${user.id}/header_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, selectedHeaderFile);

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

    const { error } = await updateProfile(editForm);

    if (error) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profile updated!",
    });
    setShowEditModal(false);
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Banner */}
      <header className="relative">
        <div 
          className="h-32 w-full bg-cover bg-center relative"
          style={{ 
            backgroundImage: headerUrl 
              ? `url(${headerUrl})` 
              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
          
          {/* Header upload button */}
          <input
            type="file"
            accept="image/*"
            onChange={handleHeaderSelect}
            ref={headerInputRef}
            className="hidden"
          />
          <button
            onClick={() => headerInputRef.current?.click()}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="relative pt-4 px-4 -mt-12">
          <div className="flex justify-end gap-2 mb-8">
            <button
              onClick={() => navigate("/settings")}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Profile info */}
        <div className="relative px-4 pb-6 -mt-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <img
                src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"}
                alt={profile.full_name || "User"}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30"
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
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
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
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mt-6"
          >
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{followersCount}</span>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{followingCount}</span>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
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

      {/* User Posts */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Your Posts</h2>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No posts yet</p>
            <Button
              variant="gaming"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/create-post")}
            >
              Create your first post
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 border border-border/50"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <p className="text-foreground/90 text-sm leading-relaxed mb-4">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full rounded-lg mb-4 max-h-64 object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>❤️ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                  <div className="ml-auto">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
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
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {deletingPostId === post.id ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showImagePreview && previewImageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleCancelImagePreview}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl p-6 border border-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={handleCancelImagePreview}
                  className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">Profile Picture</h2>
                <div className="w-10" />
              </div>

              <div className="flex justify-center mb-6">
                <img
                  src={previewImageSrc}
                  alt="Preview"
                  className="w-48 h-48 rounded-full object-cover ring-4 ring-primary/30"
                />
              </div>

              <Button
                variant="gaming"
                onClick={handleSaveProfilePicture}
                className="w-full"
                disabled={isUploading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isUploading ? "Saving..." : "Save Profile Picture"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Preview Modal */}
      <AnimatePresence>
        {showHeaderPreview && headerPreviewSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleCancelHeaderPreview}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={handleCancelHeaderPreview}
                  className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">Header Photo</h2>
                <div className="w-10" />
              </div>

              <div className="flex justify-center mb-6">
                <img
                  src={headerPreviewSrc}
                  alt="Header Preview"
                  className="w-full h-32 rounded-lg object-cover ring-2 ring-primary/30"
                />
              </div>

              <Button
                variant="gaming"
                onClick={handleSaveHeader}
                className="w-full"
                disabled={isUploadingHeader}
              >
                <Save className="w-4 h-4 mr-2" />
                {isUploadingHeader ? "Saving..." : "Save Header Photo"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Profile;
