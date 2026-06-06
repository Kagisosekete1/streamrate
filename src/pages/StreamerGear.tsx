import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Wrench, ExternalLink } from "lucide-react";
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

interface Gear {
  id: string;
  user_id: string;
  category: string;
  item_name: string;
  brand: string | null;
  notes: string | null;
  affiliate_url: string | null;
  image_url: string | null;
}

const CATEGORIES = ["PC", "Console", "Monitor", "Mouse", "Keyboard", "Headset", "Mic", "Webcam", "Chair", "Capture Card", "Other"];

export default function StreamerGear() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const viewUserId = params.get("u") || user?.id || null;
  const isOwner = !!user && viewUserId === user.id;

  const [gear, setGear] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "PC", item_name: "", brand: "", notes: "", affiliate_url: "", image_url: "" });

  const load = async () => {
    if (!viewUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("streamer_gear")
      .select("*")
      .eq("user_id", viewUserId)
      .order("category");
    if (error) toast.error(error.message);
    setGear((data as Gear[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [viewUserId]);

  const handleAdd = async () => {
    if (!user || !form.item_name.trim()) return;
    const { error } = await supabase.from("streamer_gear").insert({
      user_id: user.id,
      category: form.category,
      item_name: form.item_name.trim(),
      brand: form.brand || null,
      notes: form.notes || null,
      affiliate_url: form.affiliate_url || null,
      image_url: form.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Gear added");
    setOpen(false);
    setForm({ category: "PC", item_name: "", brand: "", notes: "", affiliate_url: "", image_url: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("streamer_gear").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setGear(g => g.filter(x => x.id !== id));
  };

  const grouped = gear.reduce<Record<string, Gear[]>>((acc, g) => {
    (acc[g.category] ||= []).push(g);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/profile" className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Wrench className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">{isOwner ? "My Setup" : "Setup & Gear"}</h1>
          </div>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Gear</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Item name" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
                  <Input placeholder="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
                  <Input placeholder="Image URL (optional)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                  <Input placeholder="Affiliate / buy link" value={form.affiliate_url} onChange={e => setForm({ ...form, affiliate_url: e.target.value })} />
                  <Textarea placeholder="Notes (sensitivity, keybinds, why you like it...)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  <Button onClick={handleAdd} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : gear.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No gear listed yet.</p>
        ) : Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h2>
            <div className="space-y-2">
              {items.map(g => (
                <Card key={g.id} className="p-3 flex gap-3">
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.item_name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{g.item_name}</p>
                        {g.brand && <Badge variant="secondary" className="text-[10px] mt-0.5">{g.brand}</Badge>}
                      </div>
                      {isOwner && (
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {g.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{g.notes}</p>}
                    {g.affiliate_url && (
                      <a href={g.affiliate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1.5 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Buy
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}