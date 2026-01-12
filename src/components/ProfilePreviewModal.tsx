import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Users, MessageCircle } from "lucide-react";

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    username?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    country?: string | null;
  };
  headerUrl?: string | null;
  userRole?: string | null;
  stats: {
    followers: number;
    following: number;
    posts: number;
    averageRating?: number;
    reviewsCount?: number;
  };
}

export const ProfilePreviewModal = ({
  isOpen,
  onClose,
  profile,
  headerUrl,
  userRole,
  stats,
}: ProfilePreviewModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl overflow-hidden border border-border shadow-2xl"
          >
            {/* Header Banner */}
            <div
              className="h-24 w-full bg-cover bg-center relative"
              style={{
                backgroundImage: headerUrl
                  ? `url(${headerUrl})`
                  : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                backgroundSize: "cover",
              }}
            >
              <div className="absolute inset-0 bg-black/30" />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
                Preview
              </div>
            </div>

            {/* Profile Content */}
            <div className="relative px-4 pb-6 -mt-10">
              <div className="flex flex-col items-center">
                <img
                  src={
                    profile.avatar_url ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
                  }
                  alt={profile.username || "User"}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-card"
                />

                <h2 className="mt-3 text-lg font-bold text-foreground">
                  {profile.username || "Anonymous"}
                </h2>
                
                {userRole && (
                  <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium mt-1 capitalize">
                    {userRole}
                  </span>
                )}
                
                {profile.bio && (
                  <p className="text-muted-foreground text-xs text-center mt-2 max-w-[200px] line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {profile.country && (
                  <p className="text-muted-foreground text-xs mt-1">
                    📍 {profile.country}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground">{stats.followers}</span>
                    <p className="text-[10px] text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground">{stats.following}</span>
                    <p className="text-[10px] text-muted-foreground">Following</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground">{stats.posts}</span>
                    <p className="text-[10px] text-muted-foreground">Posts</p>
                  </div>
                </div>

                {/* Streamer Stats */}
                {userRole === "streamer" && (
                  <div className="flex gap-4 mt-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-primary" />
                      <span>{stats.averageRating || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="w-3 h-3 text-primary" />
                      <span>{stats.reviewsCount || 0} reviews</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pb-4">
              <p className="text-center text-xs text-muted-foreground">
                This is how others see your profile
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
