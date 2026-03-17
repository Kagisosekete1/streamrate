import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Coins, Sparkles, Eye, Clock, Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { CoinBalance } from "@/components/CoinBalance";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const boostOptions = [
  {
    id: "visibility",
    title: "Visibility Boost",
    description: "Appear higher in feeds and discover page for 24 hours",
    icon: Eye,
    cost: 50,
    duration: "24 hours",
    color: "from-primary to-blue-400",
  },
  {
    id: "featured",
    title: "Featured Profile",
    description: "Get featured on the home page spotlight for 24 hours",
    icon: Sparkles,
    cost: 100,
    duration: "24 hours",
    color: "from-accent to-pink-400",
  },
  {
    id: "premium_rank",
    title: "Premium Rank",
    description: "Rank higher in search results and creator lists for 48 hours",
    icon: Rocket,
    cost: 200,
    duration: "48 hours",
    color: "from-yellow-500 to-amber-400",
  },
];

const BoostProfile = () => {
  const { user } = useAuth();
  const { coins, addCoins, refetch } = useGamification();
  const { toast } = useToast();
  const [boosting, setBoosting] = useState<string | null>(null);

  const handleBoost = async (boostId: string, cost: number, durationHours: number) => {
    if (!user) return;
    if (coins.balance < cost) {
      toast({ title: "Not enough coins", description: `You need ${cost} coins. You have ${coins.balance}.`, variant: "destructive" });
      return;
    }

    setBoosting(boostId);

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    await supabase.from("profile_boosts").insert({
      user_id: user.id,
      boost_type: boostId,
      coin_cost: cost,
      expires_at: expiresAt,
    });

    await addCoins(-cost, `Boost: ${boostId}`);
    await refetch();

    toast({ title: "🚀 Boost Activated!", description: `Your ${boostId} boost is now active!` });
    setBoosting(null);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg text-foreground">Boost Profile</h1>
            </div>
            <CoinBalance balance={coins.balance} compact />
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">🚀 Get Noticed</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your coins to boost your profile visibility
            </p>
          </div>

          {boostOptions.map((opt, i) => {
            const Icon = opt.icon;
            const canAfford = coins.balance >= opt.cost;
            const durationHours = opt.id === "premium_rank" ? 48 : 24;

            return (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{opt.title}</h3>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                      <Coins className="w-4 h-4" />
                      {opt.cost}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {opt.duration}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    disabled={!canAfford || boosting === opt.id}
                    className={`bg-gradient-to-r ${opt.color} text-white`}
                    onClick={() => handleBoost(opt.id, opt.cost, durationHours)}
                  >
                    {boosting === opt.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Activate"
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default BoostProfile;
