import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface AvatarZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  username?: string;
}

export const AvatarZoomModal = ({
  isOpen,
  onClose,
  imageUrl,
  username,
}: AvatarZoomModalProps) => {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      setScale(1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          {/* Close button */}
          <button
            onClick={() => {
              onClose();
              setScale(1);
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm font-medium min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Username label */}
          {username && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <span className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                @{username}
              </span>
            </div>
          )}

          {/* Image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative"
          >
            <motion.img
              src={imageUrl}
              alt={username || "Profile picture"}
              className="max-w-[90vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              style={{ scale }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag={scale > 1}
              dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
