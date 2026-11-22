import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Users, Play } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { normalizeStreamUrl, validateStreamUrl, StreamPlatform } from "@/lib/streamLinks";
import { WatchPartyComments } from "@/components/WatchPartyComments";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { NativeReelPlayer } from "@/plugins/NativeReelPlayer";

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
  const [playRequested, setPlayRequested] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      setPlayRequested(false);
      setPlayerError(null);

      // A transient Realtime Presence session is the source of viewer counts;
      // stored membership rows can outlive disconnected devices and must not be counted.
      const channel = supabase
        .channel(`watch-party-presence-${id}`, {
          config: { presence: { key: `${user?.id || "guest"}-${crypto.randomUUID()}` } },
        })
        .on("presence", { event: "sync" }, () => {
          const viewers = Object.values(channel.presenceState()).reduce((total, entries) => total + entries.length, 0);
          setMemberCount(viewers);
        })
        .on("presence", { event: "join" }, () => {
          const viewers = Object.values(channel.presenceState()).reduce((total, entries) => total + entries.length, 0);
          setMemberCount(viewers);
        })
        .on("presence", { event: "leave" }, () => {
          const viewers = Object.values(channel.presenceState()).reduce((total, entries) => total + entries.length, 0);
          setMemberCount(viewers);
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "watch_party_reactions", filter: `party_id=eq.${id}` },
          (payload) => {
            const r = payload.new as Reaction;
            const fl = { id: r.id, emoji: r.emoji, x: Math.random() * 80 + 10 };
            setFloating((prev) => prev.some((item) => item.id === fl.id) ? prev : [...prev, fl]);
            setTimeout(() => setFloating((prev) => prev.filter((p) => p.id !== fl.id)), 3000);
          })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel.track({ user_id: user?.id ?? null, joined_at: new Date().toISOString() });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void load().then((dispose) => {
      if (cancelled) dispose?.();
      else cleanup = dispose;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [id, user, navigate]);

  const sendReaction = async (emoji: string) => {
    if (!user || !id) {
      toast.error("Sign in to react");
      return;
    }
    const { data, error } = await supabase
      .from("watch_party_reactions")
      .insert({ party_id: id, user_id: user.id, emoji })
      .select("id")
      .single();
    if (error) {
      console.error("Couldn't send watch party reaction", error);
      toast.error(error.message || "Couldn't send reaction");
      return;
    }
    if (data) {
      const fl = { id: data.id, emoji, x: Math.random() * 80 + 10 };
      setFloating((prev) => prev.some((item) => item.id === fl.id) ? prev : [...prev, fl]);
      setTimeout(() => setFloating((prev) => prev.filter((item) => item.id !== fl.id)), 3000);
    }
  };

  const platform = (party?.platform || "custom") as StreamPlatform;
  const rawStreamUrl = party?.stream_url || "";
  const validated = validateStreamUrl(platform, rawStreamUrl);
  const canonicalUrl = validated.ok ? validated.url : normalizeStreamUrl(platform, rawStreamUrl) || rawStreamUrl;
  const externalUrl = canonicalUrl;
  const isDirectMedia = platform === "custom" && /\.(mp4|m4v|webm|m3u8)(?:[?#]|$)/i.test(canonicalUrl);
  const isNativeAndroid = Capacitor.getPlatform() === "android";

  useEffect(() => {
    if (!party || !isDirectMedia || !playRequested || !isNativeAndroid) return;
    const positionPlayer = () => {
      const rect = playerContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      void NativeReelPlayer.setBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    let playbackListener: { remove: () => Promise<void> } | undefined;
    let disposed = false;
    void NativeReelPlayer.addListener("playbackState", (state) => {
      if (state.state === "error") {
        setPlayerError(state.message || "This direct stream could not be played.");
      }
    }).then((listener) => {
      if (disposed) void listener.remove();
      else playbackListener = listener;
    });
    positionPlayer();
    void NativeReelPlayer.show({ url: canonicalUrl }).catch((error) => {
      console.error("Watch party Media3 playback failed", error);
      setPlayerError("This direct stream could not be played. Check that the link is a public MP4, WebM, or HLS stream.");
    });
    window.addEventListener("resize", positionPlayer);
    window.addEventListener("scroll", positionPlayer, true);
    return () => {
      disposed = true;
      window.removeEventListener("resize", positionPlayer);
      window.removeEventListener("scroll", positionPlayer, true);
      void playbackListener?.remove();
      void NativeReelPlayer.hide();
    };
  }, [canonicalUrl, isDirectMedia, isNativeAndroid, party, playRequested]);

  useEffect(() => {
    if (!party || !isDirectMedia || !playRequested || isNativeAndroid) return;
    void videoRef.current?.play().catch(() => setPlayerError("Tap play in the video controls to begin."));
    return () => videoRef.current?.pause();
  }, [canonicalUrl, isDirectMedia, isNativeAndroid, party, playRequested]);

  const openOfficialPlayer = async () => {
    try {
      await Browser.open({ url: externalUrl });
    } catch {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!party) return null;

  return (
    <AppLayout showBottomNav={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/watch-parties")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{party.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {memberCount} watching
            </p>
          </div>
        </header>

        <div ref={playerContainerRef} className="relative bg-black aspect-video w-full max-w-5xl mx-auto overflow-hidden">
          {isDirectMedia && playRequested && !isNativeAndroid && (
            <video ref={videoRef} src={canonicalUrl} controls playsInline className="absolute inset-0 h-full w-full bg-black object-contain" />
          )}
          {(!isDirectMedia || !playRequested) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black text-center p-6">
              <div className="text-sm font-medium text-white/75">
                {isDirectMedia
                  ? isNativeAndroid ? "Direct stream · Android Media3 player" : "Direct video stream"
                  : `${platform === "custom" ? "Stream" : `${platform[0].toUpperCase()}${platform.slice(1)}`} opens in its official player`}
              </div>
              {playerError && <p className="max-w-md text-sm text-red-300">{playerError}</p>}
              {isDirectMedia ? (
                <Button variant="gaming" className="min-w-44 gap-2" onClick={() => { setPlayerError(null); setPlayRequested(true); }}>
                  <Play className="w-4 h-4 fill-current" />
                  Start watching
                </Button>
              ) : (
                <Button variant="gaming" className="min-w-44 gap-2" onClick={openOfficialPlayer}>
                  <Play className="w-4 h-4 fill-current" />
                  Open official player
                </Button>
              )}
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
