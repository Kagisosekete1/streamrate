import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Hash, TrendingUp, Film, Play, Pause, Volume2, VolumeX, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ReelTrimmer } from "@/components/ReelTrimmer";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { user, profile } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [caption, setCaption] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

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

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please select a video file.",
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      // Max 60 seconds (1 minute)
      if (video.duration > 60) {
        toast({
          title: "Video too long",
          description: "Reels must be 60 seconds or less. You can trim it after selecting.",
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
      setOriginalDuration(video.duration);
      setTrimStart(0);
      setTrimEnd(Math.min(video.duration, 60));
    };
    video.src = previewUrl;
  };

  const handleTrimSave = (startTime: number, endTime: number) => {
    setTrimStart(startTime);
    setTrimEnd(endTime);
    setVideoDuration(Math.round(endTime - startTime));
    setShowTrimmer(false);
    toast({ title: "Trim applied!", description: `Video trimmed to ${Math.round(endTime - startTime)}s` });
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
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("reels")
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("reels")
        .getPublicUrl(fileName);

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

      setVideoFile(null);
      setVideoPreview(null);
      setVideoDuration(0);
      setCaption("");
      setSelectedHashtags([]);
      setShowTrimmer(false);
      
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
    setShowTrimmer(false);
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
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
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

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6 pb-8">
              {/* Video Upload Area */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Video (Portrait, max 60s)</label>
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
                    className="w-full aspect-[9/16] max-h-80 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-3 bg-card"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Film className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-medium">Upload Reel</p>
                      <p className="text-sm text-muted-foreground">Portrait video, max 60 seconds</p>
                    </div>
                  </button>
                ) : showTrimmer ? (
                  <ReelTrimmer
                    videoSrc={videoPreview}
                    duration={originalDuration}
                    onSave={handleTrimSave}
                    onCancel={() => setShowTrimmer(false)}
                  />
                ) : (
                  <div className="relative mx-auto" style={{ maxWidth: "260px" }}>
                    {/* Phone-like frame for preview - TikTok style */}
                    <div className="relative bg-black rounded-[2rem] p-1.5 shadow-2xl border-4 border-gray-800">
                      <div className="relative rounded-[1.5rem] overflow-hidden aspect-[9/16]">
                        <video
                          ref={videoPreviewRef}
                          src={videoPreview}
                          className="w-full h-full object-cover"
                          loop
                          playsInline
                          muted={isMuted}
                          onClick={() => {
                            if (videoPreviewRef.current) {
                              if (isPlaying) {
                                videoPreviewRef.current.pause();
                              } else {
                                videoPreviewRef.current.play();
                              }
                              setIsPlaying(!isPlaying);
                            }
                          }}
                        />
                        
                        {/* Play/Pause overlay button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (videoPreviewRef.current) {
                              if (isPlaying) {
                                videoPreviewRef.current.pause();
                              } else {
                                videoPreviewRef.current.play();
                              }
                              setIsPlaying(!isPlaying);
                            }
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <AnimatePresence mode="wait">
                            {!isPlaying && (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                              >
                                <Play className="w-8 h-8 text-white fill-white ml-1" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                        
                        {/* Duration badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                          {videoDuration}s
                        </div>
                        
                        {/* Preview badge */}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-primary/80 backdrop-blur-sm rounded-full text-primary-foreground text-xs font-medium">
                          Preview
                        </div>
                        
                        {/* Right side controls - like TikTok */}
                        <div className="absolute right-2 bottom-16 flex flex-col gap-3">
                          {/* Mute/Unmute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMuted(!isMuted);
                            }}
                            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                          >
                            {isMuted ? (
                              <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                              <Volume2 className="w-5 h-5 text-white" />
                            )}
                          </button>
                          
                          {/* Trim button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTrimmer(true);
                              setIsPlaying(false);
                              if (videoPreviewRef.current) {
                                videoPreviewRef.current.pause();
                              }
                            }}
                            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                          >
                            <Scissors className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        
                        {/* Bottom gradient overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                        
                        {/* Mock UI overlay - TikTok style */}
                        <div className="absolute bottom-3 left-3 right-12 space-y-2 pointer-events-none">
                          <div className="flex items-center gap-2">
                            <img 
                              src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face"} 
                              alt="You"
                              className="w-8 h-8 rounded-full object-cover border border-white"
                            />
                            <span className="text-white text-sm font-semibold">@{profile?.username || "you"}</span>
                          </div>
                          {caption && (
                            <p className="text-white/90 text-xs line-clamp-2">{caption}</p>
                          )}
                          {selectedHashtags.length > 0 && (
                            <p className="text-primary text-xs">
                              {selectedHashtags.map(t => `#${t}`).join(" ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => {
                        if (videoPreview) URL.revokeObjectURL(videoPreview);
                        setVideoFile(null);
                        setVideoPreview(null);
                        setVideoDuration(0);
                        setIsPlaying(false);
                        setShowTrimmer(false);
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 shadow-lg"
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
                  className="w-full bg-card border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
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
                                #{tag.name}
                              </span>
                              <span className="text-xs text-muted-foreground">{tag.use_count} reels</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Trending hashtags quick add */}
              {trendingHashtags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Trending Now
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.slice(0, 6).filter(t => !selectedHashtags.includes(t.name)).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddHashtag(tag.name)}
                        className="px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-full text-sm text-foreground transition-colors"
                      >
                        #{tag.name}
                      </button>
                    ))}
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
