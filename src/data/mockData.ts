export interface Streamer {
  id: string;
  name: string;
  profilePicture: string;
  country: string;
  bio: string;
  averageRating: number;
  totalReviews: number;
}

export interface Post {
  id: string;
  streamerId: string;
  streamerName: string;
  streamerPicture: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPicture: string;
  stars: number;
  text: string;
  createdAt: Date;
}

export const mockStreamers: Streamer[] = [
  {
    id: "1",
    name: "NinjaX_Pro",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    country: "United States",
    bio: "Professional gamer and content creator. Playing FPS games since 2015. Join me for epic gaming sessions!",
    averageRating: 4.8,
    totalReviews: 1523,
  },
  {
    id: "2",
    name: "GamerGirl_Luna",
    profilePicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    country: "Canada",
    bio: "Variety streamer with a love for RPGs and indie games. Positive vibes only! 💜",
    averageRating: 4.9,
    totalReviews: 2341,
  },
  {
    id: "3",
    name: "DragonSlayer99",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    country: "United Kingdom",
    bio: "MMO enthusiast and raid leader. Building the best community in gaming!",
    averageRating: 4.6,
    totalReviews: 987,
  },
  {
    id: "4",
    name: "TechWizard_Mike",
    profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    country: "Germany",
    bio: "Tech reviews + gaming streams. Building PCs and breaking games since forever.",
    averageRating: 4.7,
    totalReviews: 756,
  },
  {
    id: "5",
    name: "KawaiiQueen",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    country: "Japan",
    bio: "VTuber and artist. Drawing, gaming, and vibing together! ✨",
    averageRating: 4.9,
    totalReviews: 3102,
  },
  {
    id: "6",
    name: "ProPlayer_Carlos",
    profilePicture: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop&crop=face",
    country: "Brazil",
    bio: "E-sports professional player. Multiple tournament winner. Let's grind!",
    averageRating: 4.5,
    totalReviews: 1890,
  },
  {
    id: "7",
    name: "CozyGamer_Emma",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    country: "Australia",
    bio: "Cozy gaming streams with a cup of tea. Animal Crossing, Stardew Valley, and chill.",
    averageRating: 4.8,
    totalReviews: 2045,
  },
  {
    id: "8",
    name: "SpeedRunner_Max",
    profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
    country: "Sweden",
    bio: "World record holder in 5 games. Speedrunning is life! 🏃‍♂️💨",
    averageRating: 4.4,
    totalReviews: 1234,
  },
];

export const mockPosts: Post[] = [
  {
    id: "p1",
    streamerId: "1",
    streamerName: "NinjaX_Pro",
    streamerPicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    content: "Just hit Immortal rank! 🎯 Thanks to everyone who watched the grind. This community is amazing! Next goal: Radiant. Let's get it! 🔥",
    likes: 542,
    comments: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "p2",
    streamerId: "2",
    streamerName: "GamerGirl_Luna",
    streamerPicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    content: "New stream schedule is up! 📅 Mon-Wed-Fri at 7PM EST. This week we're diving into the new RPG everyone's talking about. Who's excited?",
    likes: 328,
    comments: 156,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "p3",
    streamerId: "5",
    streamerName: "KawaiiQueen",
    streamerPicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    content: "Art stream tomorrow! 🎨 Drop your suggestions in the comments - I'll draw the top voted one live! Can't wait to create together~",
    likes: 892,
    comments: 234,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: "p4",
    streamerId: "6",
    streamerName: "ProPlayer_Carlos",
    streamerPicture: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop&crop=face",
    content: "Tournament day! 🏆 Watch me and the team compete for the championship. Stream starts at 3PM. Link in bio! #esports #gaming",
    likes: 1203,
    comments: 312,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
];

export const mockReviews: Review[] = [
  {
    id: "r1",
    userId: "u1",
    userName: "GameFan2023",
    userPicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    stars: 5,
    text: "Best streamer I've ever watched! Always entertaining and interactive with chat. 10/10 would recommend!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "r2",
    userId: "u2",
    userName: "CasualViewer",
    userPicture: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop&crop=face",
    stars: 4,
    text: "Great content and really skilled player. Sometimes streams go a bit long but overall amazing experience.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: "r3",
    userId: "u3",
    userName: "StreamLover",
    userPicture: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face",
    stars: 5,
    text: "This streamer changed how I play games! Learned so much from their tutorials and gameplay. Such a positive community too!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
];
