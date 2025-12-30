import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

export const NewPostsBanner = ({ count, onClick }: NewPostsBannerProps) => {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <Button
            onClick={onClick}
            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-4 py-2"
          >
            <ArrowUp className="w-4 h-4" />
            {count} new {count === 1 ? "post" : "posts"} available
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
