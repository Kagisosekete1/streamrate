import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("install_prompt_dismissed");
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;

    if (dismissed || isStandalone) return;

    // Detect iOS Safari
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("install_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-24 left-4 right-4 z-50"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
          {showIOSGuide ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Install on iPhone/iPad</h3>
                <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-muted-foreground text-xs space-y-1.5 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> button (box with arrow) in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to install</li>
              </ol>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">Install StreamRate</h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Add to your home screen for the best experience
                </p>
                <div className="flex gap-2 mt-3">
                  <Button variant="gaming" size="sm" onClick={handleInstall} className="text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">
                    Not now
                  </Button>
                </div>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
