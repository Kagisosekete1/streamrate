import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAppVisibility } from "@/hooks/useAppVisibility";
import { CookieConsent } from "@/components/CookieConsent";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Streamers from "./pages/Streamers";
import StreamerProfile from "./pages/StreamerProfile";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import PostDetail from "./pages/PostDetail";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Reels from "./pages/Reels";
import Hashtags from "./pages/Hashtags";
import ReelAnalytics from "./pages/ReelAnalytics";
import CreateReel from "./pages/CreateReel";
import Leaderboard from "./pages/Leaderboard";
import About from "./pages/About";
import Install from "./pages/Install";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  useAppVisibility();
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home />} />
          <Route path="/streamers" element={<Streamers />} />
          <Route path="/streamer/:id" element={<StreamerProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/create-reel" element={<CreateReel />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reel/:id" element={<Reels />} />
          <Route path="/hashtags" element={<Hashtags />} />
          <Route path="/hashtags/:tag" element={<Hashtags />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics/reels" element={<ReelAnalytics />} />
          <Route path="/about" element={<About />} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;