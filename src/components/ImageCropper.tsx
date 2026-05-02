import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RotateCcw, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
}: ImageCropperProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropW = completedCrop.width * scaleX;
    const cropH = completedCrop.height * scaleY;

    // Handle rotation
    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotRad));
    const sin = Math.abs(Math.sin(rotRad));

    canvas.width = 1000;
    canvas.height = 1000;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotRad);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(
      image,
      cropX, cropY, cropW, cropH,
      0, 0, canvas.width, canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const resetCrop = () => {
    setZoom(1);
    setRotation(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
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
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={onClose}>
              <X className="w-6 h-6 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Crop Image</h2>
            <button onClick={resetCrop}>
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div className="w-full max-w-[min(90vw,720px)] flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-h-full"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[60vh] md:max-h-[70vh] max-w-full w-auto object-contain select-none"
                  draggable={false}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                />
              </ReactCrop>
            </div>
          </div>

          {/* Zoom & Rotate Controls */}
          <div className="px-4 py-3 border-t border-border space-y-3 bg-background">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={(v) => setZoom(v[0])}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <button
                onClick={rotateImage}
                className="ml-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom: {zoom.toFixed(1)}x</span>
              <span>Rotation: {rotation}°</span>
            </div>
          </div>

          <div
            className="p-4 border-t border-border bg-background sticky bottom-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <Button
              variant="gaming"
              onClick={handleCropComplete}
              className="w-full h-12 text-base"
              disabled={!completedCrop}
            >
              <Check className="w-5 h-5" />
              Save & Apply
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
