import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { Star } from "lucide-react";

interface Streamer {
  id: string;
  username: string | null;
  avatar_url: string | null;
  average_rating: number;
}

interface TrendingStreamersSectionProps {
  trendingStreamers: Streamer[];
}

export const TrendingStreamersSection = ({ trendingStreamers }: TrendingStreamersSectionProps) => {
  if (trendingStreamers.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="overflow-x-auto scrollbar-hide py-4 px-4">
        <div className="flex gap-4">
          {trendingStreamers.map((streamer, index) => (
            <motion.div
              key={streamer.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <Link to={`/streamer/${streamer.id}`} className="block">
                <div className="relative">
                  {/* Rank badge */}
                  <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                    #{index + 1}
                  </div>
                  {/* Instagram-style gradient ring */}
                  <div className="p-[3px] rounded-full story-ring">
                    <div className="p-[2px] rounded-full bg-background">
                      <img
                        src={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                        alt={streamer.username || "Streamer"}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Online indicator */}
                  <OnlineIndicator 
                    userId={streamer.id} 
                    className="absolute bottom-1 right-1"
                    size="sm"
                  />
                </div>
              </Link>
              <span className="text-xs text-foreground truncate max-w-[72px] text-center font-medium">
                {streamer.username || "user"}
              </span>
              {/* Rating display */}
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-[10px] text-muted-foreground">
                  {streamer.average_rating.toFixed(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};