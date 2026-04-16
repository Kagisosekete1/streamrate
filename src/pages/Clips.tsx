import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scissors, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Clip {
  id: string;
  clipper_id: string;
  source_streamer_id: string | null;
  source_streamer_name: string | null;
  platform: string;
  stream_url: string;
  title: string | null;
  created_at: string;
  clipper_name?: string;
  clipper_avatar?: string;
}

const Clips = () => {
  const navigate = useNavigate();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

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
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4 flex items-center gap-2">
          <Scissors className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold">Stream Clips</h1>
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
                        <a href={c.stream_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Watch
                        </a>
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
