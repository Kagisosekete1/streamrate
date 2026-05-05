import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Share2, Gift, Loader2, Download, ArrowUpDown, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Invite = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<"created_at" | "name" | "reward">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const referralCode = (profile as any)?.referral_code as string | undefined;
  const referralUrl = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      const list = refs || [];
      const refereeIds = Array.from(new Set(list.map((r: any) => r.referee_id))).filter(Boolean);
      let profilesById: Record<string, any> = {};
      if (refereeIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", refereeIds);
        profilesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      setHistory(list.map((r: any) => ({ ...r, referee: profilesById[r.referee_id] || null })));
    })();
  }, [user]);

  const sorted = useMemo(() => {
    const arr = [...history];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === "name") {
        const an = (a.referee?.username || a.referee?.full_name || "").toLowerCase();
        const bn = (b.referee?.username || b.referee?.full_name || "").toLowerCase();
        cmp = an.localeCompare(bn);
      } else {
        cmp = Number(!!a.reward_granted) - Number(!!b.reward_granted);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [history, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const handleExportCsv = () => {
    const header = ["Username", "Full name", "Confirmed at", "Reward granted", "Reward expires at", "Referral code"];
    const rows = sorted.map((r) => [
      r.referee?.username || "",
      r.referee?.full_name || "",
      new Date(r.created_at).toISOString(),
      r.reward_granted ? "yes" : "no",
      r.reward_expires_at ? new Date(r.reward_expires_at).toISOString() : "",
      r.referral_code || "",
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const handleCopy = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast({ title: "Invite link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on StreamRate",
          text: "Join StreamRate with my invite — I'll get a blue verification badge if you sign up!",
          url: referralUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_referral", { _code: code.trim() });
    setRedeeming(false);
    if (error) {
      toast({ title: "Couldn't redeem code", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as any;
    if (!r?.ok) {
      const msg: Record<string, string> = {
        not_authenticated: "Please sign in first.",
        invalid_code: "Please enter a valid code.",
        code_not_found: "We couldn't find that referral code.",
        self_referral: "You can't refer yourself.",
        already_referred: "You've already used a referral code.",
      };
      toast({ title: "Couldn't redeem code", description: msg[r?.error] || r?.error || "Try again later.", variant: "destructive" });
      return;
    }
    toast({
      title: "Referral applied!",
      description: r.reward_granted
        ? "Your friend just earned a blue verification badge for a year."
        : "Thanks! Your friend has already earned a referral reward this year.",
    });
    setCode("");
    refreshProfile();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        <header className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Invite friends, earn a Blue Badge</h1>
          <p className="text-sm text-muted-foreground">
            Share your invite link. When a friend signs up and uses your code, you get a Blue Verification badge for 1 year. One reward per year.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Your referral link</h2>
          {referralCode ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={referralUrl} className="flex-1" />
                <Button onClick={handleCopy} variant="secondary">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Or share your code: <span className="font-mono font-bold text-foreground">{referralCode}</span>
              </p>
              <Button onClick={handleShare} variant="gaming" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share Invite
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to view your referral link.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Have a referral code?</h2>
          <p className="text-xs text-muted-foreground">
            Enter the code a friend sent you. Your friend will receive the Blue Verification reward.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter referral code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={redeeming}
            />
            <Button onClick={handleRedeem} disabled={redeeming || !code.trim()}>
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="font-semibold">Your referrals {history.length > 0 && <span className="text-muted-foreground font-normal">({history.length})</span>}</h2>
            {history.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => toggleSort("created_at")}>
                  <ArrowUpDown className="w-3 h-3 mr-1" /> Date {sortKey === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleSort("name")}>
                  <ArrowUpDown className="w-3 h-3 mr-1" /> Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleSort("reward")}>
                  <ArrowUpDown className="w-3 h-3 mr-1" /> Reward {sortKey === "reward" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No referrals yet</p>
                <p className="text-sm text-muted-foreground">Share your link to invite friends and earn a Blue Verification badge.</p>
              </div>
              {referralUrl && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleShare} variant="gaming">
                    <Share2 className="w-4 h-4 mr-2" /> Share invite
                  </Button>
                  <Button onClick={handleCopy} variant="outline">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} Copy link
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-3 text-sm">
              {pageItems.map((r) => {
                const referee = r.referee || {};
                const name = referee.username || referee.full_name || "New member";
                const avatar = referee.avatar_url;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 border-b border-border/50 pb-3 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Confirmed {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full whitespace-nowrap " +
                        (r.reward_granted
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {r.reward_granted ? "Blue badge" : "No reward"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {history.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default Invite;