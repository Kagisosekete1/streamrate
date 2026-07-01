import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Swords, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Raid { id: string; from_user_id: string; to_user_id: string; raider_count: number; message: string | null; created_at: string; }
interface ProfileLite { id: string; username: string | null; avatar_url: string | null; }

export default function Raids() {
  const { user, userRole } = useAuth();
  const isStreamer = userRole === "streamer";
  const [sent, setSent] = useState<Raid[]>([]);
  const [received, setReceived] = useState<Raid[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [form, setForm] = useState({ to_user_id: "", raider_count: 5, message: "" });

  const load = async () => {
    if (!user) return;
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("stream_raids").select("*").eq("from_user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("stream_raids").select("*").eq("to_user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    const sentList = (s as Raid[]) || [];
    const recList = (r as Raid[]) || [];
    setSent(sentList);
    setReceived(recList);
    const ids = Array.from(new Set([...sentList.map(x => x.to_user_id), ...recList.map(x => x.from_user_id)]));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (ps as ProfileLite[] || []).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").ilike("username", `%${q}%`).limit(8);
      setResults((data as ProfileLite[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const sendRaid = async () => {
    if (!user || !form.to_user_id) { toast.error("Pick a streamer"); return; }
    const { error } = await supabase.from("stream_raids").insert({
      from_user_id: user.id,
      to_user_id: form.to_user_id,
      raider_count: Math.max(0, Number(form.raider_count) || 0),
      message: form.message || null,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({
      user_id: form.to_user_id,
      from_user_id: user.id,
      type: "raid_incoming",
      title: "🔥 Incoming raid!",
      message: `Sending ${form.raider_count} raiders your way${form.message ? " — " + form.message : ""}`,
    });
    toast.success("Raid sent!");
    setOpen(false);
    setForm({ to_user_id: "", raider_count: 5, message: "" });
    setSearch("");
    load();
  };

  const Row = ({ r, otherId }: { r: Raid; otherId: string }) => {
    const p = profiles[otherId];
    return (
      <Card className="p-3 flex items-center gap-3">
        <img src={p?.avatar_url || "/logo.png"} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">@{p?.username || "unknown"}</p>
          <p className="text-xs text-muted-foreground">{r.raider_count} raiders · {new Date(r.created_at).toLocaleString()}</p>
          {r.message && <p className="text-xs mt-1">{r.message}</p>}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/profile" className="p-2 -ml-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2 flex-1">
            <Swords className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Raids</h1>
          </div>
          {isStreamer ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Send className="w-4 h-4 mr-1" />Raid</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Send a Raid</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Search streamer..." value={search} onChange={e => setSearch(e.target.value)} />
                {results.length > 0 && (
                  <div className="border border-border rounded-lg max-h-40 overflow-auto">
                    {results.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, to_user_id: p.id }); setSearch("@" + (p.username || "")); setResults([]); }} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-secondary text-left">
                        <img src={p.avatar_url || "/logo.png"} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-sm">@{p.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Input type="number" min={0} placeholder="Raider count" value={form.raider_count} onChange={e => setForm({ ...form, raider_count: Number(e.target.value) })} />
                <Textarea placeholder="Message (optional)" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                <Button onClick={sendRaid} className="w-full">Send Raid</Button>
              </div>
            </DialogContent>
          </Dialog>
          ) : (
            <span className="text-[11px] text-muted-foreground">Streamers only</span>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-4">
        <Tabs defaultValue="received">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="mt-4 space-y-2">
            {received.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No raids yet.</p>
              : received.map(r => <Row key={r.id} r={r} otherId={r.from_user_id} />)}
          </TabsContent>
          <TabsContent value="sent" className="mt-4 space-y-2">
            {sent.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">You haven't sent any raids.</p>
              : sent.map(r => <Row key={r.id} r={r} otherId={r.to_user_id} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}