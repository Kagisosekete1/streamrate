import { useEffect, useState } from "react";
import { Copy, Check, Share2, Gift, Loader2 } from "lucide-react";
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

  const referralCode = (profile as any)?.referral_code as string | undefined;
  const referralUrl = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory(data || []));
  }, [user]);

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
          <h2 className="font-semibold mb-3">Your referrals</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet — share your link to get started.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className={r.reward_granted ? "text-primary font-medium" : "text-muted-foreground"}>
                    {r.reward_granted ? "Blue badge granted" : "No reward (yearly limit)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default Invite;