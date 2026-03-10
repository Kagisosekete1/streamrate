import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { TrendingStreamersSection } from "@/components/TrendingStreamersSection";
import { PostCard } from "@/components/PostCard";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { NewPostsBanner } from "@/components/NewPostsBanner";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

import { StreamiiAi } from "@/components/StreamiiAi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { getDefaultAvatar } from "@/utils/defaultAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { useOnAppRefresh } from "@/hooks/useAppVisibility";

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
  is_private: boolean;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    email: string | null;
    signup_number: number | null;
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
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const latestPostId = useRef<string | null>(null);

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return;
    const { data: blockedByMe } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    
    const { data: blockedMe } = await supabase
      .from("blocked_users")
      .select("blocker_id")
      .eq("blocked_id", user.id);
    
    const ids = [
      ...(blockedByMe || []).map(b => b.blocked_id),
      ...(blockedMe || []).map(b => b.blocker_id),
    ];
    setBlockedUserIds(ids);
    return ids;
  }, [user]);

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

  // Try to restore cached feed on mount, only fetch fresh if no cache
  useEffect(() => {
    const cached = sessionStorage.getItem('home-feed-cache');
    if (cached) {
      try {
        const { posts: cachedPosts, streamers, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Use cache if less than 30 min old
        if (age < 30 * 60 * 1000 && cachedPosts?.length > 0) {
          setPosts(cachedPosts.map((p: any) => ({
            ...p,
            // Dates come back as strings from JSON
          })));
          setTrendingStreamers(streamers || []);
          setHasMorePosts(cachedPosts.length >= POSTS_PER_PAGE);
          if (cachedPosts.length > 0) {
            latestPostId.current = cachedPosts[0].id;
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        // Invalid cache, proceed with fresh fetch
      }
    }
    fetchData();
  }, [user]);

  // Cache posts whenever they change
  useEffect(() => {
    if (posts.length > 0) {
      sessionStorage.setItem('home-feed-cache', JSON.stringify({
        posts,
        streamers: trendingStreamers,
        timestamp: Date.now(),
      }));
    }
  }, [posts, trendingStreamers]);

  // Listen for the 30-min-away refresh event
  useOnAppRefresh(useCallback(() => {
    fetchData();
  }, [user]));

  // Realtime subscriptions (only for new post banners & profile updates)
  useEffect(() => {
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
        }
      )
      .subscribe();

    const ratingsChannel = supabase
      .channel("home-ratings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
        },
        () => {
          fetchTrendingStreamers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ratingsChannel);
    };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await fetchBlockedUsers();
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
      .select("id, content, image_url, created_at, updated_at, user_id, is_private")
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (postIds) {
      if (postIds.length === 0) return [];
      query = query.in("id", postIds);
    }

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) return [];

    // Filter out blocked users' posts
    const filteredPosts = postsData.filter(p => !blockedUserIds.includes(p.user_id));

    const userIds = [...new Set(filteredPosts.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, email, signup_number")
      .in("id", userIds);

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const postsWithCounts = await Promise.all(
      filteredPosts.map(async (post) => {
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
            ? { username: profile.username, avatar_url: profile.avatar_url, email: profile.email, signup_number: profile.signup_number }
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
    <AppLayout>
      <div ref={containerRef} className="min-h-screen bg-background pb-12 md:pb-0">
        {showIndicator && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
          />
        )}

        {newPostsCount > 0 && (
          <NewPostsBanner count={newPostsCount} onClick={handleRefresh} />
        )}

        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border md:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <img
              src="/logo.png"
              alt="StreamRate"
              className="h-8 w-auto cursor-pointer"
              onClick={() => navigate("/home")}
            />
            <NotificationBell />
          </div>
        </header>

        <TrendingStreamersSection trendingStreamers={trendingStreamers} />

        <main className="max-w-xl mx-auto">
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
                    getDefaultAvatar()
                  }
                  content={post.content}
                  imageUrl={post.image_url}
                  likes={post.likes_count}
                  comments={post.comments_count}
                  createdAt={new Date(post.created_at)}
                  updatedAt={post.updated_at ? new Date(post.updated_at) : undefined}
                  isLiked={post.is_liked}
                  isBookmarked={post.is_bookmarked}
                  isPrivate={post.is_private}
                  streamerEmail={post.profiles?.email}
                  signupNumber={post.profiles?.signup_number}
                  index={index}
                  onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                />
              ))}

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
        <StreamiiAi />
      </div>
    </AppLayout>
  );
};

export default Home;
