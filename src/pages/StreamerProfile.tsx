import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Star, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { BottomNav } from "@/components/BottomNav";
import { mockStreamers, mockReviews } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const StreamerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const streamer = mockStreamers.find((s) => s.id === id);

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Streamer not found</p>
      </div>
    );
  }

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Review submitted!",
      description: "Thanks for your feedback!",
    });
    setShowReviewForm(false);
    setRating(0);
    setReviewText("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 h-48 gradient-gaming opacity-30" />
        
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Profile info */}
        <div className="relative pt-24 px-4 pb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <img
              src={streamer.profilePicture}
              alt={streamer.name}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/30 shadow-xl shadow-primary/20"
            />
            <h1 className="mt-4 text-2xl font-bold text-foreground">{streamer.name}</h1>
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span>{streamer.country}</span>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mt-6"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-primary text-primary" />
                <span className="text-xl font-bold text-foreground">{streamer.averageRating}</span>
              </div>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-foreground">{streamer.totalReviews}</span>
              </div>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-foreground">12.5k</span>
              </div>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Bio */}
      <section className="px-4 py-4">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">About</h2>
          <p className="text-foreground/90">{streamer.bio}</p>
        </div>
      </section>

      {/* Actions */}
      <section className="px-4 py-2">
        <div className="flex gap-3">
          <Button variant="gaming" className="flex-1" onClick={() => setShowReviewForm(true)}>
            <Star className="w-4 h-4" />
            Rate & Review
          </Button>
          <Button variant="outline" className="flex-1">
            Follow
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
              <h2 className="text-xl font-bold text-foreground mb-4">Rate {streamer.name}</h2>
              
              <div className="flex justify-center mb-6">
                <StarRating rating={rating} size="lg" interactive onRatingChange={setRating} />
              </div>

              <Input
                placeholder="Write your review (optional)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="mb-4"
              />

              <Button variant="gaming" className="w-full" onClick={handleSubmitReview}>
                Submit Review
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Reviews</h2>
        <div className="space-y-3">
          {mockReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-4 border border-border/50"
            >
              <div className="flex items-start gap-3">
                <img
                  src={review.userPicture}
                  alt={review.userName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{review.userName}</h4>
                    <StarRating rating={review.stars} size="sm" />
                  </div>
                  <p className="text-sm text-foreground/80 mt-2">{review.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(review.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default StreamerProfile;
