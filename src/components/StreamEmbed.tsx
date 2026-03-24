import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { normalizeStreamUrl } from "@/lib/streamLinks";

interface StreamEmbedProps {
  twitchUrl?: string | null;
  youtubeGamingUrl?: string | null;
  kickUrl?: string | null;
  streamerId?: string;
}

function extractTwitchChannel(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return pathParts[0] ? pathParts[0].replace(/^@/, "") : null;
  } catch {
    return null;
  }
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

  const twitchLink = twitchUrl ? normalizeStreamUrl("twitch", twitchUrl) : "";
  const youtubeLink = youtubeGamingUrl ? normalizeStreamUrl("youtube", youtubeGamingUrl) : "";
  const kickLink = kickUrl ? normalizeStreamUrl("kick", kickUrl) : "";
  const twitchChannel = twitchLink ? extractTwitchChannel(twitchLink) : null;

  const available = [
    twitchChannel && { id: "twitch" as const, label: "Twitch", channel: twitchChannel, url: twitchLink },
    youtubeLink && { id: "youtube" as const, label: "YouTube", url: youtubeLink },
    kickLink && { id: "kick" as const, label: "Kick", url: kickLink },
  ].filter(Boolean) as { id: "twitch" | "youtube" | "kick"; label: string; url: string; channel?: string }[];

  if (available.length === 0) {
    return null;
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
                  src={`https://player.twitch.tv/?channel=${selected.channel || ""}&parent=${window.location.hostname}&muted=true`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  title={`${selected.channel || "Streamer"} Twitch stream`}
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
                  onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
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
                  onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
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
