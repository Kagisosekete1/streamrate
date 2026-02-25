import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { OnlineIndicator } from "@/hooks/useOnlinePresence";

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  type: "post" | "reel";
}

interface LikeUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export const LikesModal = ({ isOpen, onClose, postId, type }: LikesModalProps) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikes();
    }
  }, [isOpen, postId]);

  const fetchLikes = async () => {
    setLoading(true);
    
    let likesData: { user_id: string }[] | null = null;
    let error: Error | null = null;
    
    if (type === "post") {
      const result = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId);
      likesData = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("reel_likes")
        .select("user_id")
        .eq("reel_id", postId);
      likesData = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error fetching likes:", error);
      setLoading(false);
      return;
    }

    const userIds = likesData?.map((like) => like.user_id) || [];
    
    if (userIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    setUsers(profilesData || []);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-card border border-border shadow-2xl max-h-[80vh] overflow-hidden flex flex-col mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-4 pb-3 pt-2 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Likes</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No likes yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onClose();
                      navigate(`/streamer/${user.id}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="relative">
                      <img
                        src={user.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                        alt={user.username || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <OnlineIndicator 
                        userId={user.id} 
                        className="absolute -bottom-0.5 -right-0.5"
                        size="sm"
                      />
                    </div>
                    <span className="font-medium text-foreground">
                      {user.username || "Anonymous"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
