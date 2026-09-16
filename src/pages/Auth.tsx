import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Mail, Lock, User, ChevronRight, Tv, Users, ShoppingBag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "signup";
type UserRole = "fan" | "streamer" | "seller";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    gender: "" as "male" | "female" | "",
  });

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

  // Capture referral code from URL (?ref=CODE) for later redemption
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      try { localStorage.setItem("pending_referral_code", ref.trim()); } catch {}
    }
  }, []);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      toast({
        title: "Google sign in failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !role) {
      setShowRoleSelect(true);
      return;
    }

    setIsSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          toast({
            title: "Email not verified",
            description: "Please check your inbox and verify your email before signing in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "Redirecting to home...",
        });
        navigate("/home");
      }
    }

    setIsSubmitting(false);
  };

  const handleRoleSelect = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsSubmitting(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.name,
      selectedRole,
      formData.gender || undefined
    );

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    setShowVerifyEmail(true);
    setIsSubmitting(false);
  };

  // After a user signs in (post-verification), try to redeem any pending referral
  useEffect(() => {
    if (!user) return;
    let pending: string | null = null;
    try { pending = localStorage.getItem("pending_referral_code"); } catch {}
    if (!pending) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.rpc("redeem_referral", { _code: pending! }).then(({ data }) => {
        try { localStorage.removeItem("pending_referral_code"); } catch {}
        const r = data as any;
        if (r?.ok && r.reward_granted) {
          toast({ title: "Referral applied!", description: "Your friend earned a Blue badge for a year." });
        }
      });
    });
  }, [user, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (showVerifyEmail) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 gradient-gaming opacity-20" />
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Check your email</h1>
          <p className="text-muted-foreground text-center max-w-xs mb-2">
            We've sent a verification link to
          </p>
          <p className="text-primary font-semibold text-center mb-6">{formData.email}</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-8">
            Click the link in your email to activate your account. You won't be able to sign in until your email is verified.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setShowVerifyEmail(false);
              setMode("login");
              setShowRoleSelect(false);
              setRole(null);
            }}
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 gradient-gaming opacity-20" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <img src="/logo.png" alt="StreamRate" className="h-12 w-auto" />
          <span className="text-2xl font-bold gradient-text">StreamRate</span>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showRoleSelect ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-sm mx-auto w-full"
            >
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-muted-foreground mb-8 text-center">
                {mode === "login"
                  ? "Sign in to continue rating streamers"
                  : "Join the community today"}
              </p>

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full mb-4 gap-2"
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {mode === "signup" && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: "male" })}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                        formData.gender === "male"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground"
                      )}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: "female" })}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                        formData.gender === "female"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground"
                      )}
                    >
                      Female
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  variant="gaming"
                  size="lg"
                  className="w-full mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Please wait..." : mode === "login" ? "Sign In" : "Continue"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </form>

              {mode === "signup" && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  By signing up, you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/about")}
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/about")}
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </button>
                </p>
              )}

              <p className="text-center text-muted-foreground mt-8">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-medium ml-1 hover:underline"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full"
            >
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
                Choose your role
              </h1>
              <p className="text-muted-foreground mb-4 text-center">
                What brings you to StreamRate?
              </p>
              <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-500 text-center font-medium">
                  ⚠️ Your role cannot be changed after registration
                </p>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("fan")}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    "bg-card hover:bg-card/80 border-border hover:border-primary/50",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">I'm a Fan</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Rate and review your favorite streamers, follow them, and join the community.
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("streamer")}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    "bg-card hover:bg-card/80 border-border hover:border-accent/50",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Tv className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">I'm a Streamer</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your profile, share updates, and connect with your fans.
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("seller")}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    "bg-card hover:bg-card/80 border-border hover:border-green-500/50",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">I'm a Seller</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        List and sell gaming gear, streaming equipment, and accessories.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>

              <button
                onClick={() => setShowRoleSelect(false)}
                className="text-muted-foreground text-sm mt-6 hover:text-foreground transition-colors block mx-auto"
                disabled={isSubmitting}
              >
                ← Go back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
