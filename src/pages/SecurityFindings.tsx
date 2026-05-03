import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Finding {
  id: string;
  internal_id: string;
  scanner: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  fixed_at: string | null;
  notes: string | null;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-destructive/15 text-destructive",
  fixed: "bg-emerald-500/15 text-emerald-500",
  ignored: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-500/15 text-amber-500",
};

const SecurityFindings = () => {
  const { user, loading: authLoading } = useAuth();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (rpcError) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data));
    })();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error: qErr } = await supabase
        .from("security_findings" as any)
        .select("*")
        .order("severity", { ascending: true })
        .order("updated_at", { ascending: false });
      if (qErr) {
        setError(qErr.message);
        return;
      }
      setFindings((data as any) || []);
    })();
  }, [isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    const { error: uErr } = await supabase
      .from("security_findings" as any)
      .update({ status, fixed_at: status === "fixed" ? new Date().toISOString() : null })
      .eq("id", id);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setFindings((prev) =>
      (prev || []).map((f) => (f.id === id ? { ...f, status, fixed_at: status === "fixed" ? new Date().toISOString() : null } : f))
    );
  };

  if (authLoading || isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto p-6 text-center pb-24">
          <ShieldOff className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold mb-2">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view security findings.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-24">
        <header className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Security Findings</h1>
            <p className="text-sm text-muted-foreground">Latest results from automated security scans.</p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
            {error}
          </div>
        )}

        {findings === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : findings.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-border bg-card">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
            <p className="font-medium">No findings recorded yet.</p>
            <p className="text-sm text-muted-foreground">Run a scan to populate this list.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {findings.map((f) => (
              <li key={f.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLES[f.status] || ""}`}>
                        {f.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{f.severity} · {f.scanner}</span>
                    </div>
                    <h3 className="font-semibold mt-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{f.description}</p>
                    {f.fixed_at && (
                      <p className="text-xs text-emerald-500 mt-1">Fixed {new Date(f.fixed_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["open", "in_progress", "fixed", "ignored"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={f.status === s ? "default" : "outline"}
                      onClick={() => updateStatus(f.id, s)}
                    >
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default SecurityFindings;