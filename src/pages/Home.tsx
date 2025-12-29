import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { TrendingStreamer } from "@/components/TrendingStreamer";
import { PostCard } from "@/components/PostCard";
import { mockStreamers, mockPosts } from "@/data/mockData";

const Home = () => {
  // Sort streamers by rating for trending
  const trendingStreamers = [...mockStreamers]
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold gradient-text">StreamRate</h1>
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
                  name={streamer.name}
                  profilePicture={streamer.profilePicture}
                  rank={index + 1}
                  averageRating={streamer.averageRating}
                  index={index}
                />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Feed */}
        <section className="py-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            📰 Latest Posts
          </h2>
          <div className="space-y-4">
            {mockPosts.map((post, index) => (
              <PostCard
                key={post.id}
                id={post.id}
                streamerId={post.streamerId}
                streamerName={post.streamerName}
                streamerPicture={post.streamerPicture}
                content={post.content}
                likes={post.likes}
                comments={post.comments}
                createdAt={post.createdAt}
                index={index}
              />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
