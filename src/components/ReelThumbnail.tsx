import { useState, useEffect, useRef } from "react";

interface ReelThumbnailProps {
  videoUrl: string;
  onClick: () => void;
}

export const ReelThumbnail = ({ videoUrl, onClick }: ReelThumbnailProps) => {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Extract a frame from the video using an offscreen video element
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = videoUrl;

    const handleSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 568;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setPosterUrl(dataUrl);
        }
      } catch {
        // CORS or other error - fallback to black bg
      }
      video.removeEventListener("seeked", handleSeeked);
      video.src = "";
      video.load();
    };

    const handleLoaded = () => {
      video.currentTime = 0.5;
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);

    // Timeout fallback
    const timeout = setTimeout(() => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
      video.src = "";
    }, 5000);

    return () => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
      video.src = "";
    };
  }, [videoUrl]);

  return (
    <div
      className="w-full h-full bg-secondary/50 cursor-pointer"
      onClick={onClick}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-secondary/80 animate-pulse" />
      )}
    </div>
  );
};
