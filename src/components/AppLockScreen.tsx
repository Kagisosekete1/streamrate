import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Delete } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppLockScreenProps {
  onUnlock: () => void;
}

export const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (enteredPin: string) => {
    const { user } = (await supabase.auth.getUser()).data;
    if (!user) return;

    const { data } = await supabase
      .from("app_lock_settings")
      .select("pin_hash")
      .eq("user_id", user.id)
      .eq("is_enabled", true)
      .maybeSingle();

    if (data && data.pin_hash === hashPin(enteredPin)) {
      sessionStorage.setItem("app_unlocked", "true");
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Enter PIN</h2>
        <p className="text-sm text-muted-foreground mb-8">Enter your 4-digit PIN to unlock</p>

        {/* PIN dots */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all",
                pin.length > i
                  ? error ? "bg-destructive border-destructive" : "bg-primary border-primary"
                  : "border-muted-foreground"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm mb-4">Incorrect PIN</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {["1","2","3","4","5","6","7","8","9","","0","del"].map(key => (
            <button
              key={key}
              onClick={() => {
                if (key === "del") handleDelete();
                else if (key !== "") handleDigit(key);
              }}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold transition-all",
                key === "" && "invisible",
                key === "del"
                  ? "text-muted-foreground"
                  : "bg-secondary text-foreground active:bg-primary active:text-primary-foreground"
              )}
            >
              {key === "del" ? <Delete className="w-6 h-6" /> : key}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Simple hash for PIN (not crypto-secure, but sufficient for app-level lock)
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
