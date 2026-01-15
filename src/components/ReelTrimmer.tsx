import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Scissors, Play, Pause, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReelTrimmerProps {
  videoSrc: string;
  duration: number;
  onSave: (startTime: number, endTime: number) => void;
  onCancel: () => void;
}

export const ReelTrimmer = ({ videoSrc, duration, onSave, onCancel }: ReelTrimmerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(duration, 60));
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate thumbnails positions
  const thumbnailCount = 10;
  const thumbnails = Array.from({ length: thumbnailCount }, (_, i) => (i / thumbnailCount) * duration);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
        video.pause();
        setIsPlaying(false);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [startTime, endTime]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingStart || isDraggingEnd) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    if (newTime >= startTime && newTime <= endTime) {
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  };

  const handleStartDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingStart(true);
  }, []);

  const handleEndDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingEnd(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    if (isDraggingStart) {
      const maxStart = Math.max(0, endTime - 1);
      setStartTime(Math.min(newTime, maxStart));
    } else if (isDraggingEnd) {
      const minEnd = Math.min(duration, Math.max(startTime + 1, 60));
      setEndTime(Math.min(Math.max(newTime, startTime + 1), minEnd));
    }
  }, [isDraggingStart, isDraggingEnd, duration, startTime, endTime]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
  }, []);

  useEffect(() => {
    if (isDraggingStart || isDraggingEnd) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleMouseMove);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDraggingStart, isDraggingEnd, handleMouseMove, handleMouseUp]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const trimmedDuration = endTime - startTime;

  return (
    <div className="bg-black/90 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="font-semibold">Trim Video</span>
        </div>
        <span className="text-sm text-white/70">
          {formatTime(trimmedDuration)} / 60s max
        </span>
      </div>

      {/* Video Preview */}
      <div className="relative aspect-[9/16] max-h-60 mx-auto rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain bg-black"
          playsInline
          muted
        />
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          {!isPlaying && (
            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          )}
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div 
          ref={timelineRef}
          className="relative h-16 bg-muted/30 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Thumbnail preview strip */}
          <div className="absolute inset-0 flex">
            {thumbnails.map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-r from-muted/50 to-muted/30"
                style={{ opacity: 0.5 + (i % 2) * 0.2 }}
              />
            ))}
          </div>

          {/* Trimmed area highlight */}
          <div
            className="absolute top-0 bottom-0 bg-primary/30 border-x-2 border-primary"
            style={{
              left: `${(startTime / duration) * 100}%`,
              width: `${((endTime - startTime) / duration) * 100}%`,
            }}
          />

          {/* Start handle */}
          <motion.div
            className="absolute top-0 bottom-0 w-4 bg-primary cursor-ew-resize flex items-center justify-center rounded-l-lg touch-none"
            style={{ left: `calc(${(startTime / duration) * 100}% - 8px)` }}
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            whileTap={{ scale: 1.1 }}
          >
            <div className="w-1 h-8 bg-white rounded-full" />
          </motion.div>

          {/* End handle */}
          <motion.div
            className="absolute top-0 bottom-0 w-4 bg-primary cursor-ew-resize flex items-center justify-center rounded-r-lg touch-none"
            style={{ left: `calc(${(endTime / duration) * 100}% - 8px)` }}
            onMouseDown={handleEndDrag}
            onTouchStart={handleEndDrag}
            whileTap={{ scale: 1.1 }}
          >
            <div className="w-1 h-8 bg-white rounded-full" />
          </motion.div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-white/70 px-1">
          <span>{formatTime(startTime)}</span>
          <span className="text-primary font-medium">{formatTime(currentTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          variant="gaming"
          className="flex-1"
          onClick={() => onSave(startTime, endTime)}
        >
          <Check className="w-4 h-4 mr-2" />
          Apply Trim
        </Button>
      </div>
    </div>
  );
};
