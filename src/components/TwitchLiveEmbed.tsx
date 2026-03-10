import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";

interface TwitchLiveEmbedProps {
  twitchUrl: string | null;
  showTwitch: boolean;
}

const extractTwitchUsername = (url: string): string | null => {
  try {
    // Handle full URLs like https://twitch.tv/username
    const match = url.match(/(?:twitch\.tv\/)([a-zA-Z0-9_]+)/i);
    if (match) return match[1].toLowerCase();
    // If it's just a username
    if (/^[a-zA-Z0-9_]+$/.test(url)) return url.toLowerCase();
    return null;
  } catch {
    return null;
  }
};

export const TwitchLiveEmbed = ({ twitchUrl, showTwitch }: TwitchLiveEmbedProps) => {
  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [checking, setChecking] = useState(true);

  const username = twitchUrl && showTwitch ? extractTwitchUsername(twitchUrl) : null;

  useEffect(() => {
    if (!username) {
      setChecking(false);
      return;
    }

    const checkLiveStatus = async () => {
      try {
        // Use Twitch's unauthenticated oembed endpoint to check if stream is embeddable
        // We'll just attempt to embed and show it — Twitch embed handles live detection
        // For a quick check, we use the Twitch API via our edge function
        const response = await fetch(
          `https://eqgouykzakjdmgmbnsca.supabase.co/functions/v1/check-twitch-live`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsLive(data.is_live);
          setStreamTitle(data.stream_title || "");
          setViewerCount(data.viewer_count || 0);
        }
      } catch {
        // Fallback: just show embed and let Twitch handle it
        setIsLive(false);
      } finally {
        setChecking(false);
      }
    };

    checkLiveStatus();
    // Re-check every 2 minutes
    const interval = setInterval(checkLiveStatus, 120000);
    return () => clearInterval(interval);
  }, [username]);

  if (!username || checking || !isLive) return null;

  const parentDomain = window.location.hostname;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 rounded-xl overflow-hidden border border-border bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-border">
        <Radio className="w-4 h-4 text-destructive animate-pulse" />
        <span className="text-sm font-semibold text-destructive">LIVE</span>
        {streamTitle && (
          <span className="text-xs text-muted-foreground truncate flex-1">{streamTitle}</span>
        )}
        {viewerCount > 0 && (
          <span className="text-xs text-muted-foreground">{viewerCount.toLocaleString()} viewers</span>
        )}
      </div>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={`https://player.twitch.tv/?channel=${username}&parent=${parentDomain}&muted=true`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      </div>
    </motion.div>
  );
};
