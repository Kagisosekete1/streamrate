import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReelTrimmer } from "@/components/ReelTrimmer";

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
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Duet/Stitch state from navigation
  const duetStitchState = location.state as DuetStitchState | null;

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);

  const videoRef = useRef<HTMLVideoElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video under 100MB",
        variant: "destructive",
      });
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setTrimEnd(Math.min(duration, 60));
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

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1).toLowerCase()) : [];
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    setIsUploading(true);

    try {
      // Upload video to storage
      const fileName = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(fileName, videoFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from("reels").getPublicUrl(fileName);

      // Determine caption based on mode
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

      if (reelError) {
        throw reelError;
      }

      // Process hashtags
      const hashtags = extractHashtags(caption);
      for (const tagName of hashtags) {
        // Upsert hashtag
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

        // Link hashtag to reel
        if (hashtagId) {
          await supabase.from("reel_hashtags").insert({
            reel_id: reelData.id,
            hashtag_id: hashtagId,
          });
        }
      }

      toast({
        title: "Reel uploaded!",
        description: "Your reel is now live",
      });

      navigate("/reels");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background">
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

            {/* Original video preview */}
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

        {/* Video Upload Area */}
        <div className="relative">
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
              />

              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
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
