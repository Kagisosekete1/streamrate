import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Image, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

const CreatePost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Write something to share with your fans!",
        variant: "destructive",
      });
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
            disabled={!content.trim()}
          >
            <Send className="w-4 h-4" />
            Post
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
              src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=face"
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

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-border/30 mt-4">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <Image className="w-5 h-5" />
              <span className="text-sm">Photo</span>
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-secondary/50 rounded-xl border border-border/30">
          <h3 className="text-sm font-semibold text-foreground mb-2">💡 Tips for great posts</h3>
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
