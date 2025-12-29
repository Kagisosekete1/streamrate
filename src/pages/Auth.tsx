import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Mail, Lock, User, ChevronRight, Tv, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup";
type UserRole = "fan" | "streamer";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "signup" && !role) {
      setShowRoleSelect(true);
      return;
    }

    // Demo login - in production this would connect to Supabase
    toast({
      title: mode === "login" ? "Welcome back!" : "Account created!",
      description: "Redirecting to home...",
    });
    
    setTimeout(() => navigate("/home"), 1000);
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    toast({
      title: "Account created!",
      description: `Welcome as a ${selectedRole}!`,
    });
    setTimeout(() => navigate("/home"), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-gaming opacity-20" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 py-12 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 mb-12"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">StreamRate</span>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showRoleSelect ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1"
            >
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-muted-foreground mb-8">
                {mode === "login"
                  ? "Sign in to continue rating streamers"
                  : "Join the community today"}
              </p>

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
                  />
                </div>

                <Button type="submit" variant="gaming" size="lg" className="w-full mt-6">
                  {mode === "login" ? "Sign In" : "Continue"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </form>

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
              className="flex-1"
            >
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Choose your role
              </h1>
              <p className="text-muted-foreground mb-8">
                What brings you to StreamRate?
              </p>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("fan")}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    "bg-card hover:bg-card/80 border-border hover:border-primary/50"
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
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    "bg-card hover:bg-card/80 border-border hover:border-accent/50"
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
              </div>

              <button
                onClick={() => setShowRoleSelect(false)}
                className="text-muted-foreground text-sm mt-6 hover:text-foreground transition-colors"
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
