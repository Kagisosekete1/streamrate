import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Download } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useIsSeenAdmin } from "@/hooks/useIsSeenAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogRow {
  id: string;
  run_at: string;
  status: "ok" | "partial" | "error" | string;
  scanned: number;
  sent: number;
  skipped: number;
  errors: Array<{ reminder_id?: string; user_id?: string; message: string }>;
  duration_ms: number | null;
}

const csvEscape = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AdminReminderLogs = () => {
  const isAdmin = useIsSeenAdmin();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("reminder_dispatch_logs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(200);
    setRows((data || []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/home" replace />;

  const totals = rows.reduce(
    (a, r) => ({ sent: a.sent + r.sent, errors: a.errors + (r.errors?.length || 0) }),
    { sent: 0, errors: 0 },
  );

  const exportCsv = () => {
    const header = ["run_at", "status", "scanned", "sent", "skipped", "duration_ms", "error_count", "reminder_id", "user_id", "error_message"];
    const lines: string[] = [header.join(",")];
    rows.forEach((r) => {
      if (!r.errors || r.errors.length === 0) {
        lines.push([r.run_at, r.status, r.scanned, r.sent, r.skipped, r.duration_ms ?? "", 0, "", "", ""].map(csvEscape).join(","));
      } else {
        r.errors.forEach((e) => {
          lines.push([r.run_at, r.status, r.scanned, r.sent, r.skipped, r.duration_ms ?? "", r.errors.length, e.reminder_id || "", e.user_id || "", e.message || ""].map(csvEscape).join(","));
        });
      }
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reminder-dispatch-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 h-14">
            <Link to="/settings" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-lg text-foreground flex-1">Reminder dispatch logs</h1>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Runs</p>
              <p className="text-xl font-bold text-foreground">{rows.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-xl font-bold text-green-500">{totals.sent}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-xl font-bold text-destructive">{totals.errors}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No dispatch runs logged yet.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {r.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className={cn(
                        "w-4 h-4",
                        r.status === "error" ? "text-destructive" : "text-amber-500",
                      )} />
                    )}
                    <span className="font-medium uppercase text-xs">{r.status}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(r.run_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.duration_ms != null ? `${r.duration_ms}ms` : ""}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Scanned: <b className="text-foreground">{r.scanned}</b></span>
                  <span>Sent: <b className="text-green-500">{r.sent}</b></span>
                  <span>Skipped: <b className="text-foreground">{r.skipped}</b></span>
                  <span>Errors: <b className="text-destructive">{r.errors?.length || 0}</b></span>
                </div>
                {r.errors && r.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-destructive">View {r.errors.length} error(s)</summary>
                    <pre className="mt-2 bg-muted rounded p-2 overflow-x-auto text-[11px]">
{JSON.stringify(r.errors, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminReminderLogs;