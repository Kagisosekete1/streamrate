import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { TrendingStreamer } from "@/components/TrendingStreamer";
import { PostCard } from "@/components/PostCard";
import { NotificationBell } from "@/components/NotificationBell";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Streamer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  average_rating: number;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const POSTS_PER_PAGE = 10;

const Home = () => {
  const { user } = useAuth();
  const [trendingStreamers, setTrendingStreamers] = useState<Streamer[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreFollowing, setLoadingMoreFollowing] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const handleRefresh = useCallback(async () => {
    setPosts([]);
    setFollowingPosts([]);
    setHasMorePosts(true);
    setHasMoreFollowing(true);
    await fetchData();
  }, [user]);

  const { containerRef, isRefreshing, pullDistance, showIndicator } =
    usePullToRefresh({
      onRefresh: handleRefresh,
    });

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMorePosts) return;
    setLoadingMore(true);

    const offset = posts.length;
    const newPosts = await fetchPostsWithProfiles(null, offset);

    if (newPosts.length < POSTS_PER_PAGE) {
      setHasMorePosts(false);
    }
    setPosts((prev) => [...prev, ...newPosts]);
    setLoadingMore(false);
  }, [loadingMore, hasMorePosts, posts.length]);

  const loadMoreFollowingPosts = useCallback(async () => {
    if (loadingMoreFollowing || !hasMoreFollowing || !user) return;
    setLoadingMoreFollowing(true);

    const offset = followingPosts.length;
    const newPosts = await fetchFollowingPostsWithOffset(offset);

    if (newPosts.length < POSTS_PER_PAGE) {
      setHasMoreFollowing(false);
    }
    setFollowingPosts((prev) => [...prev, ...newPosts]);
    setLoadingMoreFollowing(false);
  }, [loadingMoreFollowing, hasMoreFollowing, followingPosts.length, user]);

  const { loadMoreRef: loadMoreAllRef } = useInfiniteScroll({
    onLoadMore: loadMorePosts,
    hasMore: hasMorePosts,
    isLoading: loadingMore,
  });

  const { loadMoreRef: loadMoreFollowingRef } = useInfiniteScroll({
    onLoadMore: loadMoreFollowingPosts,
    hasMore: hasMoreFollowing,
    isLoading: loadingMoreFollowing,
  });

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for posts
    const channel = supabase
      .channel("home-posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        () => {
          // Prepend new post instead of full refresh
          handleRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTrendingStreamers(),
      fetchPosts(),
      user ? fetchFollowingPosts() : Promise.resolve(),
    ]);
    setLoading(false);
  };

  const fetchTrendingStreamers = async () => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "streamer");

    const streamerIds = roleData?.map((r) => r.user_id) || [];

    if (streamerIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", streamerIds);

    const streamersWithRatings = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: ratings } = await supabase
          .from("ratings")
          .select("stars")
          .eq("streamer_id", profile.id);

        const avgRating =
          ratings && ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
            : 0;

        return {
          ...profile,
          average_rating: Math.round(avgRating * 10) / 10,
        };
      })
    );

    const sorted = streamersWithRatings
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 8);

    setTrendingStreamers(sorted);
  };

  const fetchPostsWithProfiles = async (
    postIds: string[] | null = null,
    offset: number = 0
  ) => {
    let query = supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (postIds) {
      if (postIds.length === 0) return [];
      query = query.in("id", postIds);
    }

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) return [];

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const postsWithCounts = await Promise.all(
      postsData.map(async (post) => {
        const { count: likesCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: commentsCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }

        const profile = profilesMap.get(post.user_id);

        return {
          ...post,
          profiles: profile
            ? { full_name: profile.full_name, avatar_url: profile.avatar_url }
            : null,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
        };
      })
    );

    return postsWithCounts;
  };

  const fetchPosts = async () => {
    const postsWithCounts = await fetchPostsWithProfiles(null, 0);
    setPosts(postsWithCounts);
    setHasMorePosts(postsWithCounts.length >= POSTS_PER_PAGE);
  };

  const fetchFollowingPostsWithOffset = async (offset: number = 0) => {
    if (!user) return [];

    const { data: followsData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = followsData?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) return [];

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (!postsData || postsData.length === 0) return [];

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const postsWithCounts = await Promise.all(
      postsData.map(async (post) => {
        const { count: likesCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: commentsCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        let isLiked = false;
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();
        isLiked = !!likeData;

        const profile = profilesMap.get(post.user_id);

        return {
          ...post,
          profiles: profile
            ? { full_name: profile.full_name, avatar_url: profile.avatar_url }
            : null,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
        };
      })
    );

    return postsWithCounts;
  };

  const fetchFollowingPosts = async () => {
    const postsWithCounts = await fetchFollowingPostsWithOffset(0);
    setFollowingPosts(postsWithCounts);
    setHasMoreFollowing(postsWithCounts.length >= POSTS_PER_PAGE);
  };

  const renderPosts = (
    postList: Post[],
    emptyMessage: string,
    loadMoreRef: React.RefObject<HTMLDivElement>,
    isLoadingMore: boolean,
    hasMore: boolean
  ) => {
    if (loading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Loading posts...
        </div>
      );
    }

    if (postList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {postList.map((post, index) => (
          <PostCard
            key={post.id}
            id={post.id}
            streamerId={post.user_id}
            streamerName={post.profiles?.full_name || "Anonymous"}
            streamerPicture={
              post.profiles?.avatar_url ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
            }
            content={post.content}
            imageUrl={post.image_url}
            likes={post.likes_count}
            comments={post.comments_count}
            createdAt={new Date(post.created_at)}
            isLiked={post.is_liked}
            index={index}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-1" />

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!hasMore && postList.length > 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No more posts to load
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background pb-20"
    >
      {/* Pull to refresh indicator */}
      {showIndicator && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold gradient-text">StreamRate</h1>
            </div>
            <NotificationBell />
          </div>
          <SearchBar placeholder="Search streamers, posts..." />
        </div>
      </header>

      {/* Content */}
      <main className="px-4">
        {/* Trending Section */}
        <section className="py-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            🔥 Trending Streamers
          </h2>
          {trendingStreamers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No streamers yet. Be the first to join!
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                {trendingStreamers.map((streamer, index) => (
                  <TrendingStreamer
                    key={streamer.id}
                    id={streamer.id}
                    name={streamer.full_name || "Anonymous"}
                    profilePicture={
                      streamer.avatar_url ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                    }
                    rank={index + 1}
                    averageRating={streamer.average_rating}
                    index={index}
                  />
                ))}
              </motion.div>
            </div>
          )}
        </section>

        {/* Feed with Tabs */}
        <section className="py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all" className="flex-1">
                📰 All Posts
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1" disabled={!user}>
                ❤️ Following
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {renderPosts(
                posts,
                "No posts yet. Create the first one!",
                loadMoreAllRef,
                loadingMore,
                hasMorePosts
              )}
            </TabsContent>

            <TabsContent value="following">
              {!user ? (
                <div className="text-center py-8 text-muted-foreground">
                  Sign in to see posts from streamers you follow
                </div>
              ) : (
                renderPosts(
                  followingPosts,
                  "No posts from people you follow. Start following streamers!",
                  loadMoreFollowingRef,
                  loadingMoreFollowing,
                  hasMoreFollowing
                )
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
