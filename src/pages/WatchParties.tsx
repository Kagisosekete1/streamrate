import { useEffect, useState } from "react";
import { useNavigate, useInRouterContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, Tv, Radio, Search, X, Flame, TrendingUp, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { validateStreamUrl, StreamPlatform } from "@/lib/streamLinks";

const SORT_STORAGE_KEY = "wp:sortMode";
const PAGE_SIZE = 8;

interface Party {
  id: string;
  host_id: string;
  title: string;
  platform: string;
  stream_url: string;
  streamer_channel: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
  host_name?: string;
  host_username?: string;
}

const WatchParties = () => {
  const { user } = useAuth();
  const { updateMissionProgress } = useGamification();
  const inRouter = useInRouterContext();
  // Guard: useNavigate throws (or returns null after HMR) if router context is missing.
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = inRouter ? useNavigate() : null;
  } catch {
    navigate = null;
  }
  const safeNavigate = (to: string) => {
    if (navigate) {
      navigate(to);
      return;
    }
    // Fallback: hard navigation keeps the app usable even if router context vanished.
    if (typeof window !== "undefined") window.location.assign(to);
  };

  if (!inRouter) {
    return (
      <AppLayout showBottomNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <Tv className="w-10 h-10 text-muted-foreground mb-3" />
          <h1 className="text-lg font-semibold mb-1">Watch Parties unavailable</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Navigation isn't ready right now. Please reload the page.
          </p>
          <Button onClick={() => typeof window !== "undefined" && window.location.reload()}>
            Reload
          </Button>
        </div>
      </AppLayout>
    );
  }
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("twitch");
  const [streamUrl, setStreamUrl] = useState("");
  const [search, setSearch] = useState("");
  const [endingId, setEndingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"trending" | "newest">(() => {
    if (typeof window === "undefined") return "trending";
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    return stored === "newest" ? "newest" : "trending";
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Persist sort across reloads / navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SORT_STORAGE_KEY, sortMode);
  }, [sortMode]);

  // Reset pagination when the filtered list changes shape
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, sortMode]);

  const fetchParties = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("watch_parties")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p) => {
          const { count } = await supabase
            .from("watch_party_members")
            .select("*", { count: "exact", head: true })
            .eq("party_id", p.id);
          const { data: host } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", p.host_id)
            .maybeSingle();
          return {
            ...p,
            member_count: count || 0,
            host_name: host?.username || host?.full_name || "Host",
            host_username: host?.username || "",
          };
        })
      );
      setParties(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const endParty = async (party: Party) => {
    if (!user || user.id !== party.host_id) return;
    if (!confirm(`End "${party.title}"? Members will no longer be able to join.`)) return;
    setEndingId(party.id);
    const { error } = await supabase
      .from("watch_parties")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", party.id)
      .eq("host_id", user.id);
    setEndingId(null);
    if (error) {
      toast.error("Couldn't end party");
      return;
    }
    toast.success("Party ended");
    setParties((prev) => prev.filter((p) => p.id !== party.id));
  };

  const filteredParties = (() => {
    const q = search.trim().toLowerCase();
    let list = parties;
    if (q) {
      list = parties.filter((p) => {
        const username = (p.host_username || "").toLowerCase();
        const name = (p.host_name || "").toLowerCase();
        const title = p.title.toLowerCase();
        // case-insensitive partial match on username/name/title + exact title match
        return (
          username.includes(q) ||
          name.includes(q) ||
          title.includes(q) ||
          title === q
        );
      });
    }
    // Always keep trending (highest member_count) at the top, then apply chosen sort
    const sorted = [...list].sort((a, b) => {
      if (sortMode === "trending") {
        const m = (b.member_count || 0) - (a.member_count || 0);
        if (m !== 0) return m;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // Newest mode: still pin the most-trending party (>=3 members) on top
      const aTrend = (a.member_count || 0) >= 3;
      const bTrend = (b.member_count || 0) >= 3;
      if (aTrend !== bTrend) return aTrend ? -1 : 1;
      if (aTrend && bTrend) {
        const m = (b.member_count || 0) - (a.member_count || 0);
        if (m !== 0) return m;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  })();

  const createParty = async () => {
    if (!user) {
      toast.error("Sign in to create a party");
      return;
    }
    if (!title.trim() || !streamUrl.trim()) {
      toast.error("Title and stream URL required");
      return;
    }
    const validated = validateStreamUrl(platform as StreamPlatform, streamUrl);
    if (validated.ok !== true) {
      const msg = validated.error;
      setUrlError(msg);
      toast.error(msg);
      return;
    }
    setUrlError(null);
    const { data, error } = await supabase
      .from("watch_parties")
      .insert({ host_id: user.id, title: title.trim(), platform, stream_url: validated.url })
      .select()
      .single();
    if (error || !data) {
      toast.error("Failed to create party");
      return;
    }
    await supabase.from("watch_party_members").insert({ party_id: data.id, user_id: user.id });
    updateMissionProgress("host_party");
    toast.success("Party created!");
    setOpen(false);
    setTitle("");
    setStreamUrl("");
    navigate(`/watch-party/${data.id}`);
  };

  return (
    <AppLayout showBottomNav>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Watch Parties</h1>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Host
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Host a Watch Party</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday Night Valorant" />
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twitch">Twitch</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="kick">Kick</SelectItem>
                        <SelectItem value="custom">Custom URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stream URL or Channel</Label>
                    <Input
                      value={streamUrl}
                      onChange={(e) => { setStreamUrl(e.target.value); if (urlError) setUrlError(null); }}
                      placeholder={platform === "custom" ? "https://your-stream-link.com" : "https://twitch.tv/channel"}
                      aria-invalid={!!urlError}
                    />
                    {urlError && (
                      <p className="text-xs text-destructive mt-1" role="alert">{urlError}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Accepts twitch.tv, kick.com, youtube.com — or any custom http(s) stream URL.
                    </p>
                  </div>
                  <Button onClick={createParty} className="w-full">Start Party</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <main className="px-4 py-4">
          {/* Sort controls */}
          <div className="flex items-center gap-2 mb-3" role="group" aria-label="Sort parties">
            <button
              onClick={() => setSortMode("trending")}
              aria-pressed={sortMode === "trending"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                sortMode === "trending"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Trending
            </button>
            <button
              onClick={() => setSortMode("newest")}
              aria-pressed={sortMode === "newest"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                sortMode === "newest"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Newest
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or party title..."
              className="pl-9 pr-9"
              aria-label="Search parties by username or title"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                    <Skeleton className="h-6 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Tv className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">{search ? "No matching parties" : "No active parties"}</h3>
              <p className="text-sm text-muted-foreground">{search ? "Try a different username" : "Be the first to host one!"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParties.slice(0, visibleCount).map((p, i) => {
                const isHost = user?.id === p.host_id;
                const isTrending = i === 0 && (p.member_count || 0) >= 3;
                const isClosed = p.is_active === false;
                return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-card rounded-xl p-4 border transition-colors ${
                    isClosed
                      ? "border-border/30 opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-primary/40 " +
                        (isTrending
                          ? "border-orange-500/40 bg-gradient-to-br from-orange-500/5 to-card"
                          : "border-border/50")
                  }`}
                  onClick={() => {
                    if (isClosed) {
                      toast.error("This party has ended");
                      return;
                    }
                    navigate(`/watch-party/${p.id}`);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isClosed ? (
                          <X className="w-4 h-4 text-muted-foreground" aria-label="Ended" />
                        ) : isTrending ? (
                          <Flame className="w-4 h-4 text-orange-500" aria-label="Trending" />
                        ) : (
                          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                        )}
                        <h3 className="font-semibold truncate">{p.title}</h3>
                        {isClosed && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Ended
                          </span>
                        )}
                        {!isClosed && isTrending && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500">
                            Trending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hosted by {p.host_name} · {p.platform}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {p.member_count}
                      </div>
                      {!isClosed && !isHost && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); navigate(`/watch-party/${p.id}`); }}
                          aria-label={`Join party ${p.title}`}
                        >
                          Join
                        </Button>
                      )}
                      {isClosed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); toast.error("This party has ended"); }}
                          aria-label={`Party ${p.title} has ended`}
                        >
                          Ended
                        </Button>
                      )}
                      {isHost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={endingId === p.id}
                          onClick={(e) => { e.stopPropagation(); endParty(p); }}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`End party ${p.title}`}
                        >
                          {endingId === p.id ? "Ending..." : "End"}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })}
              {visibleCount < filteredParties.length && (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {visibleCount} of {filteredParties.length}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    aria-label="Load more parties"
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
};

export default WatchParties;
