import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";
import { formatDistanceToNow } from "date-fns";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { VerificationBadge } from "@/utils/verificationBadge";

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
    email: string | null;
  } | null;
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

export const ReviewsModal = ({ isOpen, onClose, userId, userName }: ReviewsModalProps) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, userId]);

  const fetchReviews = async () => {
    setLoading(true);
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select("id, stars, review_text, created_at, fan_id")
      .eq("streamer_id", userId)
      .order("created_at", { ascending: false });

    if (ratingsData && ratingsData.length > 0) {
      const fanIds = [...new Set(ratingsData.map((r) => r.fan_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, email")
        .in("id", fanIds);

      const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

      const reviewsWithProfiles = ratingsData.map((r) => {
        const profile = profilesMap.get(r.fan_id);
        return {
          ...r,
          profiles: profile
            ? { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url, email: (profile as any).email }
            : null,
        };
      });
      setReviews(reviewsWithProfiles);
    } else {
      setReviews([]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] bg-card rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Reviews {userName ? `for ${userName}` : ""}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-secondary/30 rounded-2xl p-3 border border-border/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={
                            review.profiles?.avatar_url ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"
                          }
                          alt=""
                          className="w-9 h-9 rounded-full object-cover cursor-pointer"
                          onClick={() => {
                            onClose();
                            navigate(`/streamer/${review.fan_id}`);
                          }}
                        />
                        <OnlineIndicator userId={review.fan_id} className="absolute -bottom-0.5 -right-0.5" size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <button
                            className="font-medium text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                            onClick={() => {
                              onClose();
                              navigate(`/streamer/${review.fan_id}`);
                            }}
                          >
                            {review.profiles?.username || review.profiles?.full_name || "Anonymous"}
                            <VerificationBadge email={review.profiles?.email} />
                          </button>
                          <StarRating rating={review.stars} size="sm" />
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-foreground/80 mt-1">{review.review_text}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
