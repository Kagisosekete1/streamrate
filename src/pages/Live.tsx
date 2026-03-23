import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink, Radio, Users, Gamepad2 } from "lucide-react";
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
  // Live data from Twitch API
  is_live?: boolean;
  stream_title?: string;
  viewer_count?: number;
  game_name?: string;
}

const extractTwitchUsername = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    // Maybe it's just a username
    return url.replace(/^@/, "").trim() || null;
  }
};

const Live = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamers, setStreamers] = useState<LiveStreamer[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLiveStreamers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, twitch_url, kick_url, youtube_gaming_url, discord_url, show_twitch, show_kick, show_youtube_gaming, show_discord");

    if (!data) {
      setLoading(false);
      return;
    }

    // Filter users with at least one visible streaming link
    const withLinks = data.filter(
      (p) =>
        (p.twitch_url && p.show_twitch) ||
        (p.kick_url && p.show_kick) ||
        (p.youtube_gaming_url && p.show_youtube_gaming)
    );

    const liveResults: LiveStreamer[] = [];

    // Check Twitch live status
    const twitchChecks = withLinks
      .filter((p) => p.twitch_url && p.show_twitch)
      .map(async (p) => {
        const twitchUsername = extractTwitchUsername(p.twitch_url!);
        if (!twitchUsername) return null;

        try {
          const { data: liveData } = await supabase.functions.invoke("check-twitch-live", {
            body: { username: twitchUsername },
          });

          if (liveData?.is_live) {
            return {
              ...p,
              is_live: true,
              stream_title: liveData.stream_title,
              viewer_count: liveData.viewer_count,
              game_name: liveData.game_name,
            } as LiveStreamer;
          }
        } catch (err) {
          console.error(`Failed to check live for ${twitchUsername}:`, err);
        }
        return null;
      });

    const twitchResults = await Promise.all(twitchChecks);
    twitchResults.forEach((r) => {
      if (r) liveResults.push(r);
    });

    // Add Kick streamers (no API check available, show as "possibly live")
    const kickStreamers = withLinks.filter(
      (p) => p.kick_url && p.show_kick && !liveResults.some((lr) => lr.id === p.id)
    );
    kickStreamers.forEach((p) => {
      liveResults.push({
        ...p,
        is_live: true,
        stream_title: "Streaming on Kick",
        viewer_count: undefined,
        game_name: undefined,
      });
    });

    // Add YouTube Gaming streamers
    const ytStreamers = withLinks.filter(
      (p) => p.youtube_gaming_url && p.show_youtube_gaming && !liveResults.some((lr) => lr.id === p.id)
    );
    ytStreamers.forEach((p) => {
      liveResults.push({
        ...p,
        is_live: true,
        stream_title: "Streaming on YouTube",
        viewer_count: undefined,
        game_name: undefined,
      });
    });

    // Sort: Twitch live (with viewers) first, then others
    liveResults.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));

    setStreamers(liveResults);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLiveStreamers();
    intervalRef.current = setInterval(() => fetchLiveStreamers(true), 120000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLiveStreamers]);

  const ensureFullUrl = (url: string): string => {
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const getPlatformLinks = (streamer: LiveStreamer) => {
    const links: { name: string; url: string; color: string; bg: string }[] = [];
    if (streamer.twitch_url && streamer.show_twitch) {
      links.push({ name: "Twitch", url: ensureFullUrl(streamer.twitch_url), color: "text-purple-400", bg: "bg-purple-500/20" });
    }
    if (streamer.kick_url && streamer.show_kick) {
      links.push({ name: "Kick", url: ensureFullUrl(streamer.kick_url), color: "text-green-400", bg: "bg-green-500/20" });
    }
    if (streamer.youtube_gaming_url && streamer.show_youtube_gaming) {
      links.push({ name: "YouTube", url: ensureFullUrl(streamer.youtube_gaming_url), color: "text-red-400", bg: "bg-red-500/20" });
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
              <h1 className="text-2xl font-bold text-foreground">Live Now</h1>
              {streamers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                  {streamers.length} live
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Streamers currently live on their platforms
            </p>
          </div>
        </header>

        <main className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : streamers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <Tv className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No one is live right now</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Check back later to see who's streaming!
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
                          src={streamer.avatar_url || "/placeholder.svg"}
                          alt={streamer.username || "Streamer"}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500/70"
                        />
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full uppercase">
                          Live
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {streamer.username || streamer.full_name || "Streamer"}
                        </p>
                        {streamer.stream_title && (
                          <p className="text-xs text-muted-foreground truncate">{streamer.stream_title}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {streamer.viewer_count != null && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <Users className="w-3 h-3" /> {streamer.viewer_count.toLocaleString()} viewers
                            </span>
                          )}
                          {streamer.game_name && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Gamepad2 className="w-3 h-3" /> {streamer.game_name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
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
