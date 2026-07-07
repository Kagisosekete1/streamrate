import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Play, Crown, Lock, ShieldCheck, History, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateSingleElimination } from "@/lib/bracket";

interface Tournament { id: string; host_user_id: string; name: string; game: string | null; max_teams: number; prize: string | null; description: string | null; banner_url: string | null; starts_at: string | null; status: string; }
interface Team { id: string; tournament_id: string; captain_user_id: string; team_name: string; seed: number | null; status: string; }
interface Match { id: string; tournament_id: string; round: number; position: number; team_a_id: string | null; team_b_id: string | null; winner_team_id: string | null; score_a: number | null; score_b: number | null; status: string; locked?: boolean; confirmed_at?: string | null; confirmed_by?: string | null; }
interface AuditRow { id: string; match_id: string; action: string; actor_user_id: string | null; old_winner_team_id: string | null; new_winner_team_id: string | null; note: string | null; created_at: string; }
interface ActorProfile { id: string; username: string | null; full_name: string | null; }

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditOpen, setAuditOpen] = useState<string | null>(null);
  const [actors, setActors] = useState<Record<string, ActorProfile>>({});
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActor, setAuditActor] = useState<string>("all");
  const [auditAction, setAuditAction] = useState<string>("all");
  const [auditFrom, setAuditFrom] = useState<string>("");
  const [auditTo, setAuditTo] = useState<string>("");

  const load = async () => {
    if (!id) return;
    const [{ data: tt }, { data: ts }, { data: ms }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
      supabase.from("tournament_teams").select("*").eq("tournament_id", id).order("seed", { nullsFirst: false }),
      supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round").order("position"),
    ]);
    setT((tt as Tournament) || null);
    setTeams((ts as Team[]) || []);
    setMatches((ms as Match[]) || []);
    const { data: aud } = await supabase.from("tournament_match_audit").select("*").eq("tournament_id", id).order("created_at", { ascending: false }).limit(200);
    setAudit((aud as AuditRow[]) || []);
    const actorIds = [...new Set(((aud as AuditRow[]) || []).map(a => a.actor_user_id).filter(Boolean))] as string[];
    if (actorIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username, full_name").in("id", actorIds);
      setActors(Object.fromEntries(((profs as ActorProfile[]) || []).map(p => [p.id, p])));
    } else {
      setActors({});
    }
  };
  useEffect(() => { load(); }, [id]);

  const isHost = !!user && !!t && t.host_user_id === user.id;
  const myTeam = teams.find(x => x.captain_user_id === user?.id);

  const register = async () => {
    if (!user || !t || !teamName.trim()) return;
    const { error } = await supabase.from("tournament_teams").insert({
      tournament_id: t.id,
      captain_user_id: user.id,
      team_name: teamName.trim(),
      seed: teams.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Registered");
    setOpen(false);
    setTeamName("");
    load();
  };

  const withdraw = async () => {
    if (!myTeam) return;
    const { error } = await supabase.from("tournament_teams").delete().eq("id", myTeam.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const startBracket = async () => {
    if (!t || !isHost) return;
    if (teams.length < 2) { toast.error("Need at least 2 teams"); return; }
    const pending = generateSingleElimination(teams.map(x => ({ id: x.id, team_name: x.team_name })));
    const rows = pending.map(p => ({ tournament_id: t.id, ...p }));
    const { error: e1 } = await supabase.from("tournament_matches").insert(rows);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", t.id);
    toast.success("Bracket started");
    load();
  };

  const pickWinner = async (m: Match, winner: "a" | "b") => {
    if (!isHost || m.locked) return;
    const winnerId = winner === "a" ? m.team_a_id : m.team_b_id;
    if (!winnerId) return;
    const { error } = await supabase.from("tournament_matches").update({ winner_team_id: winnerId, status: "completed" }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("tournament_match_audit").insert({
      match_id: m.id, tournament_id: m.tournament_id, actor_user_id: user!.id,
      action: "winner_selected", old_winner_team_id: m.winner_team_id, new_winner_team_id: winnerId,
      note: "Pending confirmation",
    });
    toast.success("Winner selected — confirm to lock");
    load();
  };

  const confirmResult = async (m: Match) => {
    if (!isHost || !m.winner_team_id || m.locked) return;
    if (!confirm(`Lock ${teamMap[m.winner_team_id]} as the winner? This can't be changed.`)) return;
    const { error } = await supabase.from("tournament_matches")
      .update({ locked: true, confirmed_at: new Date().toISOString(), confirmed_by: user!.id })
      .eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("tournament_match_audit").insert({
      match_id: m.id, tournament_id: m.tournament_id, actor_user_id: user!.id,
      action: "result_confirmed", new_winner_team_id: m.winner_team_id, note: "Locked — bracket advanced",
    });
    // Now propagate to next round
    const nextRound = m.round + 1;
    const nextPos = Math.ceil(m.position / 2);
    const next = matches.find(x => x.round === nextRound && x.position === nextPos);
    if (next) {
      const slot = m.position % 2 === 1 ? "team_a_id" : "team_b_id";
      await supabase.from("tournament_matches").update({ [slot]: m.winner_team_id }).eq("id", next.id);
    } else {
      await supabase.from("tournaments").update({ status: "completed" }).eq("id", m.tournament_id);
    }
    toast.success("Result confirmed and locked");
    load();
  };

  if (!t) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading tournament…</div>;

  const teamMap: Record<string, string> = Object.fromEntries(teams.map(x => [x.id, x.team_name]));
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
  const isFull = teams.length >= t.max_teams;

  const actorLabel = (uid: string | null) => uid ? (actors[uid]?.username || actors[uid]?.full_name || uid.slice(0, 6)) : "system";
  const uniqueActions = Array.from(new Set(audit.map(a => a.action)));
  const uniqueActors = Array.from(new Set(audit.map(a => a.actor_user_id).filter(Boolean))) as string[];

  const filteredAudit = audit.filter(a => {
    if (auditActor !== "all" && a.actor_user_id !== auditActor) return false;
    if (auditAction !== "all" && a.action !== auditAction) return false;
    if (auditFrom && new Date(a.created_at) < new Date(auditFrom)) return false;
    if (auditTo && new Date(a.created_at) > new Date(auditTo)) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const hay = [a.action, a.note || "", actorLabel(a.actor_user_id), teamMap[a.new_winner_team_id || ""] || "", teamMap[a.old_winner_team_id || ""] || ""].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/tournaments" className="p-2 -ml-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></Link>
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg truncate flex-1">{t.name}</h1>
          <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {t.banner_url && <img src={t.banner_url} alt="" className="w-full h-40 object-cover rounded-xl" />}
        <div className="text-sm text-muted-foreground space-y-1">
          {t.game && <p>🎮 {t.game}</p>}
          {t.prize && <p>🏆 {t.prize}</p>}
          {t.starts_at && <p>📅 {new Date(t.starts_at).toLocaleString()}</p>}
          {t.description && <p className="whitespace-pre-wrap">{t.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {t.status === "registration" && user && !myTeam && !isFull && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Users className="w-4 h-4 mr-1" />Register Team</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Register Team</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
                  <Button onClick={register} className="w-full">Register</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {myTeam && t.status === "registration" && (
            <Button size="sm" variant="outline" onClick={withdraw}>Withdraw "{myTeam.team_name}"</Button>
          )}
          {isHost && t.status === "registration" && (
            <Button size="sm" onClick={startBracket}><Play className="w-4 h-4 mr-1" />Start Bracket</Button>
          )}
        </div>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">Teams ({teams.length}/{t.max_teams})</h2>
          <div className="flex flex-wrap gap-2">
            {teams.map(team => (
              <Badge key={team.id} variant={team.id === myTeam?.id ? "default" : "secondary"}>
                #{team.seed || "?"} {team.team_name}
              </Badge>
            ))}
            {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
          </div>
        </section>

        {rounds.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">Bracket</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {rounds.map(rd => (
                <div key={rd} className="flex flex-col gap-3 min-w-[200px]">
                  <p className="text-xs font-semibold text-muted-foreground">Round {rd}</p>
                  {matches.filter(m => m.round === rd).map(m => (
                    <Card key={m.id} className={`p-2 text-sm ${m.locked ? "border-primary/40" : ""}`}>
                      {(["a", "b"] as const).map(side => {
                        const tid = side === "a" ? m.team_a_id : m.team_b_id;
                        const isWinner = m.winner_team_id === tid;
                        return (
                          <div key={side} className={`flex items-center justify-between py-1 px-1 rounded ${isWinner ? "bg-primary/10 font-semibold" : ""}`}>
                            <span className="truncate flex items-center gap-1">
                              {isWinner && <Crown className="w-3 h-3 text-primary" />}
                              {tid ? teamMap[tid] || "—" : <span className="text-muted-foreground italic">BYE</span>}
                            </span>
                            {isHost && !m.locked && tid && (
                              <button onClick={() => pickWinner(m, side)} className="text-[10px] text-primary hover:underline">Win</button>
                            )}
                          </div>
                        );
                      })}
                      <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
                        {m.locked ? (
                          <span className="text-[10px] text-primary flex items-center gap-1"><Lock className="w-3 h-3" />Locked</span>
                        ) : m.winner_team_id && isHost ? (
                          <button onClick={() => confirmResult(m)} className="text-[10px] text-primary flex items-center gap-1 hover:underline"><ShieldCheck className="w-3 h-3" />Confirm</button>
                        ) : m.winner_team_id ? (
                          <span className="text-[10px] text-amber-500">Pending confirm</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                        <button onClick={() => setAuditOpen(auditOpen === m.id ? null : m.id)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <History className="w-3 h-3" />Audit
                        </button>
                      </div>
                      {auditOpen === m.id && (
                        <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5 max-h-32 overflow-auto">
                          {audit.filter(a => a.match_id === m.id).length === 0 && <p>No audit entries yet.</p>}
                          {audit.filter(a => a.match_id === m.id).map(a => (
                            <div key={a.id} className="flex justify-between gap-2">
                              <span>{a.action}{a.new_winner_team_id ? ` → ${teamMap[a.new_winner_team_id] || "?"}` : ""}</span>
                              <span>{new Date(a.created_at).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {audit.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Match audit history</h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">{filteredAudit.length}/{audit.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="relative md:col-span-2">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search actor, action, note, team" value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="h-9 pl-7 text-xs" />
              </div>
              <select value={auditActor} onChange={e => setAuditActor(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="all">All actors</option>
                {uniqueActors.map(u => <option key={u} value={u}>{actorLabel(u)}</option>)}
              </select>
              <select value={auditAction} onChange={e => setAuditAction(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="all">All actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="flex gap-1">
                <Input type="datetime-local" value={auditFrom} onChange={e => setAuditFrom(e.target.value)} className="h-9 text-xs" title="From" />
                <Input type="datetime-local" value={auditTo} onChange={e => setAuditTo(e.target.value)} className="h-9 text-xs" title="To" />
              </div>
            </div>
            {(auditSearch || auditActor !== "all" || auditAction !== "all" || auditFrom || auditTo) && (
              <button onClick={() => { setAuditSearch(""); setAuditActor("all"); setAuditAction("all"); setAuditFrom(""); setAuditTo(""); }} className="text-[11px] text-primary hover:underline flex items-center gap-1"><Filter className="w-3 h-3" />Clear filters</button>
            )}
            <div className="max-h-96 overflow-auto divide-y divide-border">
              {filteredAudit.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No audit entries match these filters.</p>}
              {filteredAudit.map(a => {
                const matchIdx = matches.findIndex(m => m.id === a.match_id);
                const matchLabel = matchIdx >= 0 ? `R${matches[matchIdx].round}·M${matches[matchIdx].position}` : a.match_id.slice(0, 6);
                return (
                  <div key={a.id} className="py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted-foreground font-mono">{new Date(a.created_at).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                    <span className="text-muted-foreground">by <b className="text-foreground">{actorLabel(a.actor_user_id)}</b></span>
                    <span className="text-muted-foreground">match <b className="text-foreground">{matchLabel}</b></span>
                    {a.new_winner_team_id && (
                      <span className="text-muted-foreground">
                        {a.old_winner_team_id ? `${teamMap[a.old_winner_team_id] || "?"} → ` : "→ "}
                        <b className="text-foreground">{teamMap[a.new_winner_team_id] || "?"}</b>
                      </span>
                    )}
                    {a.note && <span className="text-muted-foreground italic">"{a.note}"</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}