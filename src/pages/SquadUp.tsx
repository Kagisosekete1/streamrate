import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Plus, MapPin, Trophy, MessageCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const POPULAR_GAMES = ["Valorant", "Fortnite", "League of Legends", "CS2", "Apex Legends", "Overwatch 2", "Rocket League", "Call of Duty", "Minecraft", "Dota 2"];
const REGIONS = ["NA East", "NA West", "EU West", "EU East", "Asia", "Oceania", "South America"];
const PLAYSTYLES = ["Casual", "Competitive", "Ranked Grind", "Just for Fun", "Try Hard"];

interface SquadRequest {
  id: string;
  user_id: string;
  game: string;
  rank: string | null;
  region: string | null;
  playstyle: string | null;
  message: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

const SquadUp = () => {
  const { user } = useAuth();
  const { updateMissionProgress } = useGamification();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SquadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const [game, setGame] = useState(POPULAR_GAMES[0]);
  const [rank, setRank] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [playstyle, setPlaystyle] = useState(PLAYSTYLES[0]);
  const [message, setMessage] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    let q = supabase.from("squad_requests").select("*").eq("is_active", true).gte("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("game", filter);
    const { data } = await q;
    if (data) {
      const enriched = await Promise.all(data.map(async (r) => {
        const { data: p } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", r.user_id).maybeSingle();
        return { ...r, user_name: p?.username || p?.full_name || "Gamer", user_avatar: p?.avatar_url };
      }));
      setRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleConnect = async (request: SquadRequest) => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    // Notify the request poster (don't notify self)
    if (request.user_id !== user.id) {
      const { data: me } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle();
      const myName = me?.username || me?.full_name || "Someone";
      const { error } = await supabase.from("notifications").insert({
        user_id: request.user_id,
        from_user_id: user.id,
        title: "Squad Interest",
        message: `${myName} wants to squad up for ${request.game}`,
        type: "lfg_response",
      });
      if (!error) {
        toast.success(`${request.user_name || "Poster"} was notified you're interested!`);
      }
    }
    navigate(`/streamer/${request.user_id}`);
  };

  const createRequest = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    const { error } = await supabase.from("squad_requests").insert({
      user_id: user.id, game, rank: rank || null, region, playstyle, message: message || null,
    });
    if (error) { toast.error("Failed to post"); return; }
    updateMissionProgress("post_lfg");
    toast.success("Squad request posted!");
    setOpen(false);
    setMessage("");
    fetchRequests();
  };

  return (
    <AppLayout showBottomNav>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Squad Up</h1>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> LFG</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Looking for Squad</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Game</Label>
                    <Select value={game} onValueChange={setGame}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{POPULAR_GAMES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rank (optional)</Label>
                    <Input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Diamond, Gold 3..." />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Playstyle</Label>
                    <Select value={playstyle} onValueChange={setPlaystyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PLAYSTYLES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Looking for chill players, mic preferred..." rows={3} />
                  </div>
                  <Button onClick={createRequest} className="w-full">Post LFG</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>All</button>
            {POPULAR_GAMES.map((g) => (
              <button key={g} onClick={() => setFilter(g)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>{g}</button>
            ))}
          </div>
        </header>

        <main className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No squad requests yet</h3>
              <p className="text-sm text-muted-foreground">Post the first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={r.user_avatar || "/placeholder.svg"}
                      alt={r.user_name}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      onClick={() => navigate(`/streamer/${r.user_id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate cursor-pointer" onClick={() => navigate(`/streamer/${r.user_id}`)}>{r.user_name}</p>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center gap-1"><Gamepad2 className="w-3 h-3" />{r.game}</span>
                        {r.rank && <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-medium flex items-center gap-1"><Trophy className="w-3 h-3" />{r.rank}</span>}
                        {r.region && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium flex items-center gap-1"><MapPin className="w-3 h-3" />{r.region}</span>}
                        {r.playstyle && <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-[10px]">{r.playstyle}</span>}
                      </div>
                      {r.message && <p className="text-sm text-muted-foreground mt-2">{r.message}</p>}
                      <Button size="sm" variant="outline" className="mt-2 gap-1 h-7 text-xs" onClick={() => handleConnect(r)}>
                        <MessageCircle className="w-3 h-3" /> Connect
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
};

export default SquadUp;
