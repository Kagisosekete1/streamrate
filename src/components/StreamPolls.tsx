import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Plus, Coins, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Poll {
  id: string;
  streamer_id: string;
  question: string;
  options: string[];
  status: string;
  winning_option_index: number | null;
  total_coins_pool: number;
  created_at: string;
}

interface Vote {
  option_index: number;
  coins_spent: number;
}

interface Props {
  streamerId: string;
}

export const StreamPolls = ({ streamerId }: Props) => {
  const { user } = useAuth();
  const { updateMissionProgress } = useGamification();
  const isOwner = user?.id === streamerId;
  const [polls, setPolls] = useState<Poll[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<number, number>>>({});
  const [userVotes, setUserVotes] = useState<Record<string, Vote>>({});
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");

  const fetchData = async () => {
    const { data } = await supabase
      .from("stream_polls")
      .select("*")
      .eq("streamer_id", streamerId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) {
      const polls = data.map((p) => ({ ...p, options: Array.isArray(p.options) ? p.options as string[] : [] }));
      setPolls(polls);

      // Fetch votes for each poll
      for (const p of polls) {
        const { data: votes } = await supabase.from("poll_votes").select("option_index, coins_spent, user_id").eq("poll_id", p.id);
        if (votes) {
          const counts: Record<number, number> = {};
          votes.forEach((v) => { counts[v.option_index] = (counts[v.option_index] || 0) + v.coins_spent; });
          setVoteCounts((prev) => ({ ...prev, [p.id]: counts }));
          if (user) {
            const my = votes.find((v) => v.user_id === user.id);
            if (my) setUserVotes((prev) => ({ ...prev, [p.id]: { option_index: my.option_index, coins_spent: my.coins_spent } }));
          }
        }
      }
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`polls-${streamerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_polls", filter: `streamer_id=eq.${streamerId}` }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamerId, user?.id]);

  const createPoll = async () => {
    if (!user) return;
    const opts = [opt1, opt2, opt3].filter((o) => o.trim()).map((o) => o.trim());
    if (!question.trim() || opts.length < 2) {
      toast.error("Question and at least 2 options required");
      return;
    }
    const { error } = await supabase.from("stream_polls").insert({
      streamer_id: user.id, question: question.trim(), options: opts, status: "active",
    });
    if (error) { toast.error("Failed to create poll"); return; }
    toast.success("Poll created!");
    setOpen(false);
    setQuestion(""); setOpt1(""); setOpt2(""); setOpt3("");
  };

  const vote = async (pollId: string, optionIndex: number, coins: number) => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (userVotes[pollId]) { toast.error("Already voted"); return; }

    // Check coin balance
    const { data: coinData } = await supabase.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle();
    const balance = coinData?.balance || 0;
    if (balance < coins) { toast.error(`Need ${coins} coins (you have ${balance})`); return; }

    const { error } = await supabase.from("poll_votes").insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex, coins_spent: coins });
    if (error) { toast.error("Failed to vote"); return; }

    // Deduct coins
    await supabase.from("user_coins").update({ balance: balance - coins }).eq("user_id", user.id);
    await supabase.from("coin_transactions").insert({ user_id: user.id, amount: -coins, type: "spend", description: `Poll vote` });

    // Update pool
    const poll = polls.find((p) => p.id === pollId);
    if (poll) await supabase.from("stream_polls").update({ total_coins_pool: poll.total_coins_pool + coins }).eq("id", pollId);

    updateMissionProgress("vote_poll");
    toast.success(`Voted with ${coins} coins!`);
  };

  const closePoll = async (pollId: string, winnerIndex: number) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;
    await supabase.from("stream_polls").update({ status: "closed", winning_option_index: winnerIndex, closed_at: new Date().toISOString() }).eq("id", pollId);

    // Reward winners
    const { data: winners } = await supabase.from("poll_votes").select("user_id, coins_spent").eq("poll_id", pollId).eq("option_index", winnerIndex);
    if (winners) {
      for (const w of winners) {
        const reward = Math.floor(w.coins_spent * 1.5);
        const { data: bal } = await supabase.from("user_coins").select("balance").eq("user_id", w.user_id).maybeSingle();
        await supabase.from("user_coins").update({ balance: (bal?.balance || 0) + reward }).eq("user_id", w.user_id);
        await supabase.from("coin_transactions").insert({ user_id: w.user_id, amount: reward, type: "earn", description: "Poll winner!" });
      }
    }
    toast.success("Poll closed, winners rewarded!");
  };

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status === "closed").slice(0, 2);

  if (!isOwner && polls.length === 0) return null;

  return (
    <section className="px-4 py-4">
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Live Polls & Predictions
          </h2>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3 h-3" /> New Poll</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Question</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Will I win this round?" /></div>
                  <div><Label>Option 1</Label><Input value={opt1} onChange={(e) => setOpt1(e.target.value)} placeholder="Yes" /></div>
                  <div><Label>Option 2</Label><Input value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="No" /></div>
                  <div><Label>Option 3 (optional)</Label><Input value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="Maybe" /></div>
                  <Button onClick={createPoll} className="w-full">Launch Poll</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="px-4 pb-4 space-y-3">
          {activePolls.length === 0 && closedPolls.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No polls yet</p>
          )}

          <AnimatePresence>
            {activePolls.map((poll) => {
              const counts = voteCounts[poll.id] || {};
              const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
              const myVote = userVotes[poll.id];
              return (
                <motion.div key={poll.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-secondary/40 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold flex-1">{poll.question}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse">LIVE</span>
                  </div>
                  <div className="space-y-2">
                    {poll.options.map((opt, i) => {
                      const pct = Math.round((counts[i] || 0) / total * 100);
                      const isMine = myVote?.option_index === i;
                      return (
                        <div key={i} className="relative">
                          <button
                            disabled={!!myVote || !user}
                            onClick={() => vote(poll.id, i, 5)}
                            className={`relative w-full text-left p-2 rounded-md border transition-all overflow-hidden ${isMine ? "border-primary" : "border-border hover:border-primary/40"} ${myVote && !isMine ? "opacity-60" : ""}`}
                          >
                            <div className="absolute inset-0 bg-primary/15" style={{ width: `${pct}%`, transition: "width 0.4s" }} />
                            <div className="relative flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{opt}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Coins className="w-3 h-3" />{counts[i] || 0} · {pct}%
                              </span>
                            </div>
                          </button>
                          {isOwner && (
                            <Button size="sm" variant="ghost" className="absolute -right-1 -top-1 h-6 w-6 p-0" onClick={() => closePoll(poll.id, i)} title="Mark as winner">
                              <Trophy className="w-3 h-3 text-yellow-500" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!myVote && user && !isOwner && (
                    <p className="text-[10px] text-muted-foreground mt-2">Vote costs 5 coins · Winners get 1.5x back</p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {closedPolls.map((poll) => {
            const counts = voteCounts[poll.id] || {};
            const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
            return (
              <div key={poll.id} className="bg-secondary/20 rounded-lg p-3 opacity-80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold flex-1">{poll.question}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">CLOSED</span>
                </div>
                <div className="space-y-1">
                  {poll.options.map((opt, i) => {
                    const pct = Math.round((counts[i] || 0) / total * 100);
                    const isWinner = poll.winning_option_index === i;
                    return (
                      <div key={i} className={`text-xs flex items-center justify-between p-1.5 rounded ${isWinner ? "bg-yellow-500/20 text-yellow-500 font-semibold" : "text-muted-foreground"}`}>
                        <span>{isWinner && "🏆 "}{opt}</span>
                        <span>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
