import React, { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAppVisibility } from "@/hooks/useAppVisibility";
import { useNativePushNotifications } from "@/hooks/useNativePushNotifications";
import { useOneSignalIdentity } from "@/hooks/useOneSignalIdentity";
import { CookieConsent } from "@/components/CookieConsent";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { IOSInstallBanner } from "@/components/IOSInstallBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { AppLockGate } from "@/components/AppLockGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NavigationMemory } from "@/components/NavigationMemory";
import { NativeAuthRedirect } from "@/components/NativeAuthRedirect";
import { useAuth } from "@/hooks/useAuth";
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Streamers = lazy(() => import("./pages/Streamers"));
const StreamerProfile = lazy(() => import("./pages/StreamerProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Reels = lazy(() => import("./pages/Reels"));
const Hashtags = lazy(() => import("./pages/Hashtags"));
const ReelAnalytics = lazy(() => import("./pages/ReelAnalytics"));
const CreateReel = lazy(() => import("./pages/CreateReel"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const About = lazy(() => import("./pages/About"));
const Live = lazy(() => import("./pages/Live"));
const Store = lazy(() => import("./pages/Store"));
const StreamingAnalytics = lazy(() => import("./pages/StreamingAnalytics"));
const Missions = lazy(() => import("./pages/Missions"));
const BoostProfile = lazy(() => import("./pages/BoostProfile"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const WatchParties = lazy(() => import("./pages/WatchParties"));
const WatchPartyRoom = lazy(() => import("./pages/WatchPartyRoom"));
const SquadUp = lazy(() => import("./pages/SquadUp"));
const Clips = lazy(() => import("./pages/Clips"));
const SecurityFindings = lazy(() => import("./pages/SecurityFindings"));
const StreamSchedule = lazy(() => import("./pages/StreamSchedule"));
const Reminders = lazy(() => import("./pages/Reminders"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const AdminReminderLogs = lazy(() => import("./pages/AdminReminderLogs"));
const AdminPushLogs = lazy(() => import("./pages/AdminPushLogs"));
const StreamerGames = lazy(() => import("./pages/StreamerGames"));
const StreamerGear = lazy(() => import("./pages/StreamerGear"));
const ChatCommands = lazy(() => import("./pages/ChatCommands"));
const CoStream = lazy(() => import("./pages/CoStream"));
const Raids = lazy(() => import("./pages/Raids"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));

function AppStartupScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#021124]">
      <img src="/zyiro-mark.png" alt="ZYIRO" className="h-48 w-48 object-contain sm:h-56 sm:w-56" />
    </div>
  );
}

function StartupRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [minimumSplashShown, setMinimumSplashShown] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumSplashShown(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minimumSplashShown) return;
    navigate(user ? "/home" : "/auth", { replace: true });
  }, [loading, minimumSplashShown, navigate, user]);

  return <AppStartupScreen />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedFeatures() {
  useNativePushNotifications();
  useOneSignalIdentity();
  return null;
}

function AppContent() {
  useAppVisibility();
  
  return (
    <BrowserRouter>
      <NavigationMemory />
      <AuthProvider>
        <NativeAuthRedirect />
        <AuthenticatedFeatures />
        <ErrorBoundary>
        <AppLockGate>
          <Suspense fallback={<AppStartupScreen />}>
          <Routes>
            <Route path="/" element={<StartupRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/streamers" element={<Streamers />} />
            <Route path="/streamer/:id" element={<StreamerProfile />} />
            <Route path="/u/:id" element={<StreamerProfile />} />
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
            <Route path="/live" element={<Live />} />
            <Route path="/store" element={<Store />} />
            <Route path="/streaming-analytics" element={<StreamingAnalytics />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/boost-profile" element={<BoostProfile />} />
            <Route path="/creator-dashboard" element={<CreatorDashboard />} />
            <Route path="/watch-parties" element={<WatchParties />} />
            <Route path="/watch-party/:id" element={<WatchPartyRoom />} />
            <Route path="/squad-up" element={<SquadUp />} />
            <Route path="/clips" element={<Clips />} />
            <Route path="/schedule" element={<StreamSchedule />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/settings/notifications" element={<NotificationSettings />} />
            <Route path="/admin/reminder-logs" element={<AdminReminderLogs />} />
            <Route path="/admin/push-logs" element={<AdminPushLogs />} />
            <Route path="/security/findings" element={<SecurityFindings />} />
            <Route path="/games" element={<StreamerGames />} />
            <Route path="/gear" element={<StreamerGear />} />
            <Route path="/commands" element={<ChatCommands />} />
            <Route path="/co-stream" element={<CoStream />} />
            <Route path="/raids" element={<Raids />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournament/:id" element={<TournamentDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AppLockGate>
        </ErrorBoundary>
        <UpdateBanner />
        <CookieConsent />
        <PWAInstallBanner />
        <IOSInstallBanner />
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
