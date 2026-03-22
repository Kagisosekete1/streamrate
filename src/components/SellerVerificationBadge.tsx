import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Shield, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface SellerVerificationBadgeProps {
  userId: string;
  size?: "sm" | "md" | "lg";
}

export const SellerVerificationBadge = ({ userId, size = "sm" }: SellerVerificationBadgeProps) => {
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("seller_verifications")
        .select("is_verified, expires_at")
        .eq("user_id", userId)
        .eq("is_verified", true)
        .single();

      if (data && new Date(data.expires_at!) > new Date()) {
        setIsVerified(true);
      }
    };
    check();
  }, [userId]);

  if (!isVerified) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex"
      title="Verified Seller"
    >
      <BadgeCheck className={`${sizeClasses[size]} text-blue-500 fill-blue-500/20`} />
    </motion.div>
  );
};

interface SellerVerificationApplyProps {
  userId: string;
  userRole: string | null;
}

export const SellerVerificationApply = ({ userId, userRole }: SellerVerificationApplyProps) => {
  const [status, setStatus] = useState<"no_subscription" | "pending" | "verified" | "apply">("no_subscription");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const check = async () => {
      // First check if they have an active seller subscription (R600 package)
      const { data: sub } = await supabase
        .from("seller_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!sub) {
        setStatus("no_subscription");
        setLoading(false);
        return;
      }

      // Check if already verified
      const { data: verification } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (verification) {
        if (verification.is_verified && verification.expires_at && new Date(verification.expires_at) > new Date()) {
          setStatus("verified");
        } else if (!verification.is_verified) {
          setStatus("pending");
        } else {
          setStatus("apply");
        }
      } else {
        setStatus("apply");
      }
      setLoading(false);
    };
    check();
  }, [userId]);

  // Only show for sellers
  if (userRole !== "seller" || loading) return null;

  if (status === "verified") {
    return (
      <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
        <BadgeCheck className="w-5 h-5 text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-blue-500">Blue Verified</p>
          <p className="text-xs text-muted-foreground">Your seller account is verified</p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
        <Shield className="w-5 h-5 text-yellow-500" />
        <div>
          <p className="text-sm font-semibold text-yellow-500">Application Pending</p>
          <p className="text-xs text-muted-foreground">Your blue verification is under review</p>
        </div>
      </div>
    );
  }

  if (status === "no_subscription") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-muted/50 border border-border rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Blue Verification</p>
            <p className="text-xs text-muted-foreground">
              Purchase the R600 Selling Package (6 months) first to apply for blue verification.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // status === "apply" — has subscription, can apply
  const handleApply = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email to apply.", variant: "destructive" });
      return;
    }
    setApplying(true);
    const { error } = await supabase
      .from("seller_verifications")
      .insert({
        user_id: userId,
        is_verified: false,
        payment_amount: 600,
      });

    if (error) {
      toast({ title: "Error", description: "Failed to submit application. You may have already applied.", variant: "destructive" });
    } else {
      toast({ title: "Application Submitted", description: "Your blue verification application is under review." });
      setStatus("pending");
    }
    setApplying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">Apply for Blue Verification</p>
          <p className="text-xs text-muted-foreground">
            Enter your email to apply. We'll review your account.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={applying}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {applying ? "..." : "Apply"}
        </Button>
      </div>
    </motion.div>
  );
};
