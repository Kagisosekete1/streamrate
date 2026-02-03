import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Image, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThumbnailUploaderProps {
  videoThumbnails: string[];
  isGenerating: boolean;
  onSelectVideoFrame: (index: number) => void;
  onUploadCustom: (file: File) => void;
  selectedIndex: number;
  customThumbnail: string | null;
  isCustomSelected: boolean;
}

export const ThumbnailUploader = ({
  videoThumbnails,
  isGenerating,
  onSelectVideoFrame,
  onUploadCustom,
  selectedIndex,
  customThumbnail,
  isCustomSelected,
}: ThumbnailUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setIsUploading(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    onUploadCustom(file);
    setIsUploading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        <label className="font-medium text-foreground">Choose Cover</label>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Generating thumbnails...</span>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Custom upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`relative flex-shrink-0 w-20 h-36 rounded-xl overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 ${
              isCustomSelected && customThumbnail
                ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                : "border-border hover:border-primary/50 bg-secondary/50"
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : customThumbnail ? (
              <>
                <img
                  src={customThumbnail}
                  alt="Custom thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isCustomSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 py-0.5 text-center">
                  Custom
                </div>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground text-center px-1">
                  Upload
                </span>
              </>
            )}
          </button>

          {/* Video frame thumbnails */}
          {videoThumbnails.map((thumb, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectVideoFrame(index)}
              className={`relative flex-shrink-0 w-20 h-36 rounded-xl overflow-hidden border-2 transition-all ${
                !isCustomSelected && selectedIndex === index
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={thumb}
                alt={`Frame ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!isCustomSelected && selectedIndex === index && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 py-0.5 text-center">
                {index === 0 ? "Start" : index === 1 ? "25%" : index === 2 ? "50%" : "75%"}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
