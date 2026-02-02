import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { useState } from "react";
import { AvatarViewModal } from "@/components/AvatarViewModal";

interface TrendingStreamerProps {
  id: string;
  name: string;
  profilePicture: string;
  rank: number;
  averageRating: number;
  index?: number;
}

export const TrendingStreamer = ({
  id,
  name,
  profilePicture,
  rank,
  averageRating,
  index = 0,
}: TrendingStreamerProps) => {
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
        className="flex-shrink-0"
      >
        <Link to={`/streamer/${id}`} className="block">
          <div className="relative w-20 flex flex-col items-center">
            <div className={cn(
              "relative p-0.5 rounded-full",
              rank <= 3 
                ? "bg-gradient-to-br from-primary via-accent to-primary" 
                : "bg-gradient-to-br from-secondary to-muted"
            )}>
              <img
                src={profilePicture}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-2 border-card cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAvatarZoom(true);
                }}
              />
              
              {/* Online indicator */}
              <OnlineIndicator 
                userId={id} 
                className="absolute top-0 right-0"
                size="md"
              />
              
              {/* Rank badge */}
              <div className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card",
                rank === 1 && "bg-yellow-500 text-yellow-950",
                rank === 2 && "bg-gray-400 text-gray-900",
                rank === 3 && "bg-orange-600 text-orange-100",
                rank > 3 && "bg-secondary text-foreground"
              )}>
                {rank}
              </div>
            </div>
            
            <p className="mt-2 text-xs font-medium text-foreground truncate w-full text-center">
              {name}
            </p>
            <p className="text-[10px] text-primary">⭐ {averageRating.toFixed(1)}</p>
          </div>
        </Link>
      </motion.div>

      {/* Avatar View Modal */}
      <AvatarViewModal
        isOpen={showAvatarZoom}
        onClose={() => setShowAvatarZoom(false)}
        imageUrl={profilePicture}
        username={name}
      />
    </>
  );
};
