import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, Edit2, Users, Star, MessageCircle, Camera, X, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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
  const { user, profile, userRole, signOut, updateProfile, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    country: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        country: profile.country || "",
      });
    }
  }, [profile]);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const { error } = await updateProfile({ avatar_url: urlData.publicUrl });

    if (error) {
      toast({
        title: "Failed to update avatar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Avatar updated!",
      });
    }

    setIsUploading(false);
  };

  const handleSaveProfile = async () => {
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

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 h-32 gradient-gaming opacity-30" />

        <div className="relative pt-4 px-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Profile info */}
        <div className="relative px-4 pb-6 -mt-4">
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
                onChange={handleAvatarUpload}
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
              {profile.full_name || "Anonymous"}
            </h1>
            {profile.username && (
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            )}
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
                className="bg-card rounded-xl p-4 border border-border/50 cursor-pointer"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <p className="text-foreground/90 text-sm line-clamp-3">{post.content}</p>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-32 object-cover rounded-lg mt-3"
                  />
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>❤️ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                  <span className="ml-auto">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl p-6 border-t border-border max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Full Name
                  </label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Username
                  </label>
                  <Input
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full min-h-[100px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
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

                <Button variant="gaming" className="w-full" onClick={handleSaveProfile}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl p-6 border-t border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Settings</h2>
                <button onClick={() => setShowSettingsModal(false)}>
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowEditModal(true);
                  }}
                  className="w-full p-4 rounded-xl bg-secondary/50 text-left hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Edit2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Edit Profile</p>
                      <p className="text-sm text-muted-foreground">
                        Update your name, bio, and photo
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full p-4 rounded-xl bg-destructive/10 text-left hover:bg-destructive/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Log Out</p>
                      <p className="text-sm text-muted-foreground">
                        Sign out of your account
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Profile;
