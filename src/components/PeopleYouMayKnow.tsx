import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface SuggestedUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  mutual_followers?: number;
}

export const PeopleYouMayKnow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get users the current user is already following
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followedIds = new Set((followingData || []).map(f => f.following_id));
      followedIds.add(user.id); // Don't suggest self
      setFollowingIds(followedIds);

      // Get all users except those already followed
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .limit(50);

      if (!allProfiles) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Filter out already followed users and calculate mutual connections
      const suggestedUsers = await Promise.all(
        allProfiles
          .filter(p => !followedIds.has(p.id))
          .map(async (profile) => {
            // Count mutual followers (people who follow both users)
            const { count: mutualCount } = await supabase
              .from("follows")
              .select("*", { count: "exact", head: true })
              .eq("following_id", profile.id)
              .in("follower_id", Array.from(followedIds).filter(id => id !== user.id));

            return {
              ...profile,
              mutual_followers: mutualCount || 0,
            };
          })
      );

      // Sort by mutual followers and take top 10
      const sorted = suggestedUsers
        .sort((a, b) => (b.mutual_followers || 0) - (a.mutual_followers || 0))
        .slice(0, 10);

      setSuggestions(sorted);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;

    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: userId,
    });

    if (error) {
      toast({ title: "Failed to follow", variant: "destructive" });
      return;
    }

    toast({ title: "Following!" });
    setFollowingIds(prev => new Set([...prev, userId]));
    setSuggestions(prev => prev.filter(s => s.id !== userId));
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <section className="py-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">People You May Know</h2>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3">
          {suggestions.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-36 bg-card border border-border rounded-xl p-4 text-center"
            >
              <img
                src={person.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                alt={person.username || "User"}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/streamer/${person.id}`)}
              />
              <p 
                className="font-medium text-foreground text-sm truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/streamer/${person.id}`)}
              >
                @{person.username || "user"}
              </p>
              {person.mutual_followers && person.mutual_followers > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {person.mutual_followers} mutual
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => handleFollow(person.id)}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Follow
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
