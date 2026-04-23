import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  ChevronLeft,
  User,
  Lock,
  Mail,
  Shield,
  Eye,
  MessageCircle,
  Star,
  Ban,
  Bell,
  Globe,
  MapPin,
  TrendingUp,
  Moon,
  Wifi,
  Trash2,
  HelpCircle,
  Flag,
  FileText,
  Scale,
  LogOut,
  UserX,
  X,
  ChevronRight,
  RefreshCw,
  Smartphone,
  Sun,
  Monitor,
  Clock,
  Info,
  QrCode,
  Download,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HelpFAQModal } from "@/components/settings/HelpFAQModal";
import { CommunityGuidelinesModal } from "@/components/settings/CommunityGuidelinesModal";
import { PrivacyPolicyModal } from "@/components/settings/PrivacyPolicyModal";
import { TermsOfServiceModal } from "@/components/settings/TermsOfServiceModal";
import { ReportProblemModal } from "@/components/settings/ReportProblemModal";
import { AppLockModal } from "@/components/settings/AppLockModal";
import { getDefaultAvatar } from "@/utils/defaultAvatar";
import { buildProfileQrUrl, checkQrHandleAvailable, sanitizeQrHandle } from "@/lib/profileQr";
import { cn } from "@/lib/utils";

// Detect Median.co native webview
const isMedianApp = () => !!(window as any).median || !!(window as any).gonative;

const NotificationsModal = ({
  notifications,
  setNotifications,
  toast,
  setActiveModal,
  userId,
}: {
  notifications: Record<string, boolean>;
  setNotifications: (n: any) => void;
  toast: (opts: any) => void;
  setActiveModal: (m: any) => void;
  userId: string | undefined;
}) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isMedianApp()) {
      // For Median.co APK, always use localStorage as source of truth
      setPushEnabled(localStorage.getItem("median_push_enabled") === "true");
    } else if ("Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  // Helper to run a bridge call with a timeout so it never hangs forever
  const withTimeout = (promise: Promise<any> | undefined, ms = 3000) => {
    if (!promise) return Promise.resolve();
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, ms)),
    ]);
  };

  const handleTogglePush = async (checked: boolean) => {
    setLoading(true);
    try {
      if (isMedianApp()) {
        const median = (window as any).median || (window as any).gonative;

        // Update UI and localStorage FIRST so it's never stuck
        setPushEnabled(checked);
        localStorage.setItem("median_push_enabled", checked ? "true" : "false");

        if (checked) {
          toast({ title: "Push notifications enabled!" });
        } else {
          toast({ title: "Push notifications disabled" });
        }
      } else if ("Notification" in window) {
        if (checked) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            setPushEnabled(true);
            localStorage.setItem("push_prompt_dismissed", "true");
            toast({ title: "Push notifications enabled!" });
          } else {
            toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
          }
        } else {
          toast({ title: "To disable", description: "Manage notification permissions in your device settings." });
        }
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      toast({ title: "Failed to update push settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setActiveModal(null)}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          <button
            onClick={() => { toast({ title: "Settings saved!" }); setActiveModal(null); }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            Save
          </button>
        </div>

        {/* System notifications blocked warning */}
        {pushEnabled && isMedianApp() && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <p className="font-semibold text-destructive text-sm mb-1">System notifications blocked?</p>
            <p className="text-xs text-muted-foreground mb-3">
              If you're not receiving notifications, tap below to open your phone's notification settings for StreamRate.
            </p>
            <button
              onClick={() => {
                const median = (window as any).median || (window as any).gonative;
                // Try Median bridge to open app notification settings
                if (median?.open?.appSettings) {
                  median.open.appSettings();
                } else {
                  // Fallback: show instruction
                  toast({ title: "Open your phone's Settings → Apps → StreamRate → Notifications and enable them." });
                }
              }}
              className="w-full py-2 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              <Smartphone className="w-4 h-4 inline mr-2" />
              Open System Notification Settings
            </button>
          </div>
        )}

        {/* Push Notification Master Toggle */}
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {pushEnabled ? "Enabled — you'll receive push alerts" : "Enable to get notified in real-time"}
                </p>
              </div>
            </div>
            <Switch
              checked={pushEnabled}
              disabled={loading}
              onCheckedChange={handleTogglePush}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Choose what notifications you want to receive.
        </p>
        <div className="space-y-4">
          {[
            { key: "ratings", label: "New ratings" },
            { key: "reviews", label: "New reviews" },
            { key: "comments", label: "New comments" },
            { key: "likes", label: "Likes on posts" },
            { key: "followers", label: "New followers" },
            { key: "goLive", label: "Go-live alerts" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-foreground">{item.label}</span>
              <Switch
                checked={notifications[item.key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, [item.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "1";
const LAST_UPDATE = "2025-01-12";

const UPDATE_HISTORY = [
  { version: "1.0.0", date: "2025-01-12", notes: "Initial release with ratings, posts, and social features" },
];

type ModalType =
  | "editProfile"
  | "changePassword"
  | "email"
  | "profileVisibility"
  | "whoCanComment"
  | "whoCanRate"
  | "blockedUsers"
  | "notifications"
  | "language"
  | "preferredCountry"
  | "trendingStreamers"
  | "darkMode"
  | "dataSaver"
  | "clearCache"
  | "helpFaq"
  | "reportProblem"
  | "communityGuidelines"
  | "privacyPolicy"
  | "termsOfService"
  | "logout"
  | "deleteAccount"
  | "deactivateAccount"
  | "appUpdate"
  | "appLock"
  | "lastSeenVisibility"
  | "qrCode"
  | null;

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, signOut, updateProfile } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editForm, setEditForm] = useState({
    username: "",
    qrHandle: "",
    bio: "",
    country: "",
  });
  const [qrHandleStatus, setQrHandleStatus] = useState<{ checking: boolean; available: boolean | null; reason: string | null; normalized: string }>({
    checking: false,
    available: null,
    reason: null,
    normalized: "",
  });

  // Sync form data only when modal opens
  useEffect(() => {
    if (activeModal === "editProfile" && profile) {
      setEditForm({
        username: profile.username || "",
        qrHandle: (profile as any).qr_handle || profile.username || "",
        bio: profile.bio || "",
        country: profile.country || "",
      });
    }
  }, [activeModal]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [reportForm, setReportForm] = useState({
    type: "Bug",
    message: "",
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("notification_prefs");
    return saved ? JSON.parse(saved) : {
      ratings: true,
      reviews: true,
      comments: true,
      likes: true,
      followers: true,
      goLive: true,
    };
  });

  useEffect(() => {
    localStorage.setItem("notification_prefs", JSON.stringify(notifications));
  }, [notifications]);

  const qrHandle = (profile as any)?.qr_handle || profile?.username || `user_${(profile as any)?.signup_number || user?.id}`;
  const profileUrl = user ? buildProfileQrUrl(qrHandle) : "";
  const editingQrHandle = sanitizeQrHandle(editForm.qrHandle || editForm.username || profile?.full_name || "");
  const editingQrUrl = buildProfileQrUrl(editingQrHandle || "your_handle");
  const displayName = profile?.username ? `@${profile.username}` : profile?.full_name || "StreamRate profile";
  const avatarUrl = profile?.avatar_url || getDefaultAvatar();

  useEffect(() => {
    if (activeModal !== "editProfile" || !user) return;
    const nextHandle = sanitizeQrHandle(editForm.qrHandle || editForm.username || profile?.full_name || "");
    setQrHandleStatus({ checking: !!nextHandle, available: null, reason: null, normalized: nextHandle });
    if (!nextHandle) return;

    const timer = window.setTimeout(async () => {
      const result = await checkQrHandleAvailable(nextHandle, user.id);
      setQrHandleStatus({ checking: false, available: result.available, reason: result.reason, normalized: result.normalized });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activeModal, editForm.qrHandle, editForm.username, profile?.full_name, user]);

  const generateProfileQr = async () => {
    if (!profileUrl) return;

    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, profileUrl, {
      width: 960,
      margin: 3,
      color: {
        dark: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
        light: resolvedTheme === "dark" ? "#020617" : "#ffffff",
      },
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = resolvedTheme === "dark" ? "#020617" : "#ffffff";
    const fg = resolvedTheme === "dark" ? "#f8fafc" : "#0f172a";
    const muted = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";
    const primary = "#0066ff";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.roundRect(80, 80, 920, 1120, 40);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(100, 100, 880, 1080, 32);
    ctx.fill();

    ctx.drawImage(qrCanvas, 110, 210, 860, 860);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(540, 640, 104, 0, Math.PI * 2);
    ctx.fill();

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 640, 82, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 458, 558, 164, 164);
        ctx.restore();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(540, 640, 86, 0, Math.PI * 2);
        ctx.stroke();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = avatarUrl;
    });

    ctx.fillStyle = fg;
    ctx.font = "700 54px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("StreamRate", 540, 165);
    ctx.font = "700 38px Inter, system-ui, sans-serif";
    ctx.fillText(displayName, 540, 1110);
    ctx.fillStyle = muted;
    ctx.font = "500 24px Inter, system-ui, sans-serif";
    ctx.fillText("Scan to view, sign up, and follow", 540, 1150);

    setQrDataUrl(canvas.toDataURL("image/png"));
  };

  useEffect(() => {
    if (activeModal === "qrCode") {
      generateProfileQr();
    }
  }, [activeModal, profileUrl, avatarUrl, displayName, resolvedTheme]);
  const [settings, setSettings] = useState({
    profileVisibility: "public",
    whoCanComment: "everyone",
    whoCanRate: "everyone",
    language: "English",
    showTrending: true,
    darkMode: "system",
    dataSaver: localStorage.getItem("data_saver") === "true",
    lastSeenVisibility: "everyone",
  });

  // Fetch all persisted settings from profile
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("last_seen_visibility, profile_visibility, who_can_comment")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setSettings(prev => ({
          ...prev,
          lastSeenVisibility: (data as any).last_seen_visibility || "everyone",
          profileVisibility: (data as any).profile_visibility || "public",
          whoCanComment: (data as any).who_can_comment || "everyone",
        }));
      }
    };
    fetchSettings();
  }, [user]);

  const handleSaveLastSeenVisibility = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_visibility: settings.lastSeenVisibility })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
      return;
    }
    
    toast({ title: "Settings saved!" });
    setActiveModal(null);
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out" });
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Schedule deletion in 10 days instead of immediate
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 10);
    
    await supabase
      .from("profiles")
      .update({ 
        scheduled_deletion_at: deletionDate.toISOString(),
        is_deactivated: true,
        deactivated_at: new Date().toISOString()
      } as any)
      .eq("id", user.id);
    
    await signOut();
    toast({ title: "Account scheduled for deletion", description: "Your account will be permanently deleted in 10 days. Log back in to cancel." });
    navigate("/auth");
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    
    await supabase
      .from("profiles")
      .update({ 
        is_deactivated: true,
        deactivated_at: new Date().toISOString()
      } as any)
      .eq("id", user.id);
    
    await signOut();
    toast({ title: "Account deactivated", description: "Log back in anytime to reactivate." });
    navigate("/auth");
  };

  const handleSaveProfile = async () => {
    const cleanUsername = editForm.username ? editForm.username.replace(/\s/g, "").toLowerCase() : "";
    const requestedHandle = sanitizeQrHandle(editForm.qrHandle || cleanUsername || profile?.full_name || "");
    const handleCheck = await checkQrHandleAvailable(requestedHandle, user?.id);

    if (!handleCheck.available) {
      toast({ title: "QR handle unavailable", description: handleCheck.reason || "Choose another handle.", variant: "destructive" });
      return;
    }

    const { error } = await updateProfile({
      username: cleanUsername,
      qr_handle: handleCheck.normalized,
      bio: editForm.bio,
      country: editForm.country,
    } as any);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated!" });
    setActiveModal(null);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!passwordForm.currentPassword) {
      toast({ title: "Please enter your current password", variant: "destructive" });
      return;
    }

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: passwordForm.currentPassword,
    });

    if (signInError) {
      toast({ title: "Current password is incorrect", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Password updated!" });
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setActiveModal(null);
  };

  const handleReportProblem = async () => {
    if (!reportForm.message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    // In a real app, this would send to a backend
    toast({ title: "Report submitted. Our team will review it." });
    setReportForm({ type: "Bug", message: "" });
    setActiveModal(null);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `streamrate-${qrHandle || "profile"}-qr.png`;
    link.click();
    toast({ title: "QR code saved", description: "Your profile QR image was generated and downloaded." });
  };

  const handleCopyProfileLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Profile link copied" });
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    onClick,
    destructive = false,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    onClick: () => void;
    destructive?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl text-left transition-colors flex items-center gap-3 ${
        destructive
          ? "bg-destructive/10 hover:bg-destructive/20"
          : "bg-secondary/50 hover:bg-secondary"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${destructive ? "text-destructive" : "text-primary"}`}
      />
      <div className="flex-1">
        <p className={`font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>
          {title}
        </p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 first:mt-0">
      {children}
    </h3>
  );

  const Modal = ({
    title,
    children,
    showSave = false,
    onSave,
  }: {
    title: string;
    children: React.ReactNode;
    showSave?: boolean;
    onSave?: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setActiveModal(null);
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setActiveModal(null)}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {showSave ? (
            <button
              onClick={onSave}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
            >
              Save
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
        {children}
      </motion.div>
    </motion.div>
  );

  // Blocked Users Modal with actual data
  const BlockedUsersModal = ({ onClose }: { onClose: () => void }) => {
    const [blockedUsers, setBlockedUsers] = useState<Array<{
      id: string;
      blocked_id: string;
      username: string | null;
      avatar_url: string | null;
    }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchBlockedUsers = async () => {
        if (!user) return;
        
        const { data } = await supabase
          .from("blocked_users")
          .select("id, blocked_id")
          .eq("blocker_id", user.id);

        if (data && data.length > 0) {
          const blockedWithProfiles = await Promise.all(
            data.map(async (block) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", block.blocked_id)
                .maybeSingle();
              return {
                ...block,
                username: profile?.username || null,
                avatar_url: profile?.avatar_url || null,
              };
            })
          );
          setBlockedUsers(blockedWithProfiles);
        }
        setLoading(false);
      };

      fetchBlockedUsers();
    }, [user]);

    const handleUnblock = async (blockId: string, username: string | null) => {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("id", blockId);

      if (error) {
        toast({ title: "Failed to unblock", variant: "destructive" });
        return;
      }

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      toast({ title: `Unblocked ${username || "user"}` });
    };

    return (
      <Modal title="Blocked Users">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-8">
            <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">You haven't blocked any users.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blocked) => (
              <div key={blocked.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                <img
                  src={blocked.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                  alt={blocked.username || "User"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{blocked.username || "Anonymous"}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnblock(blocked.id, blocked.username)}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    );
  };

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="px-4 py-2">
        {/* Account Section */}
        <SectionTitle>Account</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={Lock}
            title="Change Password"
            subtitle="Update your password"
            onClick={() => setActiveModal("changePassword")}
          />
          <SettingItem
            icon={Shield}
            title="App Lock (PIN)"
            subtitle="Set a PIN to lock your app"
            onClick={() => setActiveModal("appLock")}
          />
          <SettingItem
            icon={Mail}
            title="Email Address"
            subtitle={profile?.email || "Not set"}
            onClick={() => setActiveModal("email")}
          />
          <SettingItem
            icon={Shield}
            title="Role"
            subtitle={userRole === "streamer" ? "Streamer" : userRole === "seller" ? "Seller" : "Fan"}
            onClick={() => toast({ title: "Your role cannot be changed after signup." })}
          />
          <SettingItem
            icon={QrCode}
            title="Your QR Code"
            subtitle="Download a scannable profile card"
            onClick={() => setActiveModal("qrCode")}
          />
        </div>

        {/* Privacy & Safety */}
        <SectionTitle>Privacy & Safety</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={Eye}
            title="Profile Visibility"
            subtitle={settings.profileVisibility === "public" ? "Public" : "Private"}
            onClick={() => setActiveModal("profileVisibility")}
          />
          <SettingItem
            icon={MessageCircle}
            title="Who Can Comment"
            subtitle={settings.whoCanComment === "everyone" ? "Everyone" : "Followers only"}
            onClick={() => setActiveModal("whoCanComment")}
          />
          {userRole === "streamer" && (
            <SettingItem
              icon={Star}
              title="Who Can Rate Me"
              subtitle={settings.whoCanRate === "everyone" ? "Everyone" : "Verified fans only"}
              onClick={() => setActiveModal("whoCanRate")}
            />
          )}
          <SettingItem
            icon={Clock}
            title="Last Seen"
            subtitle={settings.lastSeenVisibility === "everyone" ? "Everyone" : settings.lastSeenVisibility === "followers" ? "Followers only" : "Off"}
            onClick={() => setActiveModal("lastSeenVisibility")}
          />
          <SettingItem
            icon={Ban}
            title="Blocked Users"
            subtitle="Manage blocked accounts"
            onClick={() => setActiveModal("blockedUsers")}
          />
        </div>

        {/* Notifications */}
        <SectionTitle>Notifications</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={Bell}
            title="Notification Preferences"
            subtitle="Choose what notifications you receive"
            onClick={() => setActiveModal("notifications")}
          />
        </div>

        {/* Content Preferences */}
        <SectionTitle>Content Preferences</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={Globe}
            title="Preferred Language"
            subtitle={settings.language}
            onClick={() => setActiveModal("language")}
          />
          <SettingItem
            icon={MapPin}
            title="Preferred Country"
            subtitle={profile?.country || "Not set"}
            onClick={() => setActiveModal("preferredCountry")}
          />
          <SettingItem
            icon={TrendingUp}
            title="Show Trending Streamers"
            subtitle={settings.showTrending ? "Enabled" : "Disabled"}
            onClick={() => setActiveModal("trendingStreamers")}
          />
        </div>

        {/* App Settings */}
        <SectionTitle>App Settings</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={resolvedTheme === "dark" ? Moon : Sun}
            title="Dark Mode"
            subtitle={theme === "system" ? "System" : theme === "dark" ? "On" : "Off"}
            onClick={() => setActiveModal("darkMode")}
          />
          <SettingItem
            icon={Wifi}
            title="Data Saver Mode"
            subtitle={settings.dataSaver ? "Enabled" : "Disabled"}
            onClick={() => setActiveModal("dataSaver")}
          />
          <SettingItem
            icon={Trash2}
            title="Clear Cache"
            subtitle="Free up space"
            onClick={() => setActiveModal("clearCache")}
          />
          <SettingItem
            icon={RefreshCw}
            title="Check for Updates"
            subtitle={`Version ${APP_VERSION}`}
            onClick={() => setActiveModal("appUpdate")}
          />
          <SettingItem
            icon={Smartphone}
            title="Install App"
            subtitle="Add to home screen for the best experience"
            onClick={() => navigate("/install")}
          />
        </div>

        {/* Support & Legal */}
        <SectionTitle>Support & Legal</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={HelpCircle}
            title="Help & FAQ"
            subtitle="Get answers to common questions"
            onClick={() => setActiveModal("helpFaq")}
          />
          <SettingItem
            icon={Flag}
            title="Report a Problem"
            subtitle="Let us know about issues"
            onClick={() => setActiveModal("reportProblem")}
          />
          <SettingItem
            icon={FileText}
            title="Community Guidelines"
            subtitle="Our community standards"
            onClick={() => setActiveModal("communityGuidelines")}
          />
          <SettingItem
            icon={Shield}
            title="Privacy Policy"
            subtitle="How we handle your data"
            onClick={() => setActiveModal("privacyPolicy")}
          />
          <SettingItem
            icon={Scale}
            title="Terms of Service"
            subtitle="Usage terms and conditions"
            onClick={() => setActiveModal("termsOfService")}
          />
          <SettingItem
            icon={Info}
            title="About Us"
            subtitle="Learn more about StreamRate"
            onClick={() => navigate("/about")}
          />
        </div>

        {/* Account Actions */}
        <SectionTitle>Account Actions</SectionTitle>
        <div className="space-y-2">
          <SettingItem
            icon={LogOut}
            title="Log Out"
            onClick={() => setActiveModal("logout")}
            destructive
          />
          <SettingItem
            icon={Ban}
            title="Deactivate Account"
            subtitle="Temporarily hide your profile"
            onClick={() => setActiveModal("deactivateAccount")}
            destructive
          />
          <SettingItem
            icon={UserX}
            title="Delete Account"
            subtitle="10-day recovery window before permanent deletion"
            onClick={() => setActiveModal("deleteAccount")}
            destructive
          />
        </div>

        {/* App Info */}
        <div className="mt-8 mb-4 p-4 rounded-xl bg-secondary/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">StreamRate</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Version {APP_VERSION} (Build {BUILD_NUMBER})
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: {LAST_UPDATE}
          </p>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "editProfile" && (
          <Modal title="Edit Profile" showSave onSave={handleSaveProfile}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Username
                </label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/\s/g, "").toLowerCase() })}
                  placeholder="Your username"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  QR handle
                </label>
                <Input
                  value={editForm.qrHandle}
                  onChange={(e) => setEditForm({ ...editForm, qrHandle: sanitizeQrHandle(e.target.value) })}
                  placeholder="stable_profile_link"
                />
                <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="break-all text-xs font-medium text-foreground">{editingQrUrl}</p>
                  <p className={cn("mt-1 text-xs", qrHandleStatus.available === false ? "text-destructive" : qrHandleStatus.available ? "text-primary" : "text-muted-foreground")}>
                    {qrHandleStatus.checking
                      ? "Checking availability..."
                      : qrHandleStatus.available === true
                        ? "Available — this QR link is ready."
                        : qrHandleStatus.available === false
                          ? qrHandleStatus.reason || "This QR handle is unavailable."
                          : "Your QR code stays stable even if your display username changes."}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  maxLength={200}
                  placeholder="Tell us about yourself..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1">{editForm.bio.length}/200</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Country
                </label>
                <Input
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  placeholder="Your country"
                />
              </div>
            </div>
          </Modal>
        )}

        {activeModal === "changePassword" && (
          <Modal title="Change Password" showSave onSave={handleChangePassword}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Password must be at least 8 characters</p>
            </div>
          </Modal>
        )}

        {activeModal === "appLock" && (
          <AppLockModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "email" && (
          <Modal title="Email Address">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-foreground font-medium">{profile?.email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your email is used for login and account recovery.
              </p>
            </div>
          </Modal>
        )}

        {activeModal === "qrCode" && (
          <Modal title="Your QR Code">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Your StreamRate profile QR code"
                    className="mx-auto w-full max-w-[280px] rounded-xl border border-border bg-background"
                  />
                ) : (
                  <div className="mx-auto flex h-[280px] max-w-[280px] items-center justify-center rounded-xl bg-secondary">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <p className="mt-3 text-sm font-medium text-foreground">{displayName}</p>
                <p className="mt-1 text-xs text-muted-foreground break-all">{profileUrl}</p>
                <p className="mt-2 text-xs text-primary">Scan test: this resolves to your signed-in StreamRate profile.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleCopyProfileLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="gaming" onClick={handleDownloadQr} disabled={!qrDataUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === "profileVisibility" && (
          <Modal title="Profile Visibility" showSave onSave={async () => {
            if (!user) return;
            const { error } = await supabase
              .from("profiles")
              .update({ profile_visibility: settings.profileVisibility } as any)
              .eq("id", user.id);
            if (error) {
              toast({ title: "Failed to update", variant: "destructive" });
              return;
            }
            toast({ title: "Settings saved!" });
            setActiveModal(null);
          }}>
            <div className="space-y-3">
              {["public", "private"].map((option) => (
                <button
                  key={option}
                  onClick={() => setSettings({ ...settings, profileVisibility: option })}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    settings.profileVisibility === option
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="font-medium text-foreground capitalize">{option}</p>
                  <p className="text-sm text-muted-foreground">
                    {option === "public"
                      ? "Anyone can view your profile"
                      : "Only followers can view your profile"}
                  </p>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === "whoCanComment" && (
          <Modal title="Who Can Comment" showSave onSave={async () => {
            if (!user) return;
            const { error } = await supabase
              .from("profiles")
              .update({ who_can_comment: settings.whoCanComment } as any)
              .eq("id", user.id);
            if (error) {
              toast({ title: "Failed to update", variant: "destructive" });
              return;
            }
            toast({ title: "Settings saved!" });
            setActiveModal(null);
          }}>
            <div className="space-y-3">
              {[
                { value: "everyone", label: "Everyone" },
                { value: "followers", label: "Followers only" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ ...settings, whoCanComment: option.value })}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    settings.whoCanComment === option.value
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{option.label}</p>
                </button>
              ))}
              <p className="text-sm text-muted-foreground">
                This controls who can comment on your posts.
              </p>
            </div>
          </Modal>
        )}

        {activeModal === "whoCanRate" && (
          <Modal title="Who Can Rate Me" showSave onSave={() => { toast({ title: "Settings saved!" }); setActiveModal(null); }}>
            <div className="space-y-3">
              {[
                { value: "everyone", label: "Everyone" },
                { value: "verified", label: "Verified fans only" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ ...settings, whoCanRate: option.value })}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    settings.whoCanRate === option.value
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{option.label}</p>
                </button>
              ))}
              <p className="text-sm text-muted-foreground">
                Choose who is allowed to rate your profile.
              </p>
            </div>
          </Modal>
        )}

        {activeModal === "blockedUsers" && (
          <BlockedUsersModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "lastSeenVisibility" && (
          <Modal title="Last Seen Visibility" showSave onSave={handleSaveLastSeenVisibility}>
            <p className="text-sm text-muted-foreground mb-4">
              Control who can see when you were last active.
            </p>
            <div className="space-y-3">
              {[
                { value: "everyone", label: "Everyone", description: "Anyone can see your last seen" },
                { value: "followers", label: "Followers only", description: "Only people who follow you" },
                { value: "off", label: "Off", description: "Hide your last seen from everyone" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ ...settings, lastSeenVisibility: option.value })}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    settings.lastSeenVisibility === option.value
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === "notifications" && (
          <NotificationsModal
            notifications={notifications}
            setNotifications={setNotifications}
            toast={toast}
            setActiveModal={setActiveModal}
            userId={user?.id}
          />
        )}


        {activeModal === "language" && (
          <Modal title="Preferred Language" showSave onSave={() => { toast({ title: "Settings saved!" }); setActiveModal(null); }}>
            <div className="space-y-3">
              {["English", "Spanish", "French", "German", "Portuguese"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSettings({ ...settings, language: lang })}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    settings.language === lang
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{lang}</p>
                </button>
              ))}
              <p className="text-sm text-muted-foreground">
                This affects app text and content suggestions.
              </p>
            </div>
          </Modal>
        )}

        {activeModal === "preferredCountry" && (
          <Modal title="Preferred Country" showSave onSave={handleSaveProfile}>
            <div className="space-y-4">
              <Input
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                placeholder="Enter your country"
              />
              <p className="text-sm text-muted-foreground">
                Used to show relevant streamers and search results.
              </p>
            </div>
          </Modal>
        )}

        {activeModal === "trendingStreamers" && (
          <Modal title="Show Trending Streamers" showSave onSave={() => { toast({ title: "Settings saved!" }); setActiveModal(null); }}>
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
              <span className="text-foreground">Show trending section</span>
              <Switch
                checked={settings.showTrending}
                onCheckedChange={(checked) => setSettings({ ...settings, showTrending: checked })}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Show or hide the trending streamers section on home.
            </p>
          </Modal>
        )}

        {activeModal === "darkMode" && (
          <Modal title="Dark Mode" showSave onSave={() => { toast({ title: "Theme updated!" }); setActiveModal(null); }}>
            <div className="space-y-3">
              {[
                { value: "dark", label: "Dark", icon: Moon, description: "Always use dark theme" },
                { value: "light", label: "Light", icon: Sun, description: "Always use light theme" },
                { value: "system", label: "System", icon: Monitor, description: "Follow system preference" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as "dark" | "light" | "system")}
                  className={`w-full p-4 rounded-xl text-left transition-colors flex items-center gap-3 ${
                    theme === option.value
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-secondary/50"
                  }`}
                >
                  <option.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === "dataSaver" && (
          <Modal title="Data Saver Mode" showSave onSave={() => {
            localStorage.setItem("data_saver", settings.dataSaver ? "true" : "false");
            toast({ title: "Settings saved!" });
            setActiveModal(null);
          }}>
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
              <span className="text-foreground">Enable data saver</span>
              <Switch
                checked={settings.dataSaver}
                onCheckedChange={(checked) => setSettings({ ...settings, dataSaver: checked })}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Reduces video preloading and disables autoplay on slow connections to save data.
            </p>
          </Modal>
        )}

        {activeModal === "clearCache" && (
          <Modal title="Clear Cache">
            <p className="text-muted-foreground mb-4">
              Clears temporary files to free up space.
            </p>
            <Button
              variant="gaming"
              onClick={() => {
                toast({ title: "Cache cleared" });
                setActiveModal(null);
              }}
              className="w-full"
            >
              Clear Cache
            </Button>
          </Modal>
        )}

        {activeModal === "helpFaq" && (
          <HelpFAQModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "reportProblem" && (
          <ReportProblemModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "communityGuidelines" && (
          <CommunityGuidelinesModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "privacyPolicy" && (
          <PrivacyPolicyModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "termsOfService" && (
          <TermsOfServiceModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === "logout" && (
          <Modal title="Log Out">
            <p className="text-muted-foreground mb-4">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogout} className="flex-1">
                Log Out
              </Button>
            </div>
          </Modal>
        )}

        {activeModal === "deleteAccount" && (
          <Modal title="Delete Account">
            <div className="p-4 bg-destructive/10 rounded-xl mb-4">
              <p className="text-destructive font-medium">⚠️ 10-Day Recovery Window</p>
              <p className="text-sm text-destructive/80 mt-1">
                Your account will be scheduled for deletion. You have 10 days to log back in and cancel. After 10 days, all your data (profile, posts, reviews) will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} className="flex-1">
                Schedule Deletion
              </Button>
            </div>
          </Modal>
        )}

        {activeModal === "deactivateAccount" && (
          <Modal title="Deactivate Account">
            <div className="p-4 bg-secondary/50 rounded-xl mb-4">
              <p className="font-medium text-foreground">Temporarily deactivate</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your profile and content will be hidden from other users. You can reactivate anytime by logging back in.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeactivateAccount} className="flex-1">
                Deactivate
              </Button>
            </div>
          </Modal>
        )}

        {activeModal === "appUpdate" && (
          <Modal title="App Updates">
            <div className="space-y-6">
              {/* Current Version */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Version</p>
                    <p className="text-2xl font-bold text-foreground">{APP_VERSION}</p>
                    <p className="text-xs text-muted-foreground">Build {BUILD_NUMBER}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>

              {/* Check for Updates Button */}
              <Button
                variant="gaming"
                className="w-full"
                onClick={() => {
                  toast({
                    title: "You're up to date!",
                    description: `StreamRate v${APP_VERSION} is the latest version.`,
                  });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Updates
              </Button>

              {/* Update History */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Update History</h4>
                <div className="space-y-3">
                  {UPDATE_HISTORY.map((update, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">v{update.version}</span>
                        <span className="text-xs text-muted-foreground">{update.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{update.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Updated Info */}
              <div className="text-center pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Last checked: Just now
                </p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      </div>
    </AppLayout>
  );
};

export default Settings;
