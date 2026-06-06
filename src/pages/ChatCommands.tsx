import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Terminal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Cmd {
  id: string;
  user_id: string;
  trigger: string;
  response: string;
  cooldown_seconds: number;
  is_enabled: boolean;
  uses_count: number;
}

export default function ChatCommands() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const viewUserId = params.get("u") || user?.id || null;
  const isOwner = !!user && viewUserId === user.id;

  const [cmds, setCmds] = useState<Cmd[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ trigger: "", response: "", cooldown_seconds: 5 });

  const load = async () => {
    if (!viewUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_commands")
      .select("*")
      .eq("user_id", viewUserId)
      .order("trigger");
    if (error) toast.error(error.message);
    setCmds((data as Cmd[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [viewUserId]);

  const handleAdd = async () => {
    if (!user) return;
    const trig = form.trigger.trim().replace(/^!+/, "").toLowerCase();
    if (!trig || !form.response.trim()) { toast.error("Trigger & response required"); return; }
    const { error } = await supabase.from("chat_commands").insert({
      user_id: user.id,
      trigger: trig,
      response: form.response.trim(),
      cooldown_seconds: form.cooldown_seconds,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Command added");
    setOpen(false);
    setForm({ trigger: "", response: "", cooldown_seconds: 5 });
    load();
  };

  const toggleEnabled = async (c: Cmd) => {
    const { error } = await supabase.from("chat_commands").update({ is_enabled: !c.is_enabled }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    setCmds(cs => cs.map(x => x.id === c.id ? { ...x, is_enabled: !c.is_enabled } : x));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("chat_commands").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCmds(cs => cs.filter(x => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/profile" className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Chat Commands</h1>
          </div>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Chat Command</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">!</span>
                    <Input placeholder="schedule" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} />
                  </div>
                  <Textarea placeholder="My schedule is Mon/Wed/Fri 7pm — see /schedule" value={form.response} onChange={e => setForm({ ...form, response: e.target.value })} rows={3} />
                  <div>
                    <label className="text-xs text-muted-foreground">Cooldown (seconds)</label>
                    <Input type="number" min={0} value={form.cooldown_seconds} onChange={e => setForm({ ...form, cooldown_seconds: Number(e.target.value) })} />
                  </div>
                  <Button onClick={handleAdd} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cmds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No commands yet.</p>
        ) : cmds.map(c => (
          <Card key={c.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold">!{c.trigger}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{c.response}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">Cooldown {c.cooldown_seconds}s · Used {c.uses_count}×</p>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Switch checked={c.is_enabled} onCheckedChange={() => toggleEnabled(c)} />
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}