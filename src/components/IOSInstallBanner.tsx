import { useState, useEffect } from "react";
import { X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    const dismissed = localStorage.getItem("ios-install-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("ios-install-dismissed", Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-16 left-3 right-3 z-50 bg-card border border-border rounded-2xl p-3 shadow-lg md:hidden"
        >
          <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-4">
            <img src="/logo.png" alt="StreamRate" className="w-10 h-10 rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold">Install StreamRate</p>
              <p className="text-muted-foreground text-xs">
                Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen"
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
