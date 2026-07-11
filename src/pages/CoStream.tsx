import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Check, X, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Req {
  id: string;
  from_user_id: string;
  to_user_id: string;
  scheduled_at: string | null;
  game: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface ProfileLite { id: string; username: string | null; avatar_url: string | null; }

export default function CoStream() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const isStreamer = userRole === "streamer";
  const [reqs, setReqs] = useState<Req[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [form, setForm] = useState({ to_user_id: "", game: "", scheduled_at: "", message: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("co_stream_requests")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const list = (data as Req[]) || [];
    setReqs(list);
    const ids = Array.from(new Set(list.flatMap(r => [r.from_user_id, r.to_user_id])));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (ps as ProfileLite[] || []).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${q}%`)
        .limit(8);
      setResults((data as ProfileLite[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async () => {
    if (!user || !form.to_user_id) { toast.error("Pick a streamer"); return; }
    const { error } = await supabase.from("co_stream_requests").insert({
      from_user_id: user.id,
      to_user_id: form.to_user_id,
      game: form.game || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      message: form.message || null,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({
      user_id: form.to_user_id,
      from_user_id: user.id,
      type: "co_stream_request",
      title: "Co-stream request",
      message: `Wants to co-stream${form.game ? " " + form.game : ""}`,
    });
    toast.success("Request sent");
    setOpen(false);
    setForm({ to_user_id: "", game: "", scheduled_at: "", message: "" });
    setSearch("");
    load();
  };

  const respond = async (r: Req, status: "accepted" | "declined") => {
    const { error } = await supabase.from("co_stream_requests").update({ status }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({
      user_id: r.from_user_id,
      from_user_id: user!.id,
      type: "co_stream_response",
      title: status === "accepted" ? "Co-stream accepted" : "Co-stream declined",
      message: status === "accepted" ? "Your co-stream request was accepted" : "Your co-stream request was declined",
    });
    load();
  };

  const incoming = reqs.filter(r => r.to_user_id === user?.id);
  const outgoing = reqs.filter(r => r.from_user_id === user?.id);

  const RowCard = ({ r, mine }: { r: Req; mine: boolean }) => {
    const otherId = mine ? r.to_user_id : r.from_user_id;
    const p = profiles[otherId];
    return (
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <img src={p?.avatar_url || "/logo.png"} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">@{p?.username || "unknown"}</p>
            <p className="text-xs text-muted-foreground">
              {r.game || "Co-stream"}{r.scheduled_at ? ` · ${new Date(r.scheduled_at).toLocaleString()}` : ""}
            </p>
          </div>
          <Badge variant={r.status === "accepted" ? "default" : r.status === "declined" ? "destructive" : "secondary"}>
            {r.status}
          </Badge>
        </div>
        {r.message && <p className="text-sm text-muted-foreground mt-2">{r.message}</p>}
        {!mine && r.status === "pending" && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => respond(r, "accepted")}><Check className="w-4 h-4 mr-1" />Accept</Button>
            <Button size="sm" variant="outline" onClick={() => respond(r, "declined")}><X className="w-4 h-4 mr-1" />Decline</Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/profile")} className="p-2 -ml-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Co-Stream</h1>
          </div>
          {isStreamer ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Send className="w-4 h-4 mr-1" />Send</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Co-Stream</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Search streamer by username..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <Input placeholder="Game (optional)" value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} />
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                <Textarea placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                <Button onClick={sendRequest} className="w-full">Send Request</Button>
              </div>
            </DialogContent>
          </Dialog>
          ) : (
            <span className="text-[11px] text-muted-foreground">Streamers only</span>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-4">
        <Tabs defaultValue="incoming">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
            <TabsTrigger value="outgoing">Sent ({outgoing.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="mt-4 space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : incoming.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No incoming requests.</p>
              : incoming.map(r => <RowCard key={r.id} r={r} mine={false} />)}
          </TabsContent>
          <TabsContent value="outgoing" className="mt-4 space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : outgoing.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No sent requests.</p>
              : outgoing.map(r => <RowCard key={r.id} r={r} mine={true} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}