import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReelSkeletonProps {
  count?: number;
}

export const ReelSkeleton = ({ count = 9 }: ReelSkeletonProps) => {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="aspect-[9/16] relative overflow-hidden bg-secondary rounded-lg"
        >
          {/* Shimmer effect */}
          <div
            className={cn(
              "absolute inset-0",
              "bg-gradient-to-r from-transparent via-white/10 to-transparent",
              "animate-shimmer"
            )}
            style={{
              backgroundSize: "200% 100%",
            }}
          />
          
          {/* Fake content placeholders */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 space-y-1">
            {/* Avatar and username placeholder */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-white/10" />
              <div className="h-2 w-12 bg-white/10 rounded" />
            </div>
            {/* View count placeholder */}
            <div className="flex justify-end">
              <div className="h-2 w-8 bg-white/10 rounded" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Also export a single skeleton card for use elsewhere
export const ReelCardSkeleton = () => {
  return (
    <div className="aspect-[9/16] relative overflow-hidden bg-secondary rounded-lg">
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-transparent via-white/10 to-transparent",
          "animate-shimmer"
        )}
        style={{
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
};
