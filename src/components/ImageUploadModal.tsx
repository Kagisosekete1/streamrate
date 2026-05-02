import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, formatFileSize } from "@/utils/imageCompression";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  originalFile: File;
  onSave: (file: File | Blob) => void;
  isSaving: boolean;
  title: string;
  previewType: "avatar" | "header";
}

export const ImageUploadModal = ({
  isOpen,
  onClose,
  imageSrc,
  originalFile,
  onSave,
  isSaving,
  title,
  previewType,
}: ImageUploadModalProps) => {
  const [useCompression, setUseCompression] = useState(true);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (isOpen && originalFile && useCompression) {
      handleCompress();
    }
  }, [isOpen, originalFile, useCompression]);

  // Hide the mobile bottom nav while this modal is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("hide-bottom-nav");
    return () => document.body.classList.remove("hide-bottom-nav");
  }, [isOpen]);

  const handleCompress = async () => {
    if (!originalFile) return;
    
    setIsCompressing(true);
    try {
      const compressed = await compressImage(originalFile, {
        maxWidth: previewType === "avatar" ? 500 : 1920,
        maxHeight: previewType === "avatar" ? 500 : 500,
        quality: 0.8,
      });
      setCompressedBlob(compressed);
    } catch (error) {
      console.error("Compression failed:", error);
      setCompressedBlob(null);
    }
    setIsCompressing(false);
  };

  const handleSave = () => {
    if (useCompression && compressedBlob) {
      onSave(compressedBlob);
    } else {
      onSave(originalFile);
    }
  };

  const originalSize = originalFile?.size || 0;
  const compressedSize = compressedBlob?.size || 0;
  const savedPercentage = originalSize > 0 && compressedSize > 0 
    ? Math.round((1 - compressedSize / originalSize) * 100) 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto relative"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <div className="w-10" />
            </div>

            {/* Image Preview */}
            <div className="flex justify-center mb-4">
              {previewType === "avatar" ? (
                <img
                  src={imageSrc}
                  alt="Preview"
                  className="w-48 h-48 rounded-full object-cover ring-4 ring-primary/30"
                />
              ) : (
                <div className="w-full">
                  <p className="text-xs text-muted-foreground text-center mb-2">Landscape Preview</p>
                  <img
                    src={imageSrc}
                    alt="Header Preview"
                    className="w-full aspect-[16/5] rounded-lg object-cover ring-2 ring-primary/30"
                  />
                </div>
              )}
            </div>

            {/* Compression Options */}
            <div className="bg-secondary/30 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Compress Image</span>
                </div>
                <button
                  onClick={() => setUseCompression(!useCompression)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useCompression ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      useCompression ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Original size:</span>
                  <span className="font-medium">{formatFileSize(originalSize)}</span>
                </div>
                {useCompression && compressedBlob && !isCompressing && (
                  <>
                    <div className="flex justify-between">
                      <span>Compressed size:</span>
                      <span className="font-medium text-primary">{formatFileSize(compressedSize)}</span>
                    </div>
                    {savedPercentage > 0 && (
                      <div className="flex justify-between text-green-500">
                        <span>Space saved:</span>
                        <span className="font-medium">{savedPercentage}%</span>
                      </div>
                    )}
                  </>
                )}
                {isCompressing && (
                  <div className="text-primary animate-pulse">Compressing...</div>
                )}
              </div>
            </div>

            <Button
              variant="gaming"
              onClick={handleSave}
              className="w-full h-12 text-base"
              disabled={isSaving || isCompressing}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : isCompressing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Preparing image…
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save {title}
                </>
              )}
            </Button>

            {/* Full-modal saving overlay */}
            {isSaving && (
              <div className="absolute inset-0 z-10 rounded-3xl bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Uploading your photo…</p>
                <p className="text-xs text-muted-foreground">Please don't close this window</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
