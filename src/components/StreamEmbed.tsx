import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StreamEmbedProps {
  twitchUrl?: string | null;
  youtubeGamingUrl?: string | null;
  kickUrl?: string | null;
  streamerId?: string;
}

function extractTwitchChannel(url: string): string | null {
  const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

function extractYouTubeChannel(url: string): string | null {
  // Support youtube.com/c/name, youtube.com/@name, youtube.com/channel/id
  const channelMatch = url.match(/youtube\.com\/(?:c\/|@|channel\/)([a-zA-Z0-9_-]+)/);
  return channelMatch ? channelMatch[1] : null;
}

function extractKickChannel(url: string): string | null {
  const match = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

export const StreamEmbed = ({ twitchUrl, youtubeGamingUrl, kickUrl, streamerId }: StreamEmbedProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"twitch" | "youtube" | "kick" | null>(null);
  const [notifying, setNotifying] = useState(false);

  const isOwner = user && streamerId && user.id === streamerId;

  const notifyFollowers = async (platform: string) => {
    setNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-go-live", {
        body: { platform },
      });
      if (error) throw error;
      toast({ title: `🔴 Followers notified!`, description: `${data.notified} followers alerted that you're live on ${platform}.` });
    } catch {
      toast({ title: "Failed to notify followers", variant: "destructive" });
    }
    setNotifying(false);
  };

  const twitchChannel = twitchUrl ? extractTwitchChannel(twitchUrl) : null;
  const youtubeChannel = youtubeGamingUrl ? extractYouTubeChannel(youtubeGamingUrl) : null;
  const kickChannel = kickUrl ? extractKickChannel(kickUrl) : null;

  const available = [
    twitchChannel && { id: "twitch" as const, label: "Twitch", channel: twitchChannel },
    youtubeChannel && { id: "youtube" as const, label: "YouTube", channel: youtubeChannel },
    kickChannel && { id: "kick" as const, label: "Kick", channel: kickChannel },
  ].filter(Boolean) as { id: "twitch" | "youtube" | "kick"; label: string; channel: string }[];

  if (available.length === 0) {
    return (
      <section className="px-4 py-4">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Tv className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Streamer Offline</h3>
          <p className="text-xs text-muted-foreground">Come back later when they're live!</p>
        </div>
      </section>
    );
  }

  const selected = activeTab ? available.find((a) => a.id === activeTab) : null;

  return (
    <section className="px-4 py-4">
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tv className="w-4 h-4 text-primary" />
            Watch Live
          </h2>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2 px-4 pb-3 flex-wrap">
          {available.map((platform) => (
            <Button
              key={platform.id}
              variant={activeTab === platform.id ? "gaming" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActiveTab(activeTab === platform.id ? null : platform.id)}
            >
              {platform.label}
            </Button>
          ))}
          {isOwner && available.map((platform) => (
            <Button
              key={`notify-${platform.id}`}
              variant="outline"
              size="sm"
              className="text-xs gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={() => notifyFollowers(platform.label)}
              disabled={notifying}
            >
              <Radio className="w-3 h-3" />
              Go Live ({platform.label})
            </Button>
          ))}
        </div>

        {/* Embed area */}
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            {selected.id === "twitch" && (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://player.twitch.tv/?channel=${selected.channel}&parent=${window.location.hostname}&muted=true`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  title={`${selected.channel} Twitch stream`}
                />
              </div>
            )}

            {selected.id === "kick" && (
              <div className="p-4 text-center space-y-3">
                <p className="text-muted-foreground text-sm">Kick streams open in a new tab</p>
                <Button
                  variant="gaming"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(kickUrl!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on Kick
                </Button>
              </div>
            )}

            {selected.id === "youtube" && (
              <div className="p-4 text-center space-y-3">
                <p className="text-muted-foreground text-sm">YouTube streams open in a new tab</p>
                <Button
                  variant="gaming"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(youtubeGamingUrl!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on YouTube
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
