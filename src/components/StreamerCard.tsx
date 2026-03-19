import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Star, Crown, Medal, Award } from "lucide-react";
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
  showRank?: boolean;
  hasStreamingPlatform?: boolean;
}

export const StreamerCard = forwardRef<HTMLDivElement, StreamerCardProps>(({
  id,
  name,
  profilePicture,
  country,
  averageRating,
  totalReviews,
  index = 0,
  rank,
  showRank = false,
  hasStreamingPlatform = false,
}, ref) => {
  const displayRank = rank ?? index + 1;
  
  // Medal colors and icons for top 3
  const getRankStyles = (rankNum: number) => {
    switch (rankNum) {
      case 1:
        return {
          bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
          text: "text-yellow-950",
          icon: Crown,
          glow: "shadow-lg shadow-yellow-500/30",
        };
      case 2:
        return {
          bg: "bg-gradient-to-br from-gray-300 to-gray-400",
          text: "text-gray-900",
          icon: Medal,
          glow: "shadow-lg shadow-gray-400/30",
        };
      case 3:
        return {
          bg: "bg-gradient-to-br from-amber-500 to-orange-600",
          text: "text-orange-950",
          icon: Award,
          glow: "shadow-lg shadow-amber-500/30",
        };
      default:
        return {
          bg: "bg-secondary",
          text: "text-muted-foreground",
          icon: null,
          glow: "",
        };
    }
  };

  const rankStyles = getRankStyles(displayRank);
  const RankIcon = rankStyles.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link to={`/streamer/${id}`}>
        <div className="bg-card rounded-xl p-4 card-glow card-glow-hover transition-all duration-300 hover:translate-y-[-2px] border border-border/50">
          <div className="flex items-center gap-4">
            {/* Rank Badge - only shown when showRank is true */}
            {showRank && (
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${rankStyles.bg} ${rankStyles.text} ${rankStyles.glow}`}
              >
                {RankIcon ? (
                  <RankIcon className="w-5 h-5" />
                ) : (
                  <span className="text-xs font-bold">#{displayRank}</span>
                )}
              </div>
            )}

            <div className="relative">
              <img
                src={profilePicture}
                alt={name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
              />
              {hasStreamingPlatform && (
                <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 rounded-full border-2 border-card flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[8px] font-bold text-white uppercase">Live</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{country}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end mb-0.5">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

StreamerCard.displayName = "StreamerCard";
