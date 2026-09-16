import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export const useSmartFeed = () => {
  const { user } = useAuth();

  // Mark posts as viewed
  const markPostsAsViewed = useCallback(async (postIds: string[]) => {
    if (!user || postIds.length === 0) return;
    const inserts = postIds.map(post_id => ({
      user_id: user.id,
      post_id,
    }));
    // Use upsert to ignore duplicates
    await supabase.from("post_views").upsert(inserts, { onConflict: "user_id,post_id" });
  }, [user]);

  // Fetch smart feed: unseen posts first, then scored by engagement + affinity
  const fetchSmartFeed = useCallback(async (
    blockedUserIds: string[],
    offset: number = 0
  ): Promise<Post[]> => {
    if (!user) return [];

    // 1. Get IDs of posts user has already seen
    const { data: viewedData } = await supabase
      .from("post_views")
      .select("post_id")
      .eq("user_id", user.id);
    const viewedPostIds = new Set((viewedData || []).map(v => v.post_id));

    // 2. Get who user follows (for affinity scoring)
    const { data: followsData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingIds = new Set((followsData || []).map(f => f.following_id));

    // 3. Get user's recent likes to understand content preferences
    const { data: recentLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    // Get user_ids of posts user liked (creators they engage with)
    let engagedCreatorIds = new Set<string>();
    if (recentLikes && recentLikes.length > 0) {
      const likedPostIds = recentLikes.map(l => l.post_id);
      const { data: likedPosts } = await supabase
        .from("posts")
        .select("user_id")
        .in("id", likedPostIds);
      engagedCreatorIds = new Set((likedPosts || []).map(p => p.user_id));
    }

    // 4. Fetch a larger batch of recent posts to score
    const fetchSize = Math.max(50, offset + POSTS_PER_PAGE * 3);
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, updated_at, user_id, is_private")
      .order("created_at", { ascending: false })
      .limit(fetchSize);

    if (!postsData || postsData.length === 0) return [];

    // Filter blocked users
    const filtered = postsData.filter(p => !blockedUserIds.includes(p.user_id));

    // 5. Score each post
    const scored = filtered.map(post => {
      let score = 0;

      // Unseen posts get massive boost
      if (!viewedPostIds.has(post.id)) {
        score += 1000;
      }

      // Posts from followed users get high priority
      if (followingIds.has(post.user_id)) {
        score += 200;
      }

      // Posts from creators user frequently likes
      if (engagedCreatorIds.has(post.user_id)) {
        score += 150;
      }

      // Recency boost (newer = higher)
      const ageHours = (Date.now() - new Date(post.created_at!).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 100 - ageHours * 2); // decays over ~50 hours

      // Fresh-post priority: anything under 24h gets a strong lift so newest sits on top
      if (ageHours < 24) {
        score += 800 - ageHours * 20; // 800 at t=0, ~320 at 24h
      }

      // Own posts get slight boost so user sees their content
      if (post.user_id === user.id) {
        score += 50;
      }

      return { ...post, _score: score };
    });

    // Sort by score
    scored.sort((a, b) => b._score - a._score);

    // Paginate
    const page = scored.slice(offset, offset + POSTS_PER_PAGE);
    if (page.length === 0) return [];

    // 6. Enrich with profiles and counts
    const userIds = [...new Set(page.map(p => p.user_id))];
    const postIds = page.map(p => p.id);

    const [
      { data: profilesData },
      { data: likesData },
      { data: commentsData },
      { data: userLikes },
      { data: userBookmarks },
    ] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url, signup_number, manual_verification_badge, manual_verification_expires_at").in("id", userIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id),
      supabase.from("bookmarks").select("post_id").in("post_id", postIds).eq("user_id", user.id),
    ]);

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    
    // Count likes per post
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach(l => { likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1; });
    
    const commentsCount: Record<string, number> = {};
    (commentsData || []).forEach(c => { commentsCount[c.post_id] = (commentsCount[c.post_id] || 0) + 1; });

    const userLikedSet = new Set((userLikes || []).map(l => l.post_id));
    const userBookmarkedSet = new Set((userBookmarks || []).map(b => b.post_id));

    const enriched: Post[] = page.map(post => {
      const profile = profilesMap.get(post.user_id);
      return {
        id: post.id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at!,
        updated_at: post.updated_at,
        user_id: post.user_id,
        is_private: post.is_private,
        profiles: profile
          ? { username: profile.username, avatar_url: profile.avatar_url, email: null, manual_verification_badge: (profile as any).manual_verification_badge ?? null, manual_verification_expires_at: (profile as any).manual_verification_expires_at ?? null, signup_number: profile.signup_number }
          : null,
        likes_count: likesCount[post.id] || 0,
        comments_count: commentsCount[post.id] || 0,
        is_liked: userLikedSet.has(post.id),
        is_bookmarked: userBookmarkedSet.has(post.id),
      };
    });

    // Auto-mark these posts as viewed
    await markPostsAsViewed(postIds);

    return enriched;
  }, [user, markPostsAsViewed]);

  return { fetchSmartFeed, markPostsAsViewed };
};
