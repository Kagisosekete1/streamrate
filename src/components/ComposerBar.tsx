import { useNavigate } from "react-router-dom";
import { ImageIcon, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

export const ComposerBar = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const avatar = profile?.avatar_url || getDefaultAvatar();

  return (
    <div className="max-w-xl mx-auto px-4 pt-3">
      <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-sm">
        <img
          src={avatar}
          alt="You"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <button
          onClick={() => navigate("/create-post")}
          className="flex-1 text-left text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-full px-4 py-2 transition-colors"
        >
          What's on your mind?
        </button>
        <button
          onClick={() => navigate("/create-post")}
          aria-label="Add photo"
          className="p-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/create-reel")}
          aria-label="Add reel"
          className="p-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};