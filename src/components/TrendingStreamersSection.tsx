import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { TrendingStreamer } from "@/components/TrendingStreamer";

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
  const [isVisible, setIsVisible] = useState(true);

  return (
    <section className="py-4">
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2 mb-4 w-full justify-between"
      >
        <h2 className="text-lg font-semibold text-foreground">
          🔥 Trending Streamers
        </h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{isVisible ? "Hide" : "View"}</span>
          {isVisible ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {trendingStreamers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No streamers yet. Be the first to join!
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  {trendingStreamers.map((streamer, index) => (
                    <TrendingStreamer
                      key={streamer.id}
                      id={streamer.id}
                      name={streamer.username || "Anonymous"}
                      profilePicture={
                        streamer.avatar_url ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                      }
                      rank={index + 1}
                      averageRating={streamer.average_rating}
                      index={index}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};