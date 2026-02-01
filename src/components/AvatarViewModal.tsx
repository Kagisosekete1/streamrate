import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AvatarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  username?: string;
}

export const AvatarViewModal = ({
  isOpen,
  onClose,
  imageUrl,
  username,
}: AvatarViewModalProps) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Username label */}
          {username && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <span className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                @{username}
              </span>
            </div>
          )}

          {/* Square cropped image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-sm aspect-square"
          >
            <img
              src={imageUrl}
              alt={username || "Profile picture"}
              className="w-full h-full rounded-2xl object-cover shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
