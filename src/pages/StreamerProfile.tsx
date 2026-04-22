import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Star, Users, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { AvatarViewModal } from "@/components/AvatarViewModal";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { LastSeenDisplay } from "@/components/LastSeenDisplay";
import { SocialLinks } from "@/components/SocialLinks";
import { VerificationBadge } from "@/utils/verificationBadge";
import { FollowersModal } from "@/components/FollowersModal";
import { ProfileContentGrid } from "@/components/ProfileContentGrid";
import { ReelViewer } from "@/components/ReelViewer";
import { ReviewsModal } from "@/components/ReviewsModal";
import { TwitchLiveEmbed } from "@/components/TwitchLiveEmbed";
import { StreamPolls } from "@/components/StreamPolls";

interface StreamerData {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  signup_number: number | null;
  email: string | null;
  twitch_url: string | null;
  discord_url: string | null;
  kick_url: string | null;
  youtube_gaming_url: string | null;
  show_twitch: boolean;
  show_discord: boolean;
  show_kick: boolean;
  show_youtube_gaming: boolean;
}

interface Review {
  id: string;
  stars: number;
  review_text: string | null;
  created_at: string;
  fan_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const StreamerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);
  const [reviewAvatarZoom, setReviewAvatarZoom] = useState<{ url: string; name: string } | null>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following">("followers");
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [canViewProfile, setCanViewProfile] = useState(true);
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [profileReels, setProfileReels] = useState<any[]>([]);
  const [profileActiveTab, setProfileActiveTab] = useState<"posts" | "photos" | "reels" | "saved" | "live" | "more">("posts");
  const [showReelViewer, setShowReelViewer] = useState(false);
  const [reelViewerIndex, setReelViewerIndex] = useState(0);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const resolveProfileId = async () => {
    if (!id) return null;
    if (id.startsWith("user-")) {
      const signupNumber = Number(id.replace("user-", ""));
      if (!Number.isNaN(signupNumber)) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("signup_number", signupNumber)
          .maybeSingle();
        return data?.id || null;
      }
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(id)) return id;

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", id.toLowerCase())
      .maybeSingle();
    return data?.id || null;
  };

  useEffect(() => {
    if (id) {
      fetchStreamerData();
      // Track profile view
      trackProfileView();
    }
  }, [id, user]);

  const trackProfileView = async () => {
    if (!id) return;
    const profileId = await resolveProfileId();
    if (!profileId) return;
    
    // Insert profile view (will trigger notification via database trigger)
    await supabase
      .from("profile_views")
      .insert({
        profile_id: profileId,
        viewer_id: user?.id || null,
      });
  };

  const fetchStreamerData = async () => {
    if (!id) return;
    const profileId = await resolveProfileId();
    if (!profileId) {
      setLoading(false);
      return;
    }

    // Fetch streamer profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, bio, country, signup_number, email, twitch_url, discord_url, kick_url, youtube_gaming_url, show_twitch, show_discord, show_kick, show_youtube_gaming, profile_visibility")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error("Error fetching streamer:", profileError);
      setLoading(false);
      return;
    }

    setStreamer({
      id: profileData.id,
      full_name: profileData.full_name,
      username: profileData.username,
      avatar_url: profileData.avatar_url,
      bio: profileData.bio,
      country: profileData.country,
      signup_number: (profileData as any).signup_number || null,
      email: (profileData as any).email || null,
      twitch_url: (profileData as any).twitch_url || null,
      discord_url: (profileData as any).discord_url || null,
      kick_url: (profileData as any).kick_url || null,
      youtube_gaming_url: (profileData as any).youtube_gaming_url || null,
      show_twitch: (profileData as any).show_twitch ?? true,
      show_discord: (profileData as any).show_discord ?? true,
      show_kick: (profileData as any).show_kick ?? true,
      show_youtube_gaming: (profileData as any).show_youtube_gaming ?? true,
    });

    // Check profile visibility
    const visibility = (profileData as any).profile_visibility || "public";
    if (visibility === "private" && user?.id !== id) {
      setIsPrivateProfile(true);
      // Check if current user follows this profile
      if (user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .maybeSingle();
        setCanViewProfile(!!followData);
      } else {
        setCanViewProfile(false);
      }
    }

    // Fetch reviews
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select("id, stars, review_text, created_at, fan_id")
      .eq("streamer_id", id)
      .order("created_at", { ascending: false });

    if (ratingsData && ratingsData.length > 0) {
      // Fetch profiles for all fans
      const fanIds = [...new Set(ratingsData.map((r) => r.fan_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", fanIds);

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      const reviewsWithProfiles = ratingsData.map((r) => {
        const profile = profilesMap.get(r.fan_id);
        return {
          id: r.id,
          stars: r.stars,
          review_text: r.review_text,
          created_at: r.created_at,
          fan_id: r.fan_id,
          profiles: profile
            ? { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url }
            : null,
        };
      });

      setReviews(reviewsWithProfiles);

      // Calculate average rating
      const avg =
        ratingsData.reduce((sum, r) => sum + r.stars, 0) / ratingsData.length;
      setAverageRating(Math.round(avg * 10) / 10);
    } else {
      setReviews([]);
    }

    // Fetch followers count
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", id);
    setFollowersCount(count || 0);

    // Fetch following count
    const { count: followingCt } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", id);
    setFollowingCount(followingCt || 0);

    // Check if user is following
    if (user) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", id)
        .maybeSingle();

      setIsFollowing(!!followData);
    }

    setLoading(false);

    // Fetch posts for this profile
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at")
      .eq("user_id", id)
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
        return { ...post, likes_count: likes || 0, comments_count: comments || 0 };
      })
    );
    setProfilePosts(postsWithCounts);

    // Fetch reels for this profile
    const { data: reelsData } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    const enrichedReels = (reelsData || []).map(reel => ({
      ...reel,
      user: { username: profileData?.username, avatar_url: profileData?.avatar_url }
    }));
    setProfileReels(enrichedReels);
  };

  const handleFollow = async () => {
    if (!user) {
      toast({ title: "Please sign in to follow", variant: "destructive" });
      return;
    }

    if (!id) return;

    // Prevent self-follow
    if (user.id === id) {
      toast({ title: "You cannot follow yourself", variant: "destructive" });
      return;
    }

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", id);
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
      toast({ title: "Unfollowed" });
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: id,
      });
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
      toast({ title: "Following!" });
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: "Please sign in to review", variant: "destructive" });
      return;
    }

    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    if (!id) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("ratings").upsert(
      {
        streamer_id: id,
        fan_id: user.id,
        stars: rating,
        review_text: reviewText.trim() || null,
      },
      {
        onConflict: "streamer_id,fan_id",
      }
    );

    if (error) {
      toast({ title: "Failed to submit review", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    // Award XP for rating
    try {
      const { data: xpData } = await supabase.from("user_xp").select("total_xp, level").eq("user_id", user.id).single();
      if (xpData) {
        const newXp = xpData.total_xp + 15;
        const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
        await supabase.from("user_xp").update({ total_xp: newXp, level: newLevel }).eq("user_id", user.id);
      }
    } catch {}

    toast({
      title: "Review submitted!",
      description: "Thanks for your feedback! +15 XP",
    });
    setShowReviewForm(false);
    setRating(0);
    setReviewText("");
    setIsSubmitting(false);
    fetchStreamerData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Streamer not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 h-48 gradient-gaming opacity-30" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="relative pt-24 px-4 pb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <img
                src={
                  streamer.avatar_url ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
                }
                alt={streamer.full_name || "Streamer"}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/30 shadow-xl shadow-primary/20 cursor-pointer"
                onClick={() => setShowAvatarZoom(true)}
              />
              {/* Online indicator */}
              <OnlineIndicator 
                userId={id!} 
                className="absolute bottom-1 right-1"
                size="lg"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-1">
                {streamer.username || streamer.full_name || "Anonymous"}
                <VerificationBadge email={streamer.email} signupNumber={streamer.signup_number} className="w-5 h-5" />
              </h1>
              {streamer.signup_number && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  #{streamer.signup_number}
                </span>
              )}
            </div>
            {streamer.country && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{streamer.country}</span>
              </div>
            )}
            
            {/* Last Seen */}
            <LastSeenDisplay userId={id!} className="mt-1" />
            
            {/* About/Bio under Last Seen */}
            {streamer.bio && (
              <p className="text-muted-foreground text-sm text-center mt-1 max-w-xs line-clamp-2">
                {streamer.bio.length > 75 ? streamer.bio.substring(0, 75) + "..." : streamer.bio}
              </p>
            )}
            
            {/* Social Links */}
            <SocialLinks
              twitchUrl={streamer.twitch_url}
              discordUrl={streamer.discord_url}
              kickUrl={streamer.kick_url}
              youtubeGamingUrl={streamer.youtube_gaming_url}
              showTwitch={streamer.show_twitch}
              showDiscord={streamer.show_discord}
              showKick={streamer.show_kick}
              showYoutubeGaming={streamer.show_youtube_gaming}
              className="mt-3"
            />

            {/* Live Twitch Stream Preview */}
            <TwitchLiveEmbed
              twitchUrl={streamer.twitch_url}
              showTwitch={streamer.show_twitch}
            />

            <StreamPolls streamerId={streamer.id} />
          </motion.div>

            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="text-lg font-bold text-foreground">
                    {averageRating || "N/A"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <button className="text-center hover:opacity-80 transition-opacity" onClick={() => setShowReviewsModal(true)}>
                <span className="text-lg font-bold text-foreground">
                  {reviews.length}
                </span>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </button>
              <button className="text-center hover:opacity-80 transition-opacity" onClick={() => { setFollowersModalType("following"); setShowFollowersModal(true); }}>
                <span className="text-lg font-bold text-foreground">
                  {followingCount}
                </span>
                <p className="text-xs text-muted-foreground">Following</p>
              </button>
              <button className="text-center hover:opacity-80 transition-opacity" onClick={() => { setFollowersModalType("followers"); setShowFollowersModal(true); }}>
                <span className="text-lg font-bold text-foreground">
                  {followersCount}
                </span>
                <p className="text-xs text-muted-foreground">Followers</p>
              </button>
            </div>
        </div>
      </header>

      {/* Private Profile Gate */}
      {isPrivateProfile && !canViewProfile ? (
        <div className="px-4 py-8">
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">This Account is Private</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Follow this account to see their posts, reels, and more.
            </p>
            {user?.id !== id && (
              <Button
                variant={isFollowing ? "outline" : "gaming"}
                onClick={handleFollow}
              >
                {isFollowing ? "Requested" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Actions */}
          <section className="px-4 py-2">
            <div className="flex gap-3">
              <Button
                variant="gaming"
                className="flex-1"
                onClick={() => setShowReviewForm(true)}
              >
                <Star className="w-4 h-4" />
                Rate & Review
              </Button>
              {user?.id !== id && (
                <Button
                  variant={isFollowing ? "outline" : "gaming"}
                  className="flex-1"
                  onClick={handleFollow}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </section>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReviewForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl"
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold text-foreground mb-4 text-center">
                Rate {streamer.username || streamer.full_name}
              </h2>

              <div className="flex justify-center mb-6">
                <StarRating
                  rating={rating}
                  size="lg"
                  interactive
                  onRatingChange={setRating}
                />
              </div>

              <p className="text-center text-muted-foreground text-sm mb-4">
                {rating === 0 ? "Tap to rate" : `You rated ${rating} star${rating > 1 ? 's' : ''}`}
              </p>

              <textarea
                placeholder="Write your review (optional)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full min-h-[100px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="gaming"
                  className="flex-1"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || rating === 0}
                >
                  {isSubmitting ? "Saving..." : "Save Review"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

          {/* Profile Content Grid - Posts/Photos/Reels */}
          <ProfileContentGrid
            posts={profilePosts}
            savedPosts={[]}
            reels={profileReels}
            activeTab={profileActiveTab}
            onTabChange={setProfileActiveTab}
            onReelClick={(index) => { setReelViewerIndex(index); setShowReelViewer(true); }}
            onPostDelete={() => {}}
            onReelDelete={() => {}}
            isOwnProfile={user?.id === id}
            authorName={streamer?.username || streamer?.full_name || "User"}
            authorAvatar={streamer?.avatar_url || ""}
            authorId={id}
          />
        </>
      )}

      {/* Avatar View Modals */}
      <AvatarViewModal
        isOpen={showAvatarZoom}
        onClose={() => setShowAvatarZoom(false)}
        imageUrl={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face"}
        username={streamer.username || streamer.full_name || undefined}
      />

      <AvatarViewModal
        isOpen={!!reviewAvatarZoom}
        onClose={() => setReviewAvatarZoom(null)}
        imageUrl={reviewAvatarZoom?.url || ""}
        username={reviewAvatarZoom?.name}
      />

      {/* Followers/Following Modal */}
      {showFollowersModal && id && (
        <FollowersModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={id}
          type={followersModalType}
        />
      )}

      {/* Reel Viewer */}
      <ReelViewer
        isOpen={showReelViewer}
        onClose={() => setShowReelViewer(false)}
        reels={profileReels}
        initialIndex={reelViewerIndex}
      />

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        userId={id!}
        userName={streamer?.username || streamer?.full_name || undefined}
      />

      <BottomNav />
    </div>
  );
};

export default StreamerProfile;
