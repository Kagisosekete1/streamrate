import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Follower {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  title?: string;
}

export const FollowersModal = ({
  isOpen,
  onClose,
  userId,
  type,
  title,
}: FollowersModalProps) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);

    if (type === "followers") {
      // Fetch people who follow this user
      const { data: followsData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (followsData && followsData.length > 0) {
        const followerIds = followsData.map((f) => f.follower_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followerIds);

        setUsers(profilesData || []);
      } else {
        setUsers([]);
      }
    } else {
      // Fetch people this user follows
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (followsData && followsData.length > 0) {
        const followingIds = followsData.map((f) => f.following_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followingIds);

        setUsers(profilesData || []);
      } else {
        setUsers([]);
      }
    }

    setLoading(false);
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/streamer/${userId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl overflow-hidden border border-border shadow-2xl max-h-[70vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {title || (type === "followers" ? "Followers" : "Following")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-primary">Loading...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {type === "followers"
                      ? "No followers yet"
                      : "Not following anyone yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <motion.button
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleUserClick(user.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                    >
                      <img
                        src={
                          user.avatar_url ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                        }
                        alt={user.username || user.full_name || "User"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {user.username || user.full_name || "Anonymous"}
                        </h3>
                        {user.full_name && user.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            {user.full_name}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
