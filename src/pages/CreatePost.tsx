import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Image, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CreatePost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to create a post.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Write something to share with your fans!",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    let imageUrl = null;

    // Upload image if selected
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("post-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        toast({
          title: "Image upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    // Create post
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl,
    });

    if (error) {
      toast({
        title: "Failed to create post",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Post created!",
      description: "Your post is now live.",
    });
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Create Post</h1>
          <Button
            variant="gaming"
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border/50 p-4"
        >
          <div className="flex items-start gap-3">
            <img
              src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Share with your fans..."
                className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[120px]"
                autoFocus
              />
            </div>
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-lg max-h-64 object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-border/30 mt-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Image className="w-5 h-5" />
              <span className="text-sm">Upload Photo</span>
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-secondary/50 rounded-xl border border-border/30">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            💡 Tips for great posts
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Share updates about your streams</li>
            <li>• Engage with your community</li>
            <li>• Announce upcoming events</li>
            <li>• Show behind-the-scenes content</li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CreatePost;
