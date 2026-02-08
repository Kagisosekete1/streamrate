import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Share, Plus, ArrowLeft, Smartphone, Monitor, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "StreamRate",
        text: "Rate & review your favorite streamers!",
        url: window.location.origin,
      });
    }
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
          <Smartphone className="w-10 h-10 text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Already Installed!</h1>
        <p className="text-muted-foreground mb-6">You're using the StreamRate app right now.</p>
        <Button variant="gaming" onClick={() => navigate("/home")}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Install App</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
            <img src="/logo.png" alt="StreamRate" className="w-16 h-16 rounded-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Get StreamRate</h2>
          <p className="text-muted-foreground text-sm">
            Install StreamRate on your device for the best experience — offline access, faster loading, and home screen launch.
          </p>
        </motion.div>

        {/* Quick Install (Android/Chrome) */}
        {deferredPrompt && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="gaming" size="lg" className="w-full gap-2 text-base" onClick={handleInstall}>
              <Download className="w-5 h-5" />
              Install Now
            </Button>
          </motion.div>
        )}

        {/* iOS Instructions */}
        {isIOS && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on iPhone / iPad
            </h3>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <p className="text-foreground font-medium text-sm">Tap the Share button</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Look for the <Share className="w-3.5 h-3.5 inline" /> icon at the bottom of Safari</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <p className="text-foreground font-medium text-sm">Scroll down & tap "Add to Home Screen"</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Look for the <Plus className="w-3.5 h-3.5 inline" /> icon next to it</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                <div>
                  <p className="text-foreground font-medium text-sm">Tap "Add"</p>
                  <p className="text-muted-foreground text-xs mt-0.5">StreamRate will appear on your home screen like a native app</p>
                </div>
              </li>
            </ol>
          </motion.div>
        )}

        {/* Android Instructions (fallback if no prompt) */}
        {isAndroid && !deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on Android
            </h3>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <p className="text-foreground font-medium text-sm">Open in Chrome browser</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Make sure you're using Google Chrome</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <p className="text-foreground font-medium text-sm">Tap the menu (⋮) → "Install app"</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Or look for the install banner at the bottom</p>
                </div>
              </li>
            </ol>
          </motion.div>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Install on Desktop
            </h3>
            <p className="text-muted-foreground text-sm">
              In Chrome, click the install icon in the address bar, or go to Menu → "Install StreamRate".
            </p>
          </motion.div>
        )}

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="font-semibold text-foreground text-sm">Why install?</h3>
          {[
            { title: "Instant Launch", desc: "Open directly from your home screen" },
            { title: "Offline Access", desc: "Browse cached content without internet" },
            { title: "Full Screen", desc: "No browser bars — immersive experience" },
            { title: "Fast & Smooth", desc: "Optimized performance like a native app" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-3">
              <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-foreground text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Share */}
        {"share" in navigator && (
          <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
            <Share className="w-4 h-4" />
            Share with friends
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Install;
