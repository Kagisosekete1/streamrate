import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Heart, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { TrendingStreamersSection } from "@/components/TrendingStreamersSection";
import { PostCard } from "@/components/PostCard";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { NewPostsBanner } from "@/components/NewPostsBanner";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
    fetchUnreadNotifications();

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

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadNotifications(count || 0);
  };

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
      .slice(0, 10);

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

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-12">
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

      {/* Header - Instagram style */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <img
            src="/logo.png"
            alt="StreamRate"
            className="h-8 w-auto cursor-pointer"
            onClick={() => navigate("/home")}
          />
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/notifications")}
              className="relative"
            >
              <Heart className="w-6 h-6 text-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <button onClick={() => navigate("/settings")}>
              <Settings className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Trending Streamers - Instagram stories style */}
      <TrendingStreamersSection trendingStreamers={trendingStreamers} />

      {/* Feed */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No posts yet</p>
            <p className="text-sm mt-1">Follow streamers to see their posts</p>
          </div>
        ) : (
          <>
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
            <div ref={loadMoreAllRef} className="h-1" />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!hasMorePosts && posts.length > 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                You're all caught up
              </div>
            )}
          </>
        )}
      </main>

      <PushNotificationPrompt />
      <BottomNav />
    </div>
  );
};

export default Home;