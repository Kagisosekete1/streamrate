import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Users, Send, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeStreamUrl, validateStreamUrl, StreamPlatform } from "@/lib/streamLinks";
import { WatchPartyComments } from "@/components/WatchPartyComments";
import { toast } from "sonner";

const REACTIONS = ["🔥", "😂", "💯", "🎮", "👏", "❤️", "😱", "🏆"];

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

const WatchPartyRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [party, setParty] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [floating, setFloating] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("watch_parties").select("*").eq("id", id).maybeSingle();
      if (!data) {
        toast.error("Party not found");
        navigate("/watch-parties");
        return;
      }
      if (data.is_active === false) {
        toast.error("This watch party has ended");
        navigate("/watch-parties");
        return;
      }
      setParty(data);

      if (user) {
        await supabase.from("watch_party_members").upsert({ party_id: id, user_id: user.id }, { onConflict: "party_id,user_id" });
      }
      const { count } = await supabase.from("watch_party_members").select("*", { count: "exact", head: true }).eq("party_id", id);
      setMemberCount(count || 0);
    };
    load();

    const channel = supabase
      .channel(`party-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "watch_party_reactions", filter: `party_id=eq.${id}` },
        (payload) => {
          const r = payload.new as Reaction;
          const fl = { id: r.id, emoji: r.emoji, x: Math.random() * 80 + 10 };
          setFloating((prev) => [...prev, fl]);
          setTimeout(() => setFloating((prev) => prev.filter((p) => p.id !== fl.id)), 3000);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_members", filter: `party_id=eq.${id}` },
        async () => {
          const { count } = await supabase.from("watch_party_members").select("*", { count: "exact", head: true }).eq("party_id", id);
          setMemberCount(count || 0);
        })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (user && id) supabase.from("watch_party_members").delete().eq("party_id", id).eq("user_id", user.id);
    };
  }, [id, user, navigate]);

  const sendReaction = async (emoji: string) => {
    if (!user || !id) return;
    await supabase.from("watch_party_reactions").insert({ party_id: id, user_id: user.id, emoji });
  };

  if (!party) return null;

  // Validate + normalize once so embeds are reliable on laptops too.
  const platform = party.platform as StreamPlatform;
  const validated = validateStreamUrl(platform, party.stream_url);
  const canonicalUrl = validated.ok ? validated.url : normalizeStreamUrl(platform, party.stream_url) || party.stream_url;
  const externalUrl = canonicalUrl;

  const embedUrl = (() => {
    const url = canonicalUrl;
    const host = window.location.hostname;
    // Twitch requires every embedding parent host. Cover the current host
    // plus the Lovable preview/published domains so laptop previews work.
    const parents = Array.from(new Set([
      host,
      "lovable.app",
      "lovableproject.com",
      "streamrateapp.com",
      "www.streamrateapp.com",
    ].filter(Boolean)));
    const parentParams = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");

    if (platform === "twitch") {
      const channel = url.split("/").filter(Boolean).pop()?.replace(/^@/, "") || "";
      if (!channel) return null;
      return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&${parentParams}&muted=true&autoplay=true`;
    }
    if (platform === "kick") {
      const channel = url.split("/").filter(Boolean).pop()?.replace(/^@/, "") || "";
      if (!channel) return null;
      return `https://player.kick.com/${encodeURIComponent(channel)}?muted=true&autoplay=true`;
    }
    if (platform === "youtube") {
      const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
      if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1`;
      const handle = url.split("/").filter(Boolean).pop()?.replace(/^@/, "") || "";
      if (handle) return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(handle)}&autoplay=1&mute=1`;
    }
    if (platform === "custom") {
      // Best-effort: try to load the URL itself (works for sites that allow framing).
      return url;
    }
    return null;
  })();

  return (
    <AppLayout showBottomNav={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/watch-parties")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{party.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {memberCount} watching
            </p>
          </div>
        </header>

        <div className="relative bg-black aspect-video w-full max-w-5xl mx-auto">
          {embedUrl ? (
            <>
              {!embedLoaded && (
                <Skeleton className="absolute inset-0 w-full h-full bg-muted/40" />
              )}
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={() => setEmbedLoaded(true)}
                title="Stream"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-white mb-3">Open the stream in a new tab to watch with the party</p>
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="gaming">Open Stream</Button>
              </a>
            </div>
          )}

          <AnimatePresence>
            {floating.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -200 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3, ease: "easeOut" }}
                className="absolute bottom-4 text-4xl pointer-events-none"
                style={{ left: `${f.x}%` }}
              >
                {f.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Send a reaction</p>
          <div className="flex gap-2 flex-wrap">
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                className="text-2xl p-2 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-90 transition-all"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {id && <WatchPartyComments partyId={id} />}
      </div>
    </AppLayout>
  );
};

export default WatchPartyRoom;
