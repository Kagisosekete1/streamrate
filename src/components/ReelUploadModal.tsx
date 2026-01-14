import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Hash, TrendingUp, Film, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Hashtag {
  id: string;
  name: string;
  use_count: number;
}

export const ReelUploadModal = ({ isOpen, onClose, onSuccess }: ReelUploadModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [caption, setCaption] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTrendingHashtags();
    }
  }, [isOpen]);

  const fetchTrendingHashtags = async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .order("use_count", { ascending: false })
      .limit(10);
    
    if (data) {
      setTrendingHashtags(data);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a video
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please select a video file.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Check video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > 30) {
        toast({
          title: "Video too long",
          description: "Reels must be 30 seconds or less.",
          variant: "destructive",
        });
        return;
      }

      // Check aspect ratio (should be portrait - height > width)
      if (video.videoWidth > video.videoHeight) {
        toast({
          title: "Portrait only",
          description: "Reels must be in portrait orientation (vertical video).",
          variant: "destructive",
        });
        return;
      }

      setVideoFile(file);
      setVideoPreview(previewUrl);
      setVideoDuration(Math.round(video.duration));
    };
    video.src = previewUrl;
  };

  const handleAddHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, "").toLowerCase().trim();
    if (cleanTag && !selectedHashtags.includes(cleanTag)) {
      setSelectedHashtags([...selectedHashtags, cleanTag]);
    }
    setHashtagInput("");
    setShowHashtagSuggestions(false);
  };

  const handleRemoveHashtag = (tag: string) => {
    setSelectedHashtags(selectedHashtags.filter(t => t !== tag));
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hashtagInput.trim()) {
      e.preventDefault();
      handleAddHashtag(hashtagInput);
    }
  };

  const handleUploadReel = async () => {
    if (!user || !videoFile) return;

    setIsUploading(true);

    try {
      // Upload video to storage
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("reels")
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("reels")
        .getPublicUrl(fileName);

      // Create reel record
      const { data: reel, error: reelError } = await supabase
        .from("reels")
        .insert({
          user_id: user.id,
          video_url: urlData.publicUrl,
          caption: caption.trim() || null,
          duration: videoDuration,
        })
        .select()
        .single();

      if (reelError) throw reelError;

      // Handle hashtags
      for (const tag of selectedHashtags) {
        // Upsert hashtag
        const { data: existingHashtag } = await supabase
          .from("hashtags")
          .select("id, use_count")
          .eq("name", tag)
          .maybeSingle();

        let hashtagId: string;

        if (existingHashtag) {
          hashtagId = existingHashtag.id;
          await supabase
            .from("hashtags")
            .update({ use_count: existingHashtag.use_count + 1 })
            .eq("id", existingHashtag.id);
        } else {
          const { data: newHashtag } = await supabase
            .from("hashtags")
            .insert({ name: tag })
            .select()
            .single();
          
          if (newHashtag) {
            hashtagId = newHashtag.id;
          } else {
            continue;
          }
        }

        // Link hashtag to reel
        await supabase
          .from("reel_hashtags")
          .insert({
            reel_id: reel.id,
            hashtag_id: hashtagId,
          });
      }

      toast({
        title: "Reel uploaded!",
        description: "Your reel is now live.",
      });

      // Reset state
      setVideoFile(null);
      setVideoPreview(null);
      setVideoDuration(0);
      setCaption("");
      setSelectedHashtags([]);
      
      onSuccess?.();
      onClose();
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

  const handleClose = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setCaption("");
    setSelectedHashtags([]);
    onClose();
  };

  const filteredTrendingHashtags = trendingHashtags.filter(
    tag => !selectedHashtags.includes(tag.name) &&
           tag.name.toLowerCase().includes(hashtagInput.toLowerCase())
  );

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
            <button onClick={handleClose}>
              <X className="w-6 h-6 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Upload Reel</h2>
            <Button
              variant="gaming"
              size="sm"
              onClick={handleUploadReel}
              disabled={!videoFile || isUploading}
            >
              {isUploading ? "..." : "Post Reel"}
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Video Upload Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Video (Portrait, max 30s)</label>
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
                  className="w-full aspect-[9/16] max-h-96 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-3 bg-card"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Film className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-medium">Upload Reel</p>
                    <p className="text-sm text-muted-foreground">Portrait video, max 30 seconds</p>
                  </div>
                </button>
              ) : (
                <div className="relative">
                  <video
                    ref={videoPreviewRef}
                    src={videoPreview}
                    controls
                    className="w-full max-h-96 rounded-xl object-contain bg-black"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
                    {videoDuration}s
                  </div>
                  <button
                    onClick={() => {
                      if (videoPreview) URL.revokeObjectURL(videoPreview);
                      setVideoFile(null);
                      setVideoPreview(null);
                      setVideoDuration(0);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your reel..."
                className="w-full bg-card border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Hashtags
              </label>
              
              {/* Selected hashtags */}
              {selectedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      #{tag}
                      <button onClick={() => handleRemoveHashtag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Hashtag input */}
              <div className="relative">
                <Input
                  value={hashtagInput}
                  onChange={(e) => {
                    setHashtagInput(e.target.value);
                    setShowHashtagSuggestions(true);
                  }}
                  onFocus={() => setShowHashtagSuggestions(true)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder="Add hashtag..."
                  className="bg-card"
                />
                
                {/* Suggestions dropdown */}
                {showHashtagSuggestions && (hashtagInput || trendingHashtags.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {hashtagInput && !selectedHashtags.includes(hashtagInput.replace(/^#/, "").toLowerCase()) && (
                      <button
                        onClick={() => handleAddHashtag(hashtagInput)}
                        className="w-full px-4 py-2 text-left hover:bg-secondary flex items-center gap-2"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span>Create #{hashtagInput.replace(/^#/, "")}</span>
                      </button>
                    )}
                    
                    {filteredTrendingHashtags.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1 border-t border-border">
                          <TrendingUp className="w-3 h-3" />
                          Trending
                        </div>
                        {filteredTrendingHashtags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleAddHashtag(tag.name)}
                            className="w-full px-4 py-2 text-left hover:bg-secondary flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-primary" />
                              {tag.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{tag.use_count} uses</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Trending Hashtags Quick Add */}
            {trendingHashtags.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trending Hashtags
                </label>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.slice(0, 6).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddHashtag(tag.name)}
                      disabled={selectedHashtags.includes(tag.name)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedHashtags.includes(tag.name)
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      #{tag.name}
                      {selectedHashtags.includes(tag.name) && (
                        <Check className="w-3 h-3 ml-1 inline" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
