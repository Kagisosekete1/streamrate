import { motion } from "framer-motion";
import { MapPin, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { StarRating } from "./StarRating";

interface StreamerCardProps {
  id: string;
  name: string;
  profilePicture: string;
  country: string;
  averageRating: number;
  totalReviews: number;
  index?: number;
  rank?: number;
}

export const StreamerCard = ({
  id,
  name,
  profilePicture,
  country,
  averageRating,
  totalReviews,
  index = 0,
  rank,
}: StreamerCardProps) => {
  const displayRank = rank ?? index + 1;
  
  // Medal colors for top 3
  const getMedalColor = (rankNum: number) => {
    switch (rankNum) {
      case 1:
        return "bg-yellow-500 text-yellow-950";
      case 2:
        return "bg-gray-400 text-gray-900";
      case 3:
        return "bg-amber-600 text-amber-950";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link to={`/streamer/${id}`}>
        <div className="bg-card rounded-xl p-4 card-glow card-glow-hover transition-all duration-300 hover:translate-y-[-2px] border border-border/50">
          <div className="flex items-center gap-4">
            {/* Rank Badge */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getMedalColor(displayRank)}`}
            >
              {displayRank <= 3 ? (
                <Trophy className="w-5 h-5" />
              ) : (
                `#${displayRank}`
              )}
            </div>

            <div className="relative">
              <img
                src={profilePicture}
                alt={name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3 h-3" />
                <span>{country}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <StarRating rating={averageRating} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReviews} reviews
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
