import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WhatsNewModal } from "@/components/WhatsNewModal";

const STORAGE_KEY = "streamrate_seen_version";

export const UpdateBanner = () => {
  const [version, setVersion] = useState<{ version: string; release_notes: string | null } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_versions")
        .select("version, release_notes")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== data.version) setVersion(data);
    })();
  }, []);

  const dismiss = () => {
    if (version) localStorage.setItem(STORAGE_KEY, version.version);
    setVersion(null);
  };

  const openWhatsNew = () => {
    setModalOpen(true);
  };

  const update = async () => {
    if (!version) return;
    setUpdating(true);
    localStorage.setItem(STORAGE_KEY, version.version);
    // Clear caches and reload
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
    } catch {}
    window.location.reload();
  };

  return (
    <>
    <AnimatePresence>
      {version && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
        >
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">
                New update v{version.version} available!
              </p>
              {version.release_notes && (
                <p className="text-xs opacity-90 truncate">{version.release_notes}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={openWhatsNew}
              disabled={updating}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${updating ? "animate-spin" : ""}`} />
              Update
            </Button>
            <button onClick={dismiss} className="p-1 hover:bg-white/10 rounded-md" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {version && (
      <WhatsNewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        version={version.version}
        onUpdate={update}
        updating={updating}
      />
    )}
    </>
  );
};
