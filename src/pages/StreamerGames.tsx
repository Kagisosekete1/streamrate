import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Gamepad2, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Status = "playing" | "completed" | "backlog" | "dropped";
interface Game {
  id: string;
  user_id: string;
  game_name: string;
  status: Status;
  platform: string | null;
  notes: string | null;
  cover_url: string | null;
  rating: number | null;
}

const STATUSES: { value: Status; label: string }[] = [
  { value: "playing", label: "Now Playing" },
  { value: "completed", label: "Completed" },
  { value: "backlog", label: "Backlog" },
  { value: "dropped", label: "Dropped" },
];

export default function StreamerGames() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const viewUserId = params.get("u") || user?.id || null;
  const isOwner = !!user && viewUserId === user.id;

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    game_name: "",
    status: "playing" as Status,
    platform: "",
    notes: "",
    cover_url: "",
    rating: "",
  });

  const load = async () => {
    if (!viewUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("streamer_games")
      .select("id, user_id, game_name, status, platform, notes, cover_url, rating")
      .eq("user_id", viewUserId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setGames((data as Game[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [viewUserId]);

  const handleAdd = async () => {
    if (!user || !form.game_name.trim()) return;
    const payload = {
      user_id: user.id,
      game_name: form.game_name.trim(),
      status: form.status,
      platform: form.platform || null,
      notes: form.notes || null,
      cover_url: form.cover_url || null,
      rating: form.rating ? Number(form.rating) : null,
    };
    const { error } = await supabase.from("streamer_games").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Game added");
    setOpen(false);
    setForm({ game_name: "", status: "playing", platform: "", notes: "", cover_url: "", rating: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("streamer_games").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setGames(g => g.filter(x => x.id !== id));
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("streamer_games").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setGames(gs => gs.map(g => g.id === id ? { ...g, status } : g));
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/profile")} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">{isOwner ? "My Games" : "Games"}</h1>
          </div>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Game</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Game name" value={form.game_name} onChange={e => setForm({ ...form, game_name: e.target.value })} />
                  <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Platform (PC, PS5, Xbox...)" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
                  <Input placeholder="Cover image URL (optional)" value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} />
                  <Input type="number" min={1} max={5} placeholder="Rating 1-5 (optional)" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
                  <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  <Button onClick={handleAdd} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <Tabs defaultValue="playing">
          <TabsList className="grid grid-cols-4 w-full">
            {STATUSES.map(s => <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>)}
          </TabsList>
          {STATUSES.map(s => (
            <TabsContent key={s.value} value={s.value} className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : games.filter(g => g.status === s.value).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No games here yet.</p>
              ) : games.filter(g => g.status === s.value).map(g => (
                <Card key={g.id} className="p-3 flex gap-3 items-start">
                  {g.cover_url ? (
                    <img src={g.cover_url} alt={g.game_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{g.game_name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {g.platform && <Badge variant="secondary" className="text-[10px]">{g.platform}</Badge>}
                          {g.rating && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />{g.rating}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {g.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{g.notes}</p>}
                    {isOwner && (
                      <Select value={g.status} onValueChange={(v: Status) => updateStatus(g.id, v)}>
                        <SelectTrigger className="h-7 text-xs mt-2 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(ss => <SelectItem key={ss.value} value={ss.value} className="text-xs">{ss.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}