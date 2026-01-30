import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Split, Layers, Video, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DuetStitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  reelVideoUrl: string;
  reelCaption?: string;
  creatorUsername?: string;
}

export const DuetStitchModal = ({
  isOpen,
  onClose,
  reelId,
  reelVideoUrl,
  reelCaption,
  creatorUsername,
}: DuetStitchModalProps) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<"duet" | "stitch" | null>(null);

  const handleDuet = () => {
    // Navigate to reel creation with duet mode
    navigate("/create-reel", {
      state: {
        mode: "duet",
        originalReelId: reelId,
        originalVideoUrl: reelVideoUrl,
        originalCaption: reelCaption,
        originalCreator: creatorUsername,
      },
    });
    onClose();
  };

  const handleStitch = () => {
    // Navigate to reel creation with stitch mode
    navigate("/create-reel", {
      state: {
        mode: "stitch",
        originalReelId: reelId,
        originalVideoUrl: reelVideoUrl,
        originalCaption: reelCaption,
        originalCreator: creatorUsername,
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4">
              <h3 className="text-lg font-bold text-foreground">Create With This Reel</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Preview */}
            <div className="px-4 pb-4">
              <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-16 h-24 rounded-lg overflow-hidden bg-black relative flex-shrink-0">
                  <video
                    src={reelVideoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Original reel by</p>
                  <p className="font-semibold text-foreground text-sm truncate">
                    @{creatorUsername || "user"}
                  </p>
                  {reelCaption && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {reelCaption}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="px-4 pb-6 space-y-3">
              {/* Duet Option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedOption("duet")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  selectedOption === "duet"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/50 hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Duet</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Record your video side-by-side with this reel. Perfect for reactions, covers, or collaborations.
                  </p>
                </div>
              </motion.button>

              {/* Stitch Option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedOption("stitch")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  selectedOption === "stitch"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/50 hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Split className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Stitch</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use part of this reel as an intro, then record your own video. Great for responses and story continuation.
                  </p>
                </div>
              </motion.button>

              {/* Action Button */}
              <Button
                variant="gaming"
                className="w-full mt-4"
                disabled={!selectedOption}
                onClick={selectedOption === "duet" ? handleDuet : handleStitch}
              >
                <Video className="w-4 h-4 mr-2" />
                {selectedOption === "duet"
                  ? "Start Duet"
                  : selectedOption === "stitch"
                  ? "Start Stitch"
                  : "Select an Option"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
