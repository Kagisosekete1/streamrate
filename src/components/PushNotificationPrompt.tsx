import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationPrompt = () => {
  const { isSupported, permissionStatus, requestPermission } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const hasDismissed = localStorage.getItem("push_prompt_dismissed");
    if (hasDismissed) {
      setDismissed(true);
    }

    // Show prompt after a delay if push is supported and permission not granted
    if (isSupported && permissionStatus === "prompt" && !hasDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permissionStatus]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", "true");
  };

  if (!isSupported || permissionStatus === "granted" || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  Enable Push Notifications
                </h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Get notified when streamers you follow post new content
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="gaming"
                    size="sm"
                    onClick={handleEnable}
                    className="text-xs"
                  >
                    Enable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-xs"
                  >
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
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
