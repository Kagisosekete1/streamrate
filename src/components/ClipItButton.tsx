import { useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { toast } from "sonner";

interface Props {
  platform: string;
  streamUrl: string;
  streamerId?: string;
  streamerName?: string;
}

export const ClipItButton = ({ platform, streamUrl, streamerId, streamerName }: Props) => {
  const { user } = useAuth();
  const { updateMissionProgress } = useGamification();
  const [clipping, setClipping] = useState(false);

  const handleClip = async () => {
    if (!user) { toast.error("Sign in to clip"); return; }
    setClipping(true);
    try {
      const title = `Clipped from ${streamerName || "stream"} · ${new Date().toLocaleTimeString()}`;
      const { error } = await supabase.from("stream_clips").insert({
        clipper_id: user.id,
        source_streamer_id: streamerId || null,
        source_streamer_name: streamerName || null,
        platform,
        stream_url: streamUrl,
        title,
      });
      if (error) throw error;

      // Reward clipper with XP/coins
      const { data: bal } = await supabase.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle();
      await supabase.from("user_coins").upsert({ user_id: user.id, balance: (bal?.balance || 0) + 2 }, { onConflict: "user_id" });
      await supabase.from("coin_transactions").insert({ user_id: user.id, amount: 2, type: "earn", description: "Clipped a stream moment" });
      updateMissionProgress("clip_stream");

      toast.success("🎬 Clip saved! +2 coins");
    } catch (e) {
      toast.error("Failed to clip");
    }
    setClipping(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-xs border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
      onClick={handleClip}
      disabled={clipping}
    >
      <Scissors className="w-3 h-3" />
      {clipping ? "Clipping..." : "Clip It!"}
    </Button>
  );
};
