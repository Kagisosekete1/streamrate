import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { promptForPushNotifications, getOneSignalPermission } from "@/utils/onesignal";

export const PushNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem("push_prompt_dismissed");
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    const granted = getOneSignalPermission();
    setPermissionGranted(!!granted);

    if (!granted) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (enabling) return;
    setEnabling(true);
    try {
      const granted = await promptForPushNotifications();
      if (granted) {
        setPermissionGranted(true);
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("Push notification enable error:", err);
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", "true");
  };

  if (permissionGranted || dismissed) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <div
            onClick={handleEnable}
            role="button"
            tabIndex={0}
            className="bg-card border border-border rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  {enabling ? "Enabling..." : "🔔 Enable Push Notifications"}
                </h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Tap to get notified when streamers post, go live, or interact with you
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
