import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { TrendingStreamersSection } from "@/components/TrendingStreamersSection";
import { TrendingHashtags } from "@/components/TrendingHashtags";
import { PostCard } from "@/components/PostCard";
import { NotificationBell } from "@/components/NotificationBell";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { NewPostsBanner } from "@/components/NewPostsBanner";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { PeopleYouMayKnow } from "@/components/PeopleYouMayKnow";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Streamer {
  id: string;
  username: string | null;
  avatar_url: string | null;
  average_rating: number;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
}

const POSTS_PER_PAGE = 10;

const Home = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [trendingStreamers, setTrendingStreamers] = useState<Streamer[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const latestPostId = useRef<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setPosts([]);
    setHasMorePosts(true);
    setNewPostsCount(0);
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

  const { loadMoreRef: loadMoreAllRef } = useInfiniteScroll({
    onLoadMore: loadMorePosts,
    hasMore: hasMorePosts,
    isLoading: loadingMore,
  });

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for new posts
    const postsChannel = supabase
      .channel("home-posts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        (payload) => {
          const newPostId = payload.new.id as string;
          if (latestPostId.current && newPostId !== latestPostId.current) {
            setNewPostsCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for profile changes
    const profilesChannel = supabase
      .channel("home-profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          // Refresh data when any profile changes
          fetchTrendingStreamers();
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTrendingStreamers(), fetchPosts()]);
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
      .select("id, username, avatar_url")
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
      .select("id, content, image_url, created_at, updated_at, user_id")
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
      .select("id, username, avatar_url")
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
        let isBookmarked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isLiked = !!likeData;

          const { data: bookmarkData } = await supabase
            .from("bookmarks")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isBookmarked = !!bookmarkData;
        }

        const profile = profilesMap.get(post.user_id);

        return {
          ...post,
          profiles: profile
            ? { username: profile.username, avatar_url: profile.avatar_url }
            : null,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
        };
      })
    );

    return postsWithCounts;
  };

  const fetchPosts = async () => {
    const postsWithCounts = await fetchPostsWithProfiles(null, 0);
    setPosts(postsWithCounts);
    setHasMorePosts(postsWithCounts.length >= POSTS_PER_PAGE);
    if (postsWithCounts.length > 0) {
      latestPostId.current = postsWithCounts[0].id;
    }
  };

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Loading posts...
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No posts yet. Create the first one!
        </div>
      );
    }

    return (
      <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            id={post.id}
            streamerId={post.user_id}
            streamerName={post.profiles?.username || "Anonymous"}
            streamerPicture={
              post.profiles?.avatar_url ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
            }
            content={post.content}
            imageUrl={post.image_url}
            likes={post.likes_count}
            comments={post.comments_count}
            createdAt={new Date(post.created_at)}
            updatedAt={post.updated_at ? new Date(post.updated_at) : undefined}
            isLiked={post.is_liked}
            isBookmarked={post.is_bookmarked}
            index={index}
            onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreAllRef} className="h-1 md:col-span-full" />

        {loadingMore && (
          <div className="flex justify-center py-4 md:col-span-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!hasMorePosts && posts.length > 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm md:col-span-full">
            No more posts to load
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-20">
      {/* Pull to refresh indicator */}
      {showIndicator && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
      )}

      {/* New posts banner */}
      {newPostsCount > 0 && (
        <NewPostsBanner count={newPostsCount} onClick={handleRefresh} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="StreamRate"
                className="w-8 h-8 rounded-lg"
              />
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
        <TrendingStreamersSection 
          trendingStreamers={trendingStreamers} 
        />

        {/* Trending Hashtags */}
        <TrendingHashtags />

        {/* People You May Know */}
        {user && <PeopleYouMayKnow />}

        {/* What's on your mind Section */}
        <section className="py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4 border border-border/50 mb-6"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarImage 
                  src={profile?.avatar_url || undefined} 
                  alt="Your avatar"
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => navigate("/create-post")}
                className="flex-1 text-left px-4 py-3 bg-secondary/50 rounded-xl text-muted-foreground hover:bg-secondary/70 transition-colors"
              >
                What's on your mind?
              </button>
            </div>
            <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/30">
              <Button variant="gaming" size="sm" onClick={() => navigate("/create-post")}>
                <PenSquare className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Feed */}
        <section className="py-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            📰 Latest Posts
          </h2>
          {renderPosts()}
        </section>
      </main>

      <PushNotificationPrompt />
      <BottomNav />
    </div>
  );
};

export default Home;