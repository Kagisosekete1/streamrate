import { useState, useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallBanner = () => {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

    // Don't show if already installed or dismissed within 7 days
    if (isStandalone || (dismissed && daysSinceDismissed < 7)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-3 right-3 z-50 bg-card border border-border rounded-2xl p-4 shadow-xl md:left-auto md:right-6 md:bottom-6 md:max-w-sm"
        >
          <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <img src="/pwa-192x192.png" alt="StreamRate" className="w-12 h-12 rounded-xl shadow-md" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-bold">Install StreamRate</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Get the full app experience — faster, offline-ready
              </p>
            </div>
          </div>
          <Button
            onClick={handleInstall}
            className="w-full mt-3 gap-2"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Install App
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
