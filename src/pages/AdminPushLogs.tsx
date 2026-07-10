import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2, Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useIsSeenAdmin } from "@/hooks/useIsSeenAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PushLogRow {
  id: string;
  user_id: string | null;
  notification_type: string | null;
  title: string | null;
  message: string | null;
  deep_link: string | null;
  status: string;
  http_status: number | null;
  error: string | null;
  onesignal_id: string | null;
  payload: Record<string, any> | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

const csvEscape = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AdminPushLogs = () => {
  const isAdmin = useIsSeenAdmin();
  const [rows, setRows] = useState<PushLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "failed">("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("push_dispatch_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data || []) as PushLogRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (isAdmin === false) return <Navigate to="/home" replace />;

  const filtered = rows.filter((r) => {
    if (filter === "sent") return r.status === "sent";
    if (filter === "failed") return r.status !== "sent";
    return true;
  });

  const exportCsv = () => {
    const header = ["created_at", "user_id", "type", "status", "http_status", "title", "deep_link", "onesignal_id", "error"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        r.created_at, r.user_id ?? "", r.notification_type ?? "", r.status, r.http_status ?? "",
        r.title ?? "", r.deep_link ?? "", r.onesignal_id ?? "", r.error ?? "",
      ].map(csvEscape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `push-dispatch-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const retryDispatch = async (row: PushLogRow) => {
    if (!row.user_id || !row.title || !row.message) {
      toast.error("This log is missing required notification details.");
      return;
    }

    setRetryingId(row.id);
    const retryBody = {
      userId: row.user_id,
      title: row.title,
      message: row.message,
      data: row.payload?.data ?? { type: row.notification_type },
    };
    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: retryBody,
    });

    await (supabase as any)
      .from("push_dispatch_logs")
      .update({ retry_count: (row.retry_count || 0) + 1, last_retry_at: new Date().toISOString() })
      .eq("id", row.id);

    setRetryingId(null);
    if (error) {
      toast.error("Retry failed. Check the newest log row for details.");
    } else {
      toast.success("Retry sent. A new delivery log was created.");
    }
    load();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto flex items-center gap-2 px-4 h-14">
            <Link to="/settings" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-lg text-foreground flex-1">Push dispatch logs</h1>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2">
            {(["all", "sent", "failed"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No push dispatch logs yet.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const ok = r.status === "sent";
                const Icon = ok ? CheckCircle2 : r.status === "failed" ? XCircle : AlertTriangle;
                return (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Icon className={cn("w-4 h-4 mt-0.5", ok ? "text-green-500" : "text-destructive")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.title || "(no title)"}</span>
                          <span className="text-xs text-muted-foreground">{r.notification_type || "—"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", ok ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
                            {r.status}{r.http_status ? ` (${r.http_status})` : ""}
                          </span>
                          {r.retry_count > 0 && (
                            <span className="text-xs text-muted-foreground">Retried {r.retry_count}x</span>
                          )}
                        </div>
                        {r.message && <p className="text-xs text-muted-foreground line-clamp-2">{r.message}</p>}
                        {r.deep_link && <p className="text-xs text-primary break-all">{r.deep_link}</p>}
                        {r.error && <p className="text-xs text-destructive break-all mt-1">{r.error}</p>}
                        {!ok && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-8"
                            onClick={() => retryDispatch(r)}
                            disabled={retryingId === r.id}
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", retryingId === r.id && "animate-spin")} /> Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminPushLogs;