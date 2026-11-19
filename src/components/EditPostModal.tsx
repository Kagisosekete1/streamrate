import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { removeStorageMedia } from "@/lib/removeStorageMedia";

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  initialContent: string;
  initialImageUrl?: string | null;
  onSave: (content: string, imageUrl: string | null) => void;
}

export const EditPostModal = ({
  isOpen,
  onClose,
  postId,
  initialContent,
  initialImageUrl,
  onSave,
}: EditPostModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const trimmedContent = content.trim();
  const hasChanges = trimmedContent !== initialContent.trim() || imageUrl !== (initialImageUrl || null);

  useEffect(() => {
    if (!isOpen) return;
    setContent(initialContent);
    setImageUrl(initialImageUrl || null);
    setNewImageFile(null);
  }, [isOpen, initialContent, initialImageUrl]);

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Sign in to edit this post", variant: "destructive" });
      return;
    }
    if (!trimmedContent) {
      toast({ title: "Content cannot be empty", variant: "destructive" });
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    let uploadedImageUrl: string | null = null;
    try {
      let nextImageUrl = imageUrl;
      if (newImageFile) {
        const safeName = newImageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const objectPath = `${user.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(objectPath, newImageFile, { upsert: false });
        if (uploadError) throw uploadError;
        nextImageUrl = supabase.storage.from("post-images").getPublicUrl(objectPath).data.publicUrl;
        uploadedImageUrl = nextImageUrl;
      }

      const { data, error } = await supabase
        .from("posts")
        .update({ content: trimmedContent, image_url: nextImageUrl })
        .eq("id", postId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This post could not be found or you do not own it.");

      const oldImageUrl = initialImageUrl || null;
      if (oldImageUrl && oldImageUrl !== nextImageUrl) {
        try {
          await removeStorageMedia(oldImageUrl);
        } catch (cleanupError) {
          console.error("Unable to remove replaced post image from storage", cleanupError);
          toast({ title: "Post saved", description: "The previous image could not be removed from storage." });
        }
      }

      toast({ title: "Post saved" });
      onSave(trimmedContent, nextImageUrl);
      onClose();
    } catch (error) {
      console.error("Unable to save post edits", error);
      if (uploadedImageUrl) {
        try { await removeStorageMedia(uploadedImageUrl); } catch (cleanupError) {
          console.error("Unable to clean up an unused post image", cleanupError);
        }
      }
      toast({ title: "Failed to save post", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-2xl p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Post</h2>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full min-h-[120px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />

            {imageUrl && (
              <div className="relative mt-3">
                <img
                  src={imageUrl}
                  alt="Post"
                  className="w-full rounded-lg max-h-48 object-cover"
                />
                <button
                  onClick={() => {
                    setImageUrl(null);
                    setNewImageFile(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary/60">
              <Upload className="h-4 w-4" />
              {imageUrl ? "Replace image" : "Add image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setNewImageFile(file);
                    setImageUrl(URL.createObjectURL(file));
                  }
                  event.target.value = "";
                }}
              />
            </label>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="gaming"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
