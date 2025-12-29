import { motion } from "framer-motion";
import { Settings, LogOut, Edit2, Users, Star, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PostCard } from "@/components/PostCard";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Demo user data
  const user = {
    name: "Alex Gaming",
    role: "streamer" as const,
    profilePicture: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=face",
    bio: "Gaming enthusiast | Content creator | Building an amazing community 🎮",
    followers: 1234,
    following: 567,
    posts: 42,
  };

  const userPosts = [
    {
      id: "up1",
      streamerId: "self",
      streamerName: user.name,
      streamerPicture: user.profilePicture,
      content: "Just finished an epic 12-hour stream! Thanks everyone for hanging out. New content coming tomorrow! 🎮✨",
      likes: 89,
      comments: 23,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
  ];

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 h-32 gradient-gaming opacity-30" />
        
        <div className="relative pt-4 px-4">
          <div className="flex justify-end gap-2">
            <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Profile info */}
        <div className="relative px-4 pb-6 -mt-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Edit2 className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            
            <h1 className="mt-4 text-xl font-bold text-foreground">{user.name}</h1>
            <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium mt-1 capitalize">
              {user.role}
            </span>
            <p className="text-muted-foreground text-sm text-center mt-2 max-w-xs">
              {user.bio}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mt-6"
          >
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{user.followers}</span>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{user.following}</span>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-foreground">{user.posts}</span>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Actions */}
      <section className="px-4 py-2">
        <div className="flex gap-3">
          <Button variant="gaming" className="flex-1">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Quick Stats for Streamers */}
      {user.role === "streamer" && (
        <section className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <Star className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">4.8</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <MessageCircle className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">156</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/50">
              <Users className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">89%</p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
          </div>
        </section>
      )}

      {/* User Posts */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Your Posts</h2>
        <div className="space-y-4">
          {userPosts.map((post, index) => (
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

      <BottomNav />
    </div>
  );
};

export default Profile;
