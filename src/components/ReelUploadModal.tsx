import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Hash, Film, Play, Pause, Volume2, VolumeX, Scissors, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ReelTrimmer } from "@/components/ReelTrimmer";
import { MusicUploader } from "@/components/MusicUploader";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReelUploadModal = ({ isOpen, onClose, onSuccess }: ReelUploadModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);

  // Music state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(0);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please select a video file.", variant: "destructive" });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select a video under 100MB.", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(file);

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration;

      if (dur > 300) {
        toast({ title: "Video too long", description: "Please select a shorter video. You can trim it after.", variant: "destructive" });
        URL.revokeObjectURL(url);
        return;
      }

      setVideoFile(file);
      setVideoPreview(url);
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 60));
      tempVideo.remove();
    };
    tempVideo.src = url;
  };

  const togglePlay = () => {
    const video = videoPreviewRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrimSave = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setVideoDuration(end - start);
    setShowTrimmer(false);
    toast({ title: "Trim applied!", description: `Video trimmed to ${Math.round(end - start)}s` });
  };

  const handleMusicSelect = (file: File | null, startTime: number, endTime: number) => {
    setMusicFile(file);
    setMusicTrimStart(startTime);
    setMusicTrimEnd(endTime);
  };

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#(\w+)/g);
    return matches ? matches.map((tag) => tag.substring(1).toLowerCase()) : [];
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      // Upload video
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(fileName, videoFile);

      if (uploadError) {
        clearInterval(progressInterval);
        throw uploadError;
      }

      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from("reels").getPublicUrl(fileName);

      // Upload music if provided
      let musicUrl: string | null = null;
      if (musicFile) {
        const musicFileName = `${user.id}/music/${Date.now()}_${musicFile.name}`;
        const { error: musicError } = await supabase.storage
          .from("reels")
          .upload(musicFileName, musicFile);
        if (!musicError) {
          const { data: musicUrlData } = supabase.storage.from("reels").getPublicUrl(musicFileName);
          musicUrl = musicUrlData.publicUrl;
        }
      }

      setUploadProgress(85);

      // Create reel record
      const { data: reel, error: reelError } = await supabase
        .from("reels")
        .insert({
          user_id: user.id,
          video_url: urlData.publicUrl,
          caption: caption.trim() || null,
          duration: Math.round(trimEnd - trimStart),
        })
        .select()
        .single();

      if (reelError) throw reelError;

      setUploadProgress(95);

      // Process hashtags from caption
      const hashtags = extractHashtags(caption);
      for (const tagName of hashtags) {
        const { data: existingTag } = await supabase
          .from("hashtags")
          .select("id, use_count")
          .eq("name", tagName)
          .maybeSingle();

        let hashtagId: string;
        if (existingTag) {
          await supabase
            .from("hashtags")
            .update({ use_count: existingTag.use_count + 1 })
            .eq("id", existingTag.id);
          hashtagId = existingTag.id;
        } else {
          const { data: newTag } = await supabase
            .from("hashtags")
            .insert({ name: tagName })
            .select()
            .single();
          if (!newTag) continue;
          hashtagId = newTag.id;
        }

        await supabase.from("reel_hashtags").insert({
          reel_id: reel.id,
          hashtag_id: hashtagId,
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({ title: "Reel uploaded!", description: "Your reel is now live." });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setCaption("");
    setIsPlaying(false);
    setShowTrimmer(false);
    setTrimStart(0);
    setTrimEnd(60);
    setMusicFile(null);
    setMusicTrimStart(0);
    setMusicTrimEnd(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const trimmedDuration = Math.round(trimEnd - trimStart);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 bg-background">
            <button onClick={handleClose} className="p-1">
              <X className="w-6 h-6 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Upload Reel</h2>
            <Button
              variant="gaming"
              size="sm"
              onClick={handleUpload}
              disabled={!videoFile || isUploading}
            >
              {isUploading ? "..." : "Post"}
            </Button>
          </div>

          {/* Upload Progress Overlay */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-8"
            >
              <div className="bg-card rounded-3xl p-8 w-full max-w-sm text-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Uploading Reel</h2>
                <p className="text-muted-foreground text-sm mb-6">Please wait while we upload your video...</p>
                <Progress value={uploadProgress} className="h-2 mb-3" />
                <p className="text-sm font-medium text-primary">{uploadProgress}%</p>
              </div>
            </motion.div>
          )}

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 pb-8 space-y-6 max-w-lg mx-auto">
              {/* Video Upload / Preview */}
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                ref={videoInputRef}
                className="hidden"
              />

              {!videoPreview ? (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-[50vh] rounded-2xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-3 bg-card"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Film className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-foreground font-medium">Upload Video</p>
                    <p className="text-sm text-muted-foreground">Portrait mode · Max 60s</p>
                  </div>
                </button>
              ) : showTrimmer ? (
                <ReelTrimmer
                  videoSrc={videoPreview}
                  duration={videoDuration}
                  onSave={handleTrimSave}
                  onCancel={() => setShowTrimmer(false)}
                />
              ) : (
                <div className="relative aspect-[9/16] max-h-[50vh] rounded-2xl overflow-hidden bg-black mx-auto">
                  <video
                    ref={videoPreviewRef}
                    src={videoPreview}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlay}
                  />

                  {/* Play overlay */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Duration badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded-full text-white text-xs font-medium">
                    {trimmedDuration}s / 60s
                  </div>

                  {/* Bottom controls */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                      className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTrimmer(true);
                          if (videoPreviewRef.current) videoPreviewRef.current.pause();
                        }}
                        className="px-3 py-1.5 rounded-full bg-black/50 flex items-center gap-1.5"
                      >
                        <Scissors className="w-4 h-4 text-white" />
                        <span className="text-white text-xs">Trim</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetForm();
                        }}
                        className="w-9 h-9 rounded-full bg-destructive/80 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Music Upload - only when video is selected */}
              {videoPreview && !showTrimmer && (
                <MusicUploader
                  onMusicSelect={handleMusicSelect}
                  maxDuration={trimmedDuration}
                />
              )}

              {/* Caption */}
              {videoPreview && !showTrimmer && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption... Add #hashtags to help people discover your reel"
                    className="w-full min-h-[100px] rounded-xl border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{extractHashtags(caption).length} hashtags</span>
                    <span>{caption.length}/500</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
