import { useCallback } from "react";
import { useGamification } from "@/hooks/useGamification";

/**
 * Hook that provides action callbacks that automatically
 * update mission progress and award XP for common user actions.
 */
export const useGamificationActions = () => {
  const { addXP, updateMissionProgress } = useGamification();

  const onLikePost = useCallback(async () => {
    await addXP(5, "Liked a post");
    await updateMissionProgress("like_post", 1);
  }, [addXP, updateMissionProgress]);

  const onWatchReel = useCallback(async () => {
    await addXP(10, "Watched a reel");
    await updateMissionProgress("watch_reel", 1);
  }, [addXP, updateMissionProgress]);

  const onRateCreator = useCallback(async () => {
    await addXP(15, "Rated a creator");
    await updateMissionProgress("rate_creator", 1);
  }, [addXP, updateMissionProgress]);

  const onCreatePost = useCallback(async () => {
    await addXP(20, "Created a post");
    await updateMissionProgress("create_post", 1);
  }, [addXP, updateMissionProgress]);

  const onCreateReel = useCallback(async () => {
    await addXP(25, "Created a reel");
    await updateMissionProgress("create_reel", 1);
  }, [addXP, updateMissionProgress]);

  const onComment = useCallback(async () => {
    await addXP(5, "Commented");
    await updateMissionProgress("comment", 1);
  }, [addXP, updateMissionProgress]);

  const onFollow = useCallback(async () => {
    await addXP(10, "Followed a creator");
    await updateMissionProgress("follow_creator", 1);
  }, [addXP, updateMissionProgress]);

  return {
    onLikePost,
    onWatchReel,
    onRateCreator,
    onCreatePost,
    onCreateReel,
    onComment,
    onFollow,
  };
};
