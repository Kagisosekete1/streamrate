import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scissors, ExternalLink, Trash2, Plus, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Clip {
  id: string;
  clipper_id: string;
  source_streamer_id: string | null;
  source_streamer_name: string | null;
  platform: string;
  stream_url: string;
  title: string | null;
  created_at: string;
  chapter_title?: string | null;
  timestamp_seconds?: number | null;
  game?: string | null;
  clipper_name?: string;
  clipper_avatar?: string;
}

const parseTs = (s: string): number | null => {
  if (!s.trim()) return null;
  const parts = s.split(":").map(x => Number(x.trim()));
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
};
const fmtTs = (n: number | null | undefined): string => {
  if (n == null) return "";
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

const Clips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", chapter_title: "", timestamp: "", platform: "twitch", stream_url: "", source_streamer_name: "", game: "" });

  const createClip = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    if (!form.stream_url.trim() || !form.chapter_title.trim()) { toast.error("Chapter title and stream URL required"); return; }
    const ts = parseTs(form.timestamp);
    setSaving(true);
    const { data, error } = await supabase.from("stream_clips").insert({
      clipper_id: user.id,
      platform: form.platform,
      stream_url: form.stream_url.trim(),
      title: form.title.trim() || form.chapter_title.trim(),
      chapter_title: form.chapter_title.trim(),
      timestamp_seconds: ts,
      game: form.game.trim() || null,
      source_streamer_name: form.source_streamer_name.trim() || null,
    }).select("*").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Highlight saved");
    setOpen(false);
    setForm({ title: "", chapter_title: "", timestamp: "", platform: "twitch", stream_url: "", source_streamer_name: "", game: "" });
    if (data) setClips(prev => [{ ...(data as Clip), clipper_name: "You" }, ...prev]);
  };

  const deleteClip = async (clipId: string) => {
    if (!user) return;
    if (!confirm("Delete this clip?")) return;
    setDeletingId(clipId);
    const { error } = await supabase.from("stream_clips").delete().eq("id", clipId).eq("clipper_id", user.id);
    setDeletingId(null);
    if (error) {
      toast.error("Couldn't delete clip");
      return;
    }
    setClips((prev) => prev.filter((clip) => clip.id !== clipId));
    toast.success("Clip deleted");
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("stream_clips").select("*").order("created_at", { ascending: false }).limit(50);
      if (data) {
        const enriched = await Promise.all(data.map(async (c) => {
          const { data: p } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", c.clipper_id).maybeSingle();
          return { ...c, clipper_name: p?.username || p?.full_name || "User", clipper_avatar: p?.avatar_url };
        }));
        setClips(enriched);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AppLayout showBottomNav>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background border-b border-border/50 px-4 py-4 flex items-center gap-2 transform-gpu">
          <Scissors className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold flex-1">Stream Clips</h1>
          {user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create highlight</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Chapter title (e.g. 'Insane 1v5 clutch')" value={form.chapter_title} onChange={e => setForm({ ...form, chapter_title: e.target.value })} />
                  <Input placeholder="Timestamp (e.g. 12:34 or 1:12:34)" value={form.timestamp} onChange={e => setForm({ ...form, timestamp: e.target.value })} />
                  <Input placeholder="Stream URL (VOD, clip, or livestream)" value={form.stream_url} onChange={e => setForm({ ...form, stream_url: e.target.value })} />
                  <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["twitch", "youtube", "kick", "tiktok", "other"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Source streamer (optional)" value={form.source_streamer_name} onChange={e => setForm({ ...form, source_streamer_name: e.target.value })} />
                  <Input placeholder="Game (optional)" value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} />
                  <Input placeholder="Extra description (optional)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  <Button className="w-full" disabled={saving} onClick={createClip}>{saving ? "Saving…" : "Save highlight"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </header>
        <main className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}</div>
          ) : clips.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Scissors className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No clips yet</h3>
              <p className="text-sm text-muted-foreground">Tap "Clip It!" on live streams to save moments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clips.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-start gap-3">
                    <img src={c.clipper_avatar || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover cursor-pointer" onClick={() => navigate(`/streamer/${c.clipper_id}`)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold cursor-pointer" onClick={() => navigate(`/streamer/${c.clipper_id}`)}>{c.clipper_name}</span>
                        {" clipped from "}
                        {c.source_streamer_id ? (
                          <span className="font-semibold cursor-pointer text-primary" onClick={() => navigate(`/streamer/${c.source_streamer_id}`)}>{c.source_streamer_name}</span>
                        ) : (
                          <span className="font-semibold">{c.source_streamer_name || "a stream"}</span>
                        )}
                      </p>
                      {c.title && <p className="text-xs text-muted-foreground mt-1">{c.title}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary capitalize">{c.platform}</span>
                        <div className="flex items-center gap-2">
                          {user?.id === c.clipper_id && (
                            <Button size="sm" variant="ghost" disabled={deletingId === c.id} onClick={() => deleteClip(c.id)} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" /> {deletingId === c.id ? "Deleting" : "Delete"}
                            </Button>
                          )}
                          <a href={c.stream_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Watch
                          </a>
                        </div>
                      </div>
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

export default Clips;
