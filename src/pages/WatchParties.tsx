import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, Tv, Radio } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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
}

const WatchParties = () => {
  const { user } = useAuth();
  const { updateMissionProgress } = useGamification();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("twitch");
  const [streamUrl, setStreamUrl] = useState("");

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
          return { ...p, member_count: count || 0, host_name: host?.username || host?.full_name || "Host" };
        })
      );
      setParties(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const createParty = async () => {
    if (!user) {
      toast.error("Sign in to create a party");
      return;
    }
    if (!title.trim() || !streamUrl.trim()) {
      toast.error("Title and stream URL required");
      return;
    }
    const { data, error } = await supabase
      .from("watch_parties")
      .insert({ host_id: user.id, title: title.trim(), platform, stream_url: streamUrl.trim() })
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stream URL or Channel</Label>
                    <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://twitch.tv/channel" />
                  </div>
                  <Button onClick={createParty} className="w-full">Start Party</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <main className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}</div>
          ) : parties.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Tv className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No active parties</h3>
              <p className="text-sm text-muted-foreground">Be the first to host one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parties.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl p-4 border border-border/50 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/watch-party/${p.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                        <h3 className="font-semibold truncate">{p.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hosted by {p.host_name} · {p.platform}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {p.member_count}
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

export default WatchParties;
