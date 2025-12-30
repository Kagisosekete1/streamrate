import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Star, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface StreamerData {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
}

interface Review {
  id: string;
  stars: number;
  review_text: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStreamerData();
    }
  }, [id, user]);

  const fetchStreamerData = async () => {
    if (!id) return;

    // Fetch streamer profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, bio, country")
      .eq("id", id)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error("Error fetching streamer:", profileError);
      setLoading(false);
      return;
    }

    setStreamer(profileData);

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
        .select("id, full_name, avatar_url")
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
          profiles: profile
            ? { full_name: profile.full_name, avatar_url: profile.avatar_url }
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

    toast({
      title: "Review submitted!",
      description: "Thanks for your feedback!",
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
            <img
              src={
                streamer.avatar_url ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
              }
              alt={streamer.full_name || "Streamer"}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/30 shadow-xl shadow-primary/20"
            />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              {streamer.username || streamer.full_name || "Anonymous"}
            </h1>
            {streamer.country && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{streamer.country}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mt-6"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-primary text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {averageRating || "N/A"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {reviews.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {followersCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Bio */}
      {streamer.bio && (
        <section className="px-4 py-4">
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              About
            </h2>
            <p className="text-foreground/90">{streamer.bio}</p>
          </div>
        </section>
      )}

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
          <Button
            variant={isFollowing ? "outline" : "gaming"}
            className="flex-1"
            onClick={handleFollow}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      </section>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end"
            onClick={() => setShowReviewForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl p-6 border-t border-border"
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold text-foreground mb-4">
                Rate {streamer.full_name}
              </h2>

              <div className="flex justify-center mb-6">
                <StarRating
                  rating={rating}
                  size="lg"
                  interactive
                  onRatingChange={setRating}
                />
              </div>

              <textarea
                placeholder="Write your review (optional)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full min-h-[100px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />

              <Button
                variant="gaming"
                className="w-full"
                onClick={handleSubmitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Reviews</h2>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviews yet. Be the first!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-4 border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={
                      review.profiles?.avatar_url ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                    }
                    alt={review.profiles?.full_name || "User"}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">
                        {review.profiles?.full_name || "Anonymous"}
                      </h4>
                      <StarRating rating={review.stars} size="sm" />
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-foreground/80 mt-2">
                        {review.review_text}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default StreamerProfile;
