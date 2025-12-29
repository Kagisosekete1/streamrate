import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { StreamerCard } from "@/components/StreamerCard";
import { mockStreamers } from "@/data/mockData";

const Streamers = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground mb-4"
          >
            Discover Streamers
          </motion.h1>
          <SearchBar placeholder="Search by name, country..." />
        </div>
      </header>

      {/* Streamers List */}
      <main className="px-4 py-4">
        <p className="text-sm text-muted-foreground mb-4">
          {mockStreamers.length} streamers found
        </p>
        <div className="space-y-3">
          {mockStreamers.map((streamer, index) => (
            <StreamerCard
              key={streamer.id}
              id={streamer.id}
              name={streamer.name}
              profilePicture={streamer.profilePicture}
              country={streamer.country}
              averageRating={streamer.averageRating}
              totalReviews={streamer.totalReviews}
              index={index}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Streamers;
