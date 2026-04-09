import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useRef, useCallback } from "react";

interface AvatarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  username?: string;
}

const getOriginalQualityUrl = (url: string): string => {
  try {
    const u = new URL(url);
    u.searchParams.delete("w");
    u.searchParams.delete("h");
    u.searchParams.delete("fit");
    u.searchParams.delete("crop");
    u.searchParams.delete("q");
    u.searchParams.delete("width");
    u.searchParams.delete("height");
    return u.toString();
  } catch {
    return url;
  }
};

export const AvatarViewModal = ({
  isOpen,
  onClose,
  imageUrl,
  username,
}: AvatarViewModalProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    lastDistance.current = null;
    lastCenter.current = null;
    lastPos.current = null;
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches[0], e.touches[1]);
      lastCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(5, Math.max(1, scale * (dist / lastDistance.current)));
      setScale(newScale);
      lastDistance.current = dist;

      if (lastCenter.current) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setTranslate(prev => ({
          x: prev.x + (cx - lastCenter.current!.x),
          y: prev.y + (cy - lastCenter.current!.y),
        }));
        lastCenter.current = { x: cx, y: cy };
      }
    } else if (e.touches.length === 1 && isDragging.current && lastPos.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastDistance.current = null;
      lastCenter.current = null;
    }
    if (e.touches.length === 0) {
      isDragging.current = false;
      lastPos.current = null;
      if (scale <= 1) reset();
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      reset();
    } else {
      setScale(2.5);
    }
  };

  const originalUrl = getOriginalQualityUrl(imageUrl);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {username && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <span className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                @{username}
              </span>
            </div>
          )}

          {scale > 1 && (
            <button
              onClick={reset}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-white/70 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              Double-tap to reset
            </button>
          )}

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-sm aspect-square touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={originalUrl}
              alt={username || "Profile picture"}
              className="w-full h-full rounded-2xl object-cover shadow-2xl select-none"
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                transition: isDragging.current ? "none" : "transform 0.2s ease-out",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};