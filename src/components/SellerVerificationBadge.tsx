import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [status, setStatus] = useState<"none" | "pending" | "verified">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        if (data.is_verified && new Date(data.expires_at!) > new Date()) {
          setStatus("verified");
        } else {
          setStatus("pending");
        }
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

  if (status === "none") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Apply for Blue Status</p>
            <p className="text-xs text-muted-foreground">
              Get verified to sell in the store. R600 every 6 months.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};
