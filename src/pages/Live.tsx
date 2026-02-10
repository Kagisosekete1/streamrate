import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LiveStreamer {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  twitch_url: string | null;
  kick_url: string | null;
  youtube_gaming_url: string | null;
  discord_url: string | null;
  show_twitch: boolean;
  show_kick: boolean;
  show_youtube_gaming: boolean;
  show_discord: boolean;
}

const Live = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamers, setStreamers] = useState<LiveStreamer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreamersWithLinks();
  }, []);

  const fetchStreamersWithLinks = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, twitch_url, kick_url, youtube_gaming_url, discord_url, show_twitch, show_kick, show_youtube_gaming, show_discord");

    if (data) {
      // Only show users who have at least one visible streaming platform link
      const withLinks = data.filter(
        (p) =>
          (p.twitch_url && p.show_twitch) ||
          (p.kick_url && p.show_kick) ||
          (p.youtube_gaming_url && p.show_youtube_gaming)
      );
      setStreamers(withLinks as LiveStreamer[]);
    }
    setLoading(false);
  };

  const getPlatformLinks = (streamer: LiveStreamer) => {
    const links: { name: string; url: string; color: string; bg: string; icon: string }[] = [];
    if (streamer.twitch_url && streamer.show_twitch) {
      links.push({ name: "Twitch", url: streamer.twitch_url, color: "text-purple-400", bg: "bg-purple-500/20", icon: "🟣" });
    }
    if (streamer.kick_url && streamer.show_kick) {
      links.push({ name: "Kick", url: streamer.kick_url, color: "text-green-400", bg: "bg-green-500/20", icon: "🟢" });
    }
    if (streamer.youtube_gaming_url && streamer.show_youtube_gaming) {
      links.push({ name: "YouTube", url: streamer.youtube_gaming_url, color: "text-red-400", bg: "bg-red-500/20", icon: "🔴" });
    }
    return links;
  };

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500 animate-pulse" />
              <h1 className="text-2xl font-bold text-foreground">Live</h1>
              {streamers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                  {streamers.length} streamers
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Watch streamers live on their platforms
            </p>
          </div>
        </header>

        <main className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : streamers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <Tv className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No streamers available</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                No streamers have linked their streaming platforms yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {streamers.map((streamer, index) => {
                const platformLinks = getPlatformLinks(streamer);
                return (
                  <motion.div
                    key={streamer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-xl p-4 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={streamer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                          alt={streamer.username || "Streamer"}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/50"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {streamer.username || streamer.full_name || "Streamer"}
                        </p>
                        {/* Platform links that redirect to the streaming platform */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {platformLinks.map((link) => (
                            <a
                              key={link.name}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${link.bg} ${link.color} text-xs font-medium hover:opacity-80 transition-opacity`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Watch on {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
};

export default Live;
