import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Upload, Play, Pause, Scissors, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MusicTrimmer } from "./MusicTrimmer";

interface MusicUploaderProps {
  onMusicSelect: (file: File | null, startTime: number, endTime: number) => void;
  maxDuration?: number;
}

export const MusicUploader = ({ onMusicSelect, maxDuration = 60 }: MusicUploaderProps) => {
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicDuration, setMusicDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (musicUrl) {
        URL.revokeObjectURL(musicUrl);
      }
    };
  }, [musicUrl]);

  // Handle playback loop within trim range
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= trimEnd && trimEnd > 0) {
        audio.currentTime = trimStart;
        audio.pause();
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [trimStart, trimEnd]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      return;
    }

    setIsLoading(true);

    // Cleanup previous URL
    if (musicUrl) {
      URL.revokeObjectURL(musicUrl);
    }

    const url = URL.createObjectURL(file);
    setMusicFile(file);
    setMusicUrl(url);

    // Get duration
    const audio = document.createElement("audio");
    audio.src = url;
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      setMusicDuration(duration);
      setTrimStart(0);
      setTrimEnd(Math.min(duration, maxDuration));
      onMusicSelect(file, 0, Math.min(duration, maxDuration));
      audio.remove();
      setIsLoading(false);
    };
    audio.onerror = () => {
      setIsLoading(false);
    };
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrimSave = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setShowTrimmer(false);
    if (musicFile) {
      onMusicSelect(musicFile, start, end);
    }
  };

  const removeMusic = () => {
    if (musicUrl) {
      URL.revokeObjectURL(musicUrl);
    }
    setMusicFile(null);
    setMusicUrl(null);
    setMusicDuration(0);
    setIsPlaying(false);
    setTrimStart(0);
    setTrimEnd(0);
    onMusicSelect(null, 0, 0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="w-5 h-5 text-primary" />
        <label className="font-medium text-foreground">Add Music (Optional)</label>
      </div>

      {musicUrl && <audio ref={audioRef} src={musicUrl} preload="metadata" />}

      {!musicFile ? (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full p-4 rounded-2xl border-2 border-dashed border-border bg-secondary/30 hover:border-primary/50 transition-colors flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Upload Audio</p>
                <p className="text-xs text-muted-foreground">MP3, WAV, M4A supported</p>
              </div>
            </>
          )}
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-secondary/50 border border-border"
        >
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
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

            {/* Music info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{musicFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(trimStart)} - {formatTime(trimEnd)} ({formatTime(trimEnd - trimStart)})
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTrimmer(true)}
                className="h-9 w-9"
              >
                <Scissors className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={removeMusic}
                className="h-9 w-9 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Simple waveform visualization */}
          <div className="mt-3 h-8 flex items-center gap-0.5 px-1">
            {Array.from({ length: 30 }, (_, i) => {
              const barPosition = (i / 30) * musicDuration;
              const isInRange = barPosition >= trimStart && barPosition <= trimEnd;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isInRange ? "bg-primary" : "bg-muted"
                  }`}
                  style={{ height: `${(Math.random() * 0.6 + 0.4) * 100}%` }}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Trimmer Modal */}
      <AnimatePresence>
        {showTrimmer && musicUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <MusicTrimmer
                audioSrc={musicUrl}
                duration={musicDuration}
                onSave={handleTrimSave}
                onCancel={() => setShowTrimmer(false)}
                maxDuration={maxDuration}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
