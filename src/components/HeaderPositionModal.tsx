import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RotateCcw, Move, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (positionedImageBlob: Blob) => void;
}

export const HeaderPositionModal = ({
  isOpen,
  onClose,
  imageSrc,
  onSave,
}: HeaderPositionModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  // Header aspect ratio 16:5
  const aspectRatio = 16 / 5;

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.width / aspectRatio });
    }
  }, [isOpen]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerWidth / aspectRatio;

    // Calculate scale to cover the container
    const scaleX = containerWidth / img.naturalWidth;
    const scaleY = containerHeight / img.naturalHeight;
    const newScale = Math.max(scaleX, scaleY);

    const scaledWidth = img.naturalWidth * newScale;
    const scaledHeight = img.naturalHeight * newScale;

    setImageSize({ width: scaledWidth, height: scaledHeight });
    setContainerSize({ width: containerWidth, height: containerHeight });
    setScale(newScale);

    // Center the image initially
    setPosition({
      x: (containerWidth - scaledWidth) / 2,
      y: (containerHeight - scaledHeight) / 2,
    });
    setImageLoaded(true);
  }, [aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setStartPos({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    let newX = e.clientX - startPos.x;
    let newY = e.clientY - startPos.y;

    // Constrain to keep image within bounds
    const maxX = 0;
    const minX = containerSize.width - imageSize.width;
    const maxY = 0;
    const minY = containerSize.height - imageSize.height;

    newX = Math.min(maxX, Math.max(minX, newX));
    newY = Math.min(maxY, Math.max(minY, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, startPos, containerSize, imageSize]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    let newX = touch.clientX - startPos.x;
    let newY = touch.clientY - startPos.y;

    const maxX = 0;
    const minX = containerSize.width - imageSize.width;
    const maxY = 0;
    const minY = containerSize.height - imageSize.height;

    newX = Math.min(maxX, Math.max(minX, newX));
    newY = Math.min(maxY, Math.max(minY, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, startPos, containerSize, imageSize]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
      
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove]);

  const handleReset = () => {
    if (imageRef.current) {
      const containerWidth = containerRef.current?.clientWidth || 300;
      const containerHeight = containerWidth / aspectRatio;

      setPosition({
        x: (containerWidth - imageSize.width) / 2,
        y: (containerHeight - imageSize.height) / 2,
      });
    }
  };

  const handleSave = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Output dimensions for header (high resolution)
    const outputWidth = 1920;
    const outputHeight = Math.round(outputWidth / aspectRatio);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const img = imageRef.current;
    
    // Calculate source coordinates
    const scaleRatio = outputWidth / containerSize.width;
    const sourceX = (-position.x / scale);
    const sourceY = (-position.y / scale);
    const sourceWidth = containerSize.width / scale;
    const sourceHeight = containerSize.height / scale;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Position Header</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReset}
                className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button 
                onClick={handleSave}
                disabled={!imageLoaded}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="px-4 py-3 bg-secondary/50 flex items-center gap-2 justify-center">
            <Move className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Drag to position your header image</span>
          </div>

          {/* Image positioning area */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div
              ref={containerRef}
              className="relative w-full max-w-lg overflow-hidden rounded-xl border-2 border-primary/50"
              style={{ aspectRatio: `${aspectRatio}` }}
            >
              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/10" />
                  ))}
                </div>
              </div>

              {/* Draggable image */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Position preview"
                className="absolute select-none"
                style={{
                  left: position.x,
                  top: position.y,
                  width: imageSize.width || "auto",
                  height: imageSize.height || "auto",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onLoad={handleImageLoad}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                draggable={false}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="p-4 border-t border-border">
            <Button
              variant="gaming"
              onClick={handleSave}
              className="w-full"
            >
              <Check className="w-4 h-4" />
              Save Header
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
