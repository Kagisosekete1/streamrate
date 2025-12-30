import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <motion.div
      className="flex items-center justify-center py-4"
      style={{
        height: isRefreshing ? 60 : pullDistance,
        opacity: Math.min(progress, 1),
      }}
      animate={isRefreshing ? { height: 60 } : {}}
    >
      <motion.div
        animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
        transition={
          isRefreshing
            ? { repeat: Infinity, duration: 1, ease: "linear" }
            : { duration: 0 }
        }
      >
        <RefreshCw
          className={`w-6 h-6 ${
            progress >= 1 || isRefreshing ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </motion.div>
    </motion.div>
  );
};
