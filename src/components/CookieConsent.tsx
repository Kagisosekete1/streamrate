import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  personalization: false,
};

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        setPreferences(JSON.parse(consent));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    });
  };

  const rejectNonEssential = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  return (
    <>
      {/* Cookie Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
          >
            <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Cookie className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      We value your privacy
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We use cookies to enhance your browsing experience, serve personalized content, 
                      and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                      You can manage your preferences or learn more in our{" "}
                      <button 
                        onClick={() => setShowPreferences(true)}
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </button>.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreferences(true)}
                        className="gap-2"
                      >
                        <Settings2 className="w-4 h-4" />
                        Manage Preferences
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={rejectNonEssential}
                      >
                        Reject Non-Essential
                      </Button>
                      <Button
                        variant="gaming"
                        size="sm"
                        onClick={acceptAll}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Accept All
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={rejectNonEssential}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-primary" />
              Cookie Preferences
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              Manage your cookie preferences below. You can enable or disable different 
              types of cookies. Note that blocking some types of cookies may impact your 
              experience on our platform.
            </p>

            {/* Necessary Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-secondary/50 rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">Strictly Necessary</h4>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                    Required
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Essential for the website to function properly. These cookies enable basic 
                  features like page navigation, secure areas access, and session management.
                </p>
              </div>
              <Switch checked disabled className="opacity-50" />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-secondary/30 rounded-xl">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Analytics & Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our platform. This data is used 
                  to improve performance, identify issues, and enhance user experience.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-secondary/30 rounded-xl">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Marketing & Advertising</h4>
                <p className="text-sm text-muted-foreground">
                  Used to track visitors across websites to display relevant advertisements. 
                  These cookies help us measure the effectiveness of our marketing campaigns.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>

            {/* Personalization Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-secondary/30 rounded-xl">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Personalization</h4>
                <p className="text-sm text-muted-foreground">
                  Enable personalized content and recommendations based on your browsing 
                  behavior, preferences, and interactions on our platform.
                </p>
              </div>
              <Switch
                checked={preferences.personalization}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, personalization: checked })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={rejectNonEssential}
              >
                Reject All
              </Button>
              <Button
                variant="gaming"
                className="flex-1"
                onClick={saveCustomPreferences}
              >
                Save Preferences
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              For more information, please read our{" "}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              {" "}and{" "}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
