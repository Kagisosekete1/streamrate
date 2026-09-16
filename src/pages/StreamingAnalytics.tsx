import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Activity, Users, Clock, MessageCircle, 
  TrendingUp, Wifi, WifiOff, Link2, Unlink, BarChart3,
  Eye, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ConnectedPlatform {
  id: string;
  platform: string;
  platform_username: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  connected_at: string;
}

interface AnalyticsSnapshot {
  id: string;
  platform: string;
  recorded_at: string;
  viewer_count: number;
  peak_viewers: number;
  is_live: boolean;
  stream_title: string | null;
  stream_duration_minutes: number;
  chat_messages_count: number;
  follower_count: number;
  subscriber_count: number;
  new_followers: number;
  engagement_rate: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitch: "#9146FF",
  kick: "#53FC18",
  discord: "#5865F2",
};

const PLATFORM_LABELS: Record<string, string> = {
  twitch: "Twitch",
  kick: "Kick",
  discord: "Discord",
};

const StreamingAnalytics = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [platformUsername, setPlatformUsername] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();

    // Realtime subscription for analytics updates
    const channel = supabase
      .channel("streaming-analytics-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "streaming_analytics",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setAnalytics(prev => [payload.new as AnalyticsSnapshot, ...prev]);
      })
      .subscribe();

    // Auto-sync every 5 minutes
    const autoSyncInterval = setInterval(() => {
      platforms.forEach(p => {
        if (p.is_active) syncPlatform(p.platform);
      });
    }, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(autoSyncInterval);
    };
  }, [user, platforms]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: platformsData }, { data: analyticsData }] = await Promise.all([
      supabase.from("connected_platforms").select("id, user_id, platform, platform_username, platform_user_id, connected_at, last_synced_at, is_active").eq("user_id", user.id),
      supabase.from("streaming_analytics").select("*").eq("user_id", user.id)
        .order("recorded_at", { ascending: false }).limit(100),
    ]);

    setPlatforms(platformsData || []);
    setAnalytics(analyticsData || []);
    setLoading(false);
  };

  const handleConnectPlatform = async (platform: string) => {
    if (!user || !platformUsername.trim()) return;

    const { error } = await supabase.from("connected_platforms").upsert({
      user_id: user.id,
      platform,
      platform_username: platformUsername.trim(),
      is_active: true,
    }, { onConflict: "user_id,platform" });

    if (error) {
      toast({ title: "Failed to connect", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${PLATFORM_LABELS[platform]} connected!` });
      setPlatformUsername("");
      setConnectingPlatform(null);
      fetchData();
      // Trigger initial sync
      syncPlatform(platform);
    }
  };

  const handleDisconnect = async (platformId: string, platform: string) => {
    await supabase.from("connected_platforms").delete().eq("id", platformId);
    toast({ title: `${PLATFORM_LABELS[platform]} disconnected` });
    fetchData();
  };

  const syncPlatform = async (platform: string) => {
    try {
      await supabase.functions.invoke("sync-streaming-analytics", {
        body: { platform, userId: user?.id },
      });
      toast({ title: "Syncing analytics..." });
    } catch {
      // Edge function may not be deployed yet
    }
  };

  // Get latest analytics per platform
  const getLatestForPlatform = (platform: string): AnalyticsSnapshot | undefined => {
    return analytics.find(a => a.platform === platform);
  };

  const connectedPlatformNames = platforms.map(p => p.platform);
  const availablePlatforms = ["twitch", "kick", "discord"].filter(
    p => !connectedPlatformNames.includes(p)
  );

  // Aggregated stats
  const totalFollowers = platforms.reduce((sum, p) => {
    const latest = getLatestForPlatform(p.platform);
    return sum + (latest?.follower_count || 0);
  }, 0);

  const totalViewers = platforms.reduce((sum, p) => {
    const latest = getLatestForPlatform(p.platform);
    return sum + (latest?.viewer_count || 0);
  }, 0);

  const isAnyLive = platforms.some(p => getLatestForPlatform(p.platform)?.is_live);

  const filteredAnalytics = selectedPlatform === "all" 
    ? analytics 
    : analytics.filter(a => a.platform === selectedPlatform);

  return (
    <AppLayout showBottomNav>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Streaming Analytics</h1>
              <p className="text-xs text-muted-foreground">Track your Twitch, Kick & Discord stats</p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6 max-w-3xl mx-auto">
          {/* Overview Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalFollowers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Followers</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-xl p-4 text-center">
              <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalViewers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Live Viewers</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4 text-center">
              {isAnyLive ? <Wifi className="w-5 h-5 text-green-500 mx-auto mb-1" /> : <WifiOff className="w-5 h-5 text-muted-foreground mx-auto mb-1" />}
              <p className="text-2xl font-bold text-foreground">{isAnyLive ? "LIVE" : "Offline"}</p>
              <p className="text-xs text-muted-foreground">Stream Status</p>
            </motion.div>
          </div>

          {/* Connected Platforms */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Connected Channels</h2>
            <div className="space-y-3">
              {platforms.map(platform => {
                const latest = getLatestForPlatform(platform.platform);
                const color = PLATFORM_COLORS[platform.platform] || "#888";
                return (
                  <motion.div key={platform.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
                          <Activity className="w-5 h-5" style={{ color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{PLATFORM_LABELS[platform.platform]}</p>
                          <p className="text-xs text-muted-foreground">@{platform.platform_username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {latest?.is_live && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => syncPlatform(platform.platform)}>
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDisconnect(platform.id, platform.platform)}>
                          <Unlink className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Platform Stats */}
                    {latest ? (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-foreground">{latest.viewer_count.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Viewers</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-foreground">{latest.peak_viewers.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Peak</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-foreground">{latest.follower_count.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Followers</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-foreground">{latest.chat_messages_count.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Chat Msgs</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No data yet — sync to fetch latest stats</p>
                    )}

                    {platform.last_synced_at && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Last synced {formatDistanceToNow(new Date(platform.last_synced_at), { addSuffix: true })}
                      </p>
                    )}
                  </motion.div>
                );
              })}

              {/* Connect New Platform */}
              {availablePlatforms.length > 0 && (
                <div className="space-y-2">
                  {connectingPlatform ? (
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="font-semibold text-foreground mb-2">
                        Connect {PLATFORM_LABELS[connectingPlatform]}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Enter your {PLATFORM_LABELS[connectingPlatform]} username to connect
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`${PLATFORM_LABELS[connectingPlatform]} username`}
                          value={platformUsername}
                          onChange={e => setPlatformUsername(e.target.value)}
                          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <Button variant="gaming" size="sm" onClick={() => handleConnectPlatform(connectingPlatform)}>
                          Connect
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setConnectingPlatform(null); setPlatformUsername(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {availablePlatforms.map(p => (
                        <Button key={p} variant="outline" size="sm" onClick={() => setConnectingPlatform(p)}
                          className="gap-2" style={{ borderColor: PLATFORM_COLORS[p] + "40" }}>
                          <Link2 className="w-4 h-4" style={{ color: PLATFORM_COLORS[p] }} />
                          Connect {PLATFORM_LABELS[p]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Analytics History */}
          {analytics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">Analytics History</h2>
                <div className="flex gap-1">
                  <button onClick={() => setSelectedPlatform("all")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedPlatform === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    All
                  </button>
                  {platforms.map(p => (
                    <button key={p.platform} onClick={() => setSelectedPlatform(p.platform)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedPlatform === p.platform ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {PLATFORM_LABELS[p.platform]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredAnalytics.slice(0, 20).map(snapshot => (
                  <div key={snapshot.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" 
                      style={{ backgroundColor: (PLATFORM_COLORS[snapshot.platform] || "#888") + "20" }}>
                      <BarChart3 className="w-4 h-4" style={{ color: PLATFORM_COLORS[snapshot.platform] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{PLATFORM_LABELS[snapshot.platform]}</span>
                        {snapshot.is_live && <span className="text-[10px] text-red-400 font-bold">LIVE</span>}
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span><Eye className="w-3 h-3 inline mr-0.5" />{snapshot.viewer_count}</span>
                        <span><Users className="w-3 h-3 inline mr-0.5" />{snapshot.follower_count}</span>
                        <span><UserPlus className="w-3 h-3 inline mr-0.5" />+{snapshot.new_followers}</span>
                        <span><MessageCircle className="w-3 h-3 inline mr-0.5" />{snapshot.chat_messages_count}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(snapshot.recorded_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {platforms.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">No Channels Connected</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Connect your Twitch, Kick, or Discord accounts to start tracking your streaming analytics in real-time.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {["twitch", "kick", "discord"].map(p => (
                  <Button key={p} variant="outline" size="sm" onClick={() => setConnectingPlatform(p)}
                    className="gap-2" style={{ borderColor: PLATFORM_COLORS[p] + "40" }}>
                    <Link2 className="w-4 h-4" style={{ color: PLATFORM_COLORS[p] }} />
                    {PLATFORM_LABELS[p]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StreamingAnalytics;
