import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Plus, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Tournament {
  id: string;
  host_user_id: string;
  name: string;
  game: string | null;
  max_teams: number;
  prize: string | null;
  description: string | null;
  banner_url: string | null;
  starts_at: string | null;
  status: string;
}

export default function Tournaments() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const isStreamer = userRole === "streamer";
  const [list, setList] = useState<Tournament[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", game: "", max_teams: 8, prize: "", description: "", banner_url: "", starts_at: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(50);
    const tl = (data as Tournament[]) || [];
    setList(tl);
    if (tl.length) {
      const { data: teams } = await supabase.from("tournament_teams").select("tournament_id").in("tournament_id", tl.map(t => t.id));
      const c: Record<string, number> = {};
      (teams || []).forEach((t: any) => { c[t.tournament_id] = (c[t.tournament_id] || 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !form.name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("tournaments").insert({
      host_user_id: user.id,
      name: form.name.trim(),
      game: form.game || null,
      max_teams: form.max_teams,
      prize: form.prize || null,
      description: form.description || null,
      banner_url: form.banner_url || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tournament created");
    setOpen(false);
    setForm({ name: "", game: "", max_teams: 8, prize: "", description: "", banner_url: "", starts_at: "" });
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/home")} className="p-2 -ml-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Tournaments</h1>
          </div>
          {user && isStreamer ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Host</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Host Tournament</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Tournament name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <Input placeholder="Game" value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} />
                  <Select value={String(form.max_teams)} onValueChange={v => setForm({ ...form, max_teams: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[4, 8, 16, 32, 64].map(n => <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Prize (optional)" value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} />
                  <Input placeholder="Banner image URL (optional)" value={form.banner_url} onChange={e => setForm({ ...form, banner_url: e.target.value })} />
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  <Textarea placeholder="Description / rules" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  <Button onClick={create} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : user ? (
            <span className="text-[11px] text-muted-foreground">Streamers host · Fans register</span>
          ) : null}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : list.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No tournaments yet — host the first one.</p>
          : list.map(t => (
            <Link key={t.id} to={`/tournament/${t.id}`}>
              <Card className="p-3 hover:bg-secondary/50 transition-colors">
                <div className="flex gap-3">
                  {t.banner_url ? (
                    <img src={t.banner_url} alt={t.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold truncate">{t.name}</p>
                      <Badge variant={t.status === "registration" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.game || "—"}{t.prize ? ` · 🏆 ${t.prize}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />{counts[t.id] || 0}/{t.max_teams} teams
                      {t.starts_at && ` · ${new Date(t.starts_at).toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
      </main>
    </div>
  );
}