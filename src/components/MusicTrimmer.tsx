import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Music, Play, Pause, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MusicTrimmerProps {
  audioSrc: string;
  duration: number;
  onSave: (startTime: number, endTime: number) => void;
  onCancel: () => void;
  maxDuration?: number;
}

export const MusicTrimmer = ({ 
  audioSrc, 
  duration, 
  onSave, 
  onCancel,
  maxDuration = 60 
}: MusicTrimmerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(duration, maxDuration));
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Audio waveform visualization bars
  const waveformBars = Array.from({ length: 40 }, () => Math.random() * 0.6 + 0.4);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= endTime) {
        audio.currentTime = startTime;
        audio.pause();
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [startTime, endTime]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.currentTime < startTime || audio.currentTime >= endTime) {
        audio.currentTime = startTime;
      }
      audio.play();
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
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
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
      setStartTime(Math.max(0, Math.min(newTime, maxStart)));
    } else if (isDraggingEnd) {
      const minEnd = startTime + 1;
      const maxEnd = Math.min(duration, startTime + maxDuration);
      setEndTime(Math.min(Math.max(newTime, minEnd), maxEnd));
    }
  }, [isDraggingStart, isDraggingEnd, duration, startTime, endTime, maxDuration]);

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
    <div className="bg-card rounded-2xl p-4 space-y-4 border border-border">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Music className="w-5 h-5 text-primary" />
          <span className="font-semibold">Trim Music</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatTime(trimmedDuration)} / {maxDuration}s max
        </span>
      </div>

      {/* Play button and waveform preview */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          )}
        </button>
        
        {/* Waveform visualization */}
        <div className="flex-1 h-12 flex items-center gap-0.5">
          {waveformBars.map((height, i) => {
            const barPosition = (i / waveformBars.length) * duration;
            const isInRange = barPosition >= startTime && barPosition <= endTime;
            const isPlayed = barPosition <= currentTime;
            
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isInRange 
                    ? isPlayed 
                      ? "bg-primary" 
                      : "bg-primary/40"
                    : "bg-muted"
                }`}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Timeline with handles */}
      <div className="space-y-2">
        <div 
          ref={timelineRef}
          className="relative h-14 bg-secondary rounded-lg overflow-hidden cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Background waveform */}
          <div className="absolute inset-0 flex items-center px-2 gap-0.5 opacity-30">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-muted-foreground rounded-full"
                style={{ height: `${height * 80}%` }}
              />
            ))}
          </div>

          {/* Selected area highlight */}
          <div
            className="absolute top-0 bottom-0 bg-primary/20"
            style={{
              left: `${(startTime / duration) * 100}%`,
              width: `${((endTime - startTime) / duration) * 100}%`,
            }}
          />

          {/* Start handle */}
          <motion.div
            className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize flex items-center justify-center rounded-l-lg touch-none z-10"
            style={{ left: `calc(${(startTime / duration) * 100}% - 6px)` }}
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            whileTap={{ scale: 1.1 }}
          >
            <div className="w-0.5 h-6 bg-primary-foreground rounded-full" />
          </motion.div>

          {/* End handle */}
          <motion.div
            className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize flex items-center justify-center rounded-r-lg touch-none z-10"
            style={{ left: `calc(${(endTime / duration) * 100}% - 6px)` }}
            onMouseDown={handleEndDrag}
            onTouchStart={handleEndDrag}
            whileTap={{ scale: 1.1 }}
          >
            <div className="w-0.5 h-6 bg-primary-foreground rounded-full" />
          </motion.div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
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
          Apply
        </Button>
      </div>
    </div>
  );
};
