import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreamEmbedProps {
  twitchUrl?: string | null;
  youtubeGamingUrl?: string | null;
  kickUrl?: string | null;
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

export const StreamEmbed = ({ twitchUrl, youtubeGamingUrl, kickUrl }: StreamEmbedProps) => {
  const [activeTab, setActiveTab] = useState<"twitch" | "youtube" | "kick" | null>(null);

  const twitchChannel = twitchUrl ? extractTwitchChannel(twitchUrl) : null;
  const youtubeChannel = youtubeGamingUrl ? extractYouTubeChannel(youtubeGamingUrl) : null;
  const kickChannel = kickUrl ? extractKickChannel(kickUrl) : null;

  const available = [
    twitchChannel && { id: "twitch" as const, label: "Twitch", channel: twitchChannel },
    youtubeChannel && { id: "youtube" as const, label: "YouTube", channel: youtubeChannel },
    kickChannel && { id: "kick" as const, label: "Kick", channel: kickChannel },
  ].filter(Boolean) as { id: "twitch" | "youtube" | "kick"; label: string; channel: string }[];

  if (available.length === 0) return null;

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
        <div className="flex gap-2 px-4 pb-3">
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
