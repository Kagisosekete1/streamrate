import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";
import { useState } from "react";
import { AvatarViewModal } from "@/components/AvatarViewModal";

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
  const [avatarView, setAvatarView] = useState<{ url: string; name: string } | null>(null);

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
                  {/* Instagram-style gradient ring */}
                  <div className="p-[3px] rounded-full story-ring">
                    <div className="p-[2px] rounded-full bg-background">
                      <img
                        src={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                        alt={streamer.username || "Streamer"}
                        className="w-16 h-16 rounded-full object-cover cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAvatarView({
                            url: streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face",
                            name: streamer.username || "Streamer"
                          });
                        }}
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
              <span className="text-xs text-foreground truncate max-w-[72px] text-center">
                {streamer.username || "user"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Avatar View Modal */}
      <AvatarViewModal
        isOpen={!!avatarView}
        onClose={() => setAvatarView(null)}
        imageUrl={avatarView?.url || ""}
        username={avatarView?.name}
      />
    </section>
  );
};