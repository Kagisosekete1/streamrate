import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Hash,
  Sparkles,
  Scissors,
  X,
  Layers,
  Split,
  Check,
  Loader2,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReelTrimmer } from "@/components/ReelTrimmer";
import { MusicUploader } from "@/components/MusicUploader";
import { Progress } from "@/components/ui/progress";

interface DuetStitchState {
  mode: "duet" | "stitch";
  originalReelId: string;
  originalVideoUrl: string;
  originalCaption?: string;
  originalCreator?: string;
}

const CreateReel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const duetStitchState = location.state as DuetStitchState | null;

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);

  // Thumbnail state - simplified
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [useCustomThumbnail, setUseCustomThumbnail] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  // Music state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (customThumbnail) URL.revokeObjectURL(customThumbnail);
      thumbnails.forEach((t) => {
        if (t.startsWith("blob:")) URL.revokeObjectURL(t);
      });
    };
  }, []);

  // Generate thumbnails from video
  const generateThumbnails = useCallback(async (videoUrl: string, duration: number) => {
    setIsGeneratingThumbnails(true);
    const generatedThumbnails: string[] = [];

    try {
      const video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), 15000);
        video.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Video load error"));
        };
        video.load();
      });

      if (video.videoWidth === 0) {
        setIsGeneratingThumbnails(false);
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsGeneratingThumbnails(false);
        return;
      }

      canvas.width = 180;
      canvas.height = 320;

      const times = [0.1, duration * 0.25, duration * 0.5, duration * 0.75].filter(
        (t) => t < duration
      );

      for (const time of times) {
        try {
          video.currentTime = time;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              setTimeout(resolve, 100);
            };
            video.addEventListener("seeked", onSeeked);
            setTimeout(resolve, 3000); // Fallback timeout
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          if (dataUrl.length > 1000) {
            generatedThumbnails.push(dataUrl);
          }
        } catch (e) {
          console.warn("Thumbnail generation error:", e);
        }
      }

      video.src = "";
      video.load();
      canvas.remove();

      if (generatedThumbnails.length > 0) {
        setThumbnails(generatedThumbnails);
        setSelectedThumbnail(0);
      }
    } catch (error) {
      console.error("Error generating thumbnails:", error);
    } finally {
      setIsGeneratingThumbnails(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video under 100MB",
        variant: "destructive",
      });
      return;
    }

    // Clear previous state
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setThumbnails([]);
    setSelectedThumbnail(0);
    setCustomThumbnail(null);
    setCustomThumbnailFile(null);
    setUseCustomThumbnail(false);

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    // Get duration
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration;
      setVideoDuration(duration);
      setTrimEnd(Math.min(duration, 60));
      generateThumbnails(url, duration);
      tempVideo.remove();
    };
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setTrimEnd(Math.min(videoRef.current.duration, 60));
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTrimSave = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setShowTrimmer(false);
  };

  const handleThumbnailSelect = (index: number) => {
    setSelectedThumbnail(index);
    setUseCustomThumbnail(false);
  };

  const handleCustomThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    if (customThumbnail) URL.revokeObjectURL(customThumbnail);

    const url = URL.createObjectURL(file);
    setCustomThumbnail(url);
    setCustomThumbnailFile(file);
    setUseCustomThumbnail(true);
  };

  const handleMusicSelect = (file: File | null, startTime: number, endTime: number) => {
    setMusicFile(file);
    setMusicTrimStart(startTime);
    setMusicTrimEnd(endTime);
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1).toLowerCase()) : [];
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      // Upload video
      const videoFileName = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(videoFileName, videoFile);

      if (uploadError) {
        clearInterval(progressInterval);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from("reels").getPublicUrl(videoFileName);
      setUploadProgress(70);

      // Upload custom thumbnail if selected
      let thumbnailUrl: string | null = null;
      if (useCustomThumbnail && customThumbnailFile) {
        const thumbFileName = `${user.id}/thumbnails/${Date.now()}_thumb.jpg`;
        const { error: thumbError } = await supabase.storage
          .from("reels")
          .upload(thumbFileName, customThumbnailFile);

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from("reels")
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      setUploadProgress(85);

      // Upload music if provided
      let musicUrl: string | null = null;
      if (musicFile) {
        const musicFileName = `${user.id}/music/${Date.now()}_${musicFile.name}`;
        const { error: musicError } = await supabase.storage
          .from("reels")
          .upload(musicFileName, musicFile);

        if (!musicError) {
          const { data: musicUrlData } = supabase.storage
            .from("reels")
            .getPublicUrl(musicFileName);
          musicUrl = musicUrlData.publicUrl;
        }
      }

      setUploadProgress(95);

      // Caption with duet/stitch info
      let finalCaption = caption;
      if (duetStitchState) {
        const modeLabel = duetStitchState.mode === "duet" ? "Duet" : "Stitch";
        finalCaption = `${modeLabel} with @${duetStitchState.originalCreator || "user"}: ${caption}`;
      }

      // Create reel record
      const { data: reelData, error: reelError } = await supabase
        .from("reels")
        .insert({
          user_id: user.id,
          video_url: urlData.publicUrl,
          caption: finalCaption,
          duration: Math.round(trimEnd - trimStart),
        })
        .select()
        .single();

      clearInterval(progressInterval);

      if (reelError) throw reelError;

      setUploadProgress(98);

      // Process hashtags
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
          hashtagId = newTag?.id;
        }

        if (hashtagId) {
          await supabase.from("reel_hashtags").insert({
            reel_id: reelData.id,
            hashtag_id: hashtagId,
          });
        }
      }

      setUploadProgress(100);

      toast({
        title: "Reel uploaded!",
        description: "Your reel is now live",
      });

      setTimeout(() => navigate("/reels"), 500);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (customThumbnail) URL.revokeObjectURL(customThumbnail);
    setVideoFile(null);
    setVideoPreview(null);
    setIsPlaying(false);
    setThumbnails([]);
    setSelectedThumbnail(0);
    setCustomThumbnail(null);
    setCustomThumbnailFile(null);
    setUseCustomThumbnail(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {duetStitchState
              ? duetStitchState.mode === "duet"
                ? "Create Duet"
                : "Create Stitch"
              : "Create Reel"}
          </h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Duet/Stitch Info Banner */}
        {duetStitchState && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              {duetStitchState.mode === "duet" ? (
                <Layers className="w-6 h-6 text-primary" />
              ) : (
                <Split className="w-6 h-6 text-primary" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {duetStitchState.mode === "duet" ? "Duet Mode" : "Stitch Mode"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {duetStitchState.mode === "duet"
                    ? "Your video will appear side-by-side"
                    : "Original clip will play first, then yours"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 p-2 bg-secondary/50 rounded-xl">
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                <video
                  ref={originalVideoRef}
                  src={duetStitchState.originalVideoUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Original by</p>
                <p className="font-medium text-foreground text-sm truncate">
                  @{duetStitchState.originalCreator || "user"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Progress Overlay */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          >
            <div className="bg-card rounded-3xl p-8 w-full max-w-sm text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Uploading Reel</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Please wait while we upload your video...
              </p>
              <Progress value={uploadProgress} className="h-2 mb-3" />
              <p className="text-sm font-medium text-primary">{uploadProgress}%</p>
            </div>
          </motion.div>
        )}

        {/* Video + Thumbnails Side by Side */}
        <div className={`${videoPreview ? 'flex gap-4' : ''}`}>
          {/* Video Upload Area (Left) */}
          <div className={`relative ${videoPreview ? 'flex-1' : ''}`}>
            {!videoPreview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-[9/16] max-h-[60vh] rounded-3xl border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <p className="text-foreground font-semibold mb-1">Upload Video</p>
                <p className="text-sm text-muted-foreground text-center px-4">
                  Portrait mode recommended
                  <br />
                  Max 60 seconds · Max 100MB
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-[9/16] max-h-[60vh] rounded-3xl overflow-hidden bg-black relative"
              >
                <video
                  ref={videoRef}
                  src={videoPreview}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  muted={isMuted}
                  onLoadedMetadata={handleVideoLoad}
                  onClick={togglePlay}
                />

                {/* Play/Pause overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <AnimatePresence>
                    {!isPlaying && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center pointer-events-auto"
                        onClick={togglePlay}
                      >
                        <Play className="w-8 h-8 text-white ml-1" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTrimmer(true)}
                      className="px-4 py-2 rounded-full bg-black/50 flex items-center gap-2"
                    >
                      <Scissors className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">Trim</span>
                    </button>
                    <button
                      onClick={clearVideo}
                      className="w-10 h-10 rounded-full bg-destructive/80 flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
                  {Math.round(trimEnd - trimStart)}s / 60s
                </div>
              </motion.div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Thumbnail Selector (Right Side) */}
          {videoPreview && (
            <div className="w-28 flex-shrink-0 space-y-2">
              <div className="flex items-center gap-1">
                <Image className="w-4 h-4 text-primary" />
                <label className="font-medium text-foreground text-xs">Cover</label>
              </div>

              {isGeneratingThumbnails ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
                  <span className="text-[10px] text-muted-foreground">Generating...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Video frame thumbnails (minimum 3) */}
                  {thumbnails.slice(0, Math.max(3, thumbnails.length)).map((thumb, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleThumbnailSelect(index)}
                      className={`relative w-full aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all ${
                        !useCustomThumbnail && selectedThumbnail === index
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={thumb}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {!useCustomThumbnail && selectedThumbnail === index && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow-lg" />
                        </div>
                      )}
                      <div className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] text-white bg-black/60 rounded px-1 py-0.5 text-center">
                        {index === 0 ? "Start" : index === 1 ? "Mid" : "End"}
                      </div>
                    </motion.button>
                  ))}

                  {/* Custom upload button */}
                  <button
                    onClick={() => thumbnailInputRef.current?.click()}
                    className={`relative w-full aspect-[9/16] rounded-xl overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 ${
                      useCustomThumbnail && customThumbnail
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                        : "border-border hover:border-primary/50 bg-secondary/50"
                    }`}
                  >
                    {customThumbnail ? (
                      <>
                        <img
                          src={customThumbnail}
                          alt="Custom thumbnail"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {useCustomThumbnail && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground">Custom</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomThumbnailSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Music Upload removed - replaced by thumbnail picker on the side */}

        {/* Caption Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <label className="font-medium text-foreground">Caption</label>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption... Add #hashtags to help people discover your reel"
            className="w-full min-h-[100px] rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            maxLength={500}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hash className="w-4 h-4" />
              <span>{extractHashtags(caption).length} hashtags</span>
            </div>
            <span>{caption.length}/500</span>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          variant="gaming"
          size="lg"
          className="w-full"
          disabled={!videoFile || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {duetStitchState
                ? `Post ${duetStitchState.mode === "duet" ? "Duet" : "Stitch"}`
                : "Post Reel"}
            </>
          )}
        </Button>
      </div>

      {/* Trimmer Modal */}
      <AnimatePresence>
        {showTrimmer && videoPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <ReelTrimmer
                videoSrc={videoPreview}
                duration={videoDuration}
                onSave={handleTrimSave}
                onCancel={() => setShowTrimmer(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateReel;
