import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Image } from "lucide-react";

interface ThumbnailSelectorProps {
  videoSrc: string;
  duration: number;
  onSelect: (thumbnailUrl: string, timestamp: number) => void;
  selectedTimestamp?: number;
}

export const ThumbnailSelector = ({ 
  videoSrc, 
  duration, 
  onSelect,
  selectedTimestamp = 0 
}: ThumbnailSelectorProps) => {
  const [thumbnails, setThumbnails] = useState<{ url: string; timestamp: number }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    generateThumbnails();
    return () => {
      thumbnails.forEach(t => URL.revokeObjectURL(t.url));
    };
  }, [videoSrc, duration]);

  const generateThumbnails = async () => {
    setLoading(true);
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoSrc;
    video.muted = true;
    video.preload = "metadata";

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      setLoading(false);
      return;
    }

    // Set canvas size (thumbnail size)
    canvas.width = 160;
    canvas.height = 284; // 9:16 ratio

    const videoDuration = video.duration;
    const timestamps = [
      0,
      videoDuration * 0.25,
      videoDuration * 0.5,
      videoDuration * 0.75
    ];

    const newThumbnails: { url: string; timestamp: number }[] = [];

    for (const timestamp of timestamps) {
      video.currentTime = timestamp;
      
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob URL
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.8);
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        newThumbnails.push({ url, timestamp });
      }
    }

    setThumbnails(newThumbnails);
    setLoading(false);

    // Select first thumbnail by default
    if (newThumbnails.length > 0) {
      onSelect(newThumbnails[0].url, newThumbnails[0].timestamp);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const thumbnail = thumbnails[index];
    if (thumbnail) {
      onSelect(thumbnail.url, thumbnail.timestamp);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          Choose Thumbnail
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="aspect-[9/16] rounded-lg bg-secondary animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Image className="w-4 h-4 text-primary" />
        Choose Thumbnail
      </label>
      <div className="grid grid-cols-4 gap-2">
        {thumbnails.map((thumbnail, index) => (
          <motion.button
            key={index}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(index)}
            className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors ${
              selectedIndex === index 
                ? "border-primary" 
                : "border-transparent hover:border-border"
            }`}
          >
            <img 
              src={thumbnail.url} 
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {selectedIndex === index && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}
            
            {/* Timestamp label */}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
              {Math.floor(thumbnail.timestamp)}s
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Select a frame to use as cover
      </p>
    </div>
  );
};
