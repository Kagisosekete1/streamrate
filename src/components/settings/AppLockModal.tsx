import { useState, useEffect } from "react";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hashPin } from "@/components/AppLockScreen";
import { cn } from "@/lib/utils";

interface AppLockModalProps {
  onClose: () => void;
}

export const AppLockModal = ({ onClose }: AppLockModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPin, setHasPin] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [settingPin, setSettingPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("app_lock_settings")
      .select("is_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasPin(true);
          setIsEnabled(data.is_enabled);
        }
      });
  }, [user]);

  const handleDigit = (digit: string) => {
    if (step === "enter") {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          setStep("confirm");
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            savePin(pin);
          } else {
            toast({ title: "PINs don't match", variant: "destructive" });
            setPin("");
            setConfirmPin("");
            setStep("enter");
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === "enter") setPin(prev => prev.slice(0, -1));
    else setConfirmPin(prev => prev.slice(0, -1));
  };

  const savePin = async (pinValue: string) => {
    if (!user) return;
    const hashed = hashPin(pinValue);

    await supabase.from("app_lock_settings").upsert({
      user_id: user.id,
      pin_hash: hashed,
      is_enabled: true,
    }, { onConflict: "user_id" });

    toast({ title: "PIN set successfully!" });
    setHasPin(true);
    setIsEnabled(true);
    setSettingPin(false);
    sessionStorage.setItem("app_unlocked", "true");
  };

  const toggleEnabled = async (enabled: boolean) => {
    if (!user) return;
    await supabase
      .from("app_lock_settings")
      .update({ is_enabled: enabled })
      .eq("user_id", user.id);
    setIsEnabled(enabled);
    if (!enabled) sessionStorage.setItem("app_unlocked", "true");
  };

  const removePin = async () => {
    if (!user) return;
    await supabase
      .from("app_lock_settings")
      .delete()
      .eq("user_id", user.id);
    setHasPin(false);
    setIsEnabled(false);
    sessionStorage.setItem("app_unlocked", "true");
    toast({ title: "PIN removed" });
  };

  const currentPin = step === "enter" ? pin : confirmPin;

  if (settingPin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card rounded-2xl p-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-foreground text-center mb-2">
            {step === "enter" ? "Set PIN" : "Confirm PIN"}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {step === "enter" ? "Enter a 4-digit PIN" : "Re-enter your PIN"}
          </p>

          <div className="flex gap-3 justify-center mb-6">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={cn(
                  "w-3.5 h-3.5 rounded-full border-2 transition-all",
                  currentPin.length > i ? "bg-primary border-primary" : "border-muted-foreground"
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map(key => (
              <button
                key={key}
                onClick={() => {
                  if (key === "⌫") handleDelete();
                  else if (key !== "") handleDigit(key);
                }}
                className={cn(
                  "w-14 h-14 mx-auto rounded-full flex items-center justify-center text-lg font-semibold transition-all",
                  key === "" && "invisible",
                  key === "⌫" ? "text-muted-foreground" : "bg-secondary text-foreground active:bg-primary active:text-primary-foreground"
                )}
              >
                {key}
              </button>
            ))}
          </div>

          <Button variant="ghost" className="w-full mt-4" onClick={() => {
            setSettingPin(false);
            setPin("");
            setConfirmPin("");
            setStep("enter");
          }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">App Lock</h3>
            <p className="text-sm text-muted-foreground">Secure your app with a PIN</p>
          </div>
        </div>

        {hasPin ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
              <span className="text-foreground font-medium">Enable PIN Lock</span>
              <Switch checked={isEnabled} onCheckedChange={toggleEnabled} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              setSettingPin(true);
              setPin("");
              setConfirmPin("");
              setStep("enter");
            }}>
              Change PIN
            </Button>
            <Button variant="destructive" className="w-full gap-2" onClick={removePin}>
              <Trash2 className="w-4 h-4" /> Remove PIN
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Set a 4-digit PIN to lock your app. You'll need to enter it each time you open the app.
            </p>
            <Button className="w-full" onClick={() => setSettingPin(true)}>
              Set PIN
            </Button>
          </div>
        )}

        <Button variant="ghost" className="w-full mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};
