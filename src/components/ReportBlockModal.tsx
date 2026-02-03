import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ReportBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username?: string;
  postId?: string;
  reelId?: string;
}

const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Violence or dangerous content",
  "Nudity or sexual content",
  "Misinformation",
  "Impersonation",
  "Other",
];

export const ReportBlockModal = ({
  isOpen,
  onClose,
  userId,
  username,
  postId,
  reelId,
}: ReportBlockModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "report" | "block">("choose");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!user || !selectedReason) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reported_post_id: postId || null,
      reported_reel_id: reelId || null,
      reason: selectedReason,
    });

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Failed to submit report", variant: "destructive" });
      return;
    }

    toast({ title: "Report submitted", description: "We'll review this content." });
    handleClose();
  };

  const handleBlock = async () => {
    if (!user) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: userId,
      reason: selectedReason || "User blocked",
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "User already blocked" });
      } else {
        toast({ title: "Failed to block user", variant: "destructive" });
      }
      return;
    }

    toast({ title: "User blocked", description: "You won't see their content anymore." });
    handleClose();
  };

  const handleReportAndBlock = async () => {
    if (!user || !selectedReason) return;

    setIsSubmitting(true);

    // Submit report
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reported_post_id: postId || null,
      reported_reel_id: reelId || null,
      reason: selectedReason,
    });

    // Block user
    await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: userId,
      reason: selectedReason,
    });

    setIsSubmitting(false);
    toast({ title: "Reported and blocked", description: "We'll review this content." });
    handleClose();
  };

  const handleClose = () => {
    setStep("choose");
    setSelectedReason(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-card rounded-2xl overflow-hidden border border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              {step === "choose" && "Report or Block"}
              {step === "report" && "Report Content"}
              {step === "block" && "Block User"}
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {step === "choose" && (
              <div className="space-y-3">
                <button
                  onClick={() => setStep("report")}
                  className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Report</p>
                    <p className="text-xs text-muted-foreground">Report this content for review</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("block")}
                  className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Ban className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Block {username || "User"}</p>
                    <p className="text-xs text-muted-foreground">Stop seeing their posts</p>
                  </div>
                </button>
              </div>
            )}

            {step === "report" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Why are you reporting this content?
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                        selectedReason === reason
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-secondary/50 hover:bg-secondary"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="gaming"
                    className="flex-1"
                    disabled={!selectedReason || isSubmitting}
                    onClick={handleReport}
                  >
                    {isSubmitting ? "Submitting..." : "Report"}
                  </Button>
                </div>

                <button
                  onClick={handleReportAndBlock}
                  disabled={!selectedReason || isSubmitting}
                  className="w-full text-center text-sm text-destructive hover:underline disabled:opacity-50"
                >
                  Report and Block
                </button>
              </div>
            )}

            {step === "block" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Block {username || "this user"}?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      They won't be able to see your profile, and you won't see their content.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("choose")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={handleBlock}
                  >
                    {isSubmitting ? "Blocking..." : "Block"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
