import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Search, TrendingUp, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Hashtag {
  id: string;
  name: string;
  use_count: number;
}

export const RightSidebar = () => {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [filteredHashtags, setFilteredHashtags] = useState<Hashtag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchHashtags = useCallback(async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("*")
      .order("use_count", { ascending: false })
      .limit(50);

    if (data) {
      setHashtags(data);
      setFilteredHashtags(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHashtags();

    // Set up realtime subscription
    const channel = supabase
      .channel("hashtags-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hashtags" },
        () => fetchHashtags()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHashtags]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredHashtags(
        hashtags.filter((tag) => tag.name.toLowerCase().includes(query))
      );
    } else {
      setFilteredHashtags(hashtags);
    }
  }, [searchQuery, hashtags]);

  return (
    <aside className="hidden lg:flex flex-col h-screen bg-background border-l border-border fixed right-0 top-0 z-30 w-72 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Trending Hashtags</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hashtags..."
            className="pl-10 pr-8 bg-secondary/80 border-border/50 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Hashtag List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredHashtags.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Hash className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No hashtags found" : "No trending hashtags yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {filteredHashtags.map((hashtag, index) => (
              <motion.button
                key={hashtag.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => navigate(`/hashtags/${hashtag.name}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-secondary/80 text-left group"
                )}
              >
                {/* Rank number */}
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 && "bg-yellow-500/20 text-yellow-500",
                    index === 1 && "bg-gray-400/20 text-gray-400",
                    index === 2 && "bg-amber-600/20 text-amber-600",
                    index > 2 && "bg-secondary text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>

                {/* Hashtag info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    #{hashtag.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hashtag.use_count} {hashtag.use_count === 1 ? "reel" : "reels"}
                  </p>
                </div>

                {/* Hash icon */}
                <Hash className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          to="/hashtags"
          className="flex items-center justify-center gap-2 w-full py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Hash className="w-4 h-4" />
          View All Hashtags
        </Link>
      </div>
    </aside>
  );
};
