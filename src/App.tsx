import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/streamers" element={<Streamers />} />
            <Route path="/streamer/:id" element={<StreamerProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/create-post" element={<CreatePost />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/reel/:id" element={<Reels />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
