import { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Bug, 
  AlertTriangle, 
  User, 
  Shield, 
  HelpCircle,
  Send,
  Mail,
  MessageSquare,
  Camera,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ReportProblemModalProps {
  onClose: () => void;
}

const CONTACT_EMAIL = "seketefilmstv@gmail.com";

const PROBLEM_TYPES = [
  {
    id: "bug",
    icon: Bug,
    title: "Bug / Technical Issue",
    description: "Something isn't working as expected",
    examples: "App crashes, features not loading, error messages"
  },
  {
    id: "abuse",
    icon: AlertTriangle,
    title: "Abuse / Harassment",
    description: "Report harmful behavior from another user",
    examples: "Bullying, threats, hate speech, stalking"
  },
  {
    id: "fake",
    icon: User,
    title: "Fake Profile / Impersonation",
    description: "Someone pretending to be someone else",
    examples: "Fake accounts, impersonating streamers, identity theft"
  },
  {
    id: "content",
    icon: Shield,
    title: "Inappropriate Content",
    description: "Content that violates our guidelines",
    examples: "Explicit material, violence, spam, misinformation"
  },
  {
    id: "security",
    icon: Shield,
    title: "Security Concern",
    description: "Account security or privacy issues",
    examples: "Account hacked, suspicious activity, data concerns"
  },
  {
    id: "other",
    icon: HelpCircle,
    title: "Other",
    description: "Something else not listed above",
    examples: "Suggestions, feedback, questions"
  }
];

export const ReportProblemModal = ({ onClose }: ReportProblemModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"type" | "details" | "success">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) {
      toast({ title: "Please provide details about the issue", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setStep("success");
  };

  const selectedTypeInfo = PROBLEM_TYPES.find(t => t.id === selectedType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <button 
            onClick={() => {
              if (step === "details") setStep("type");
              else onClose();
            }}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Report a Problem</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {step === "type" && "Select the type of issue"}
              {step === "details" && "Provide details"}
              {step === "success" && "Report submitted"}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "type" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                What type of problem are you experiencing? Select the most relevant category below.
              </p>
              
              {PROBLEM_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id);
                    setStep("details");
                  }}
                  className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <type.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{type.title}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Examples: {type.examples}
                    </p>
                  </div>
                </button>
              ))}

              {/* Direct Email Option */}
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Prefer email?</p>
                    <p className="text-xs text-muted-foreground">
                      Contact us directly at{" "}
                      <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                        {CONTACT_EMAIL}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "details" && selectedTypeInfo && (
            <div className="space-y-4">
              {/* Selected Type */}
              <div className="p-4 bg-secondary/50 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <selectedTypeInfo.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedTypeInfo.title}</p>
                  <button 
                    onClick={() => setStep("type")}
                    className="text-xs text-primary hover:underline"
                  >
                    Change category
                  </button>
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Describe the problem
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please provide as much detail as possible. Include steps to reproduce the issue if applicable..."
                  className="w-full min-h-[150px] rounded-xl border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {message.length}/1000 characters
                </p>
              </div>

              {/* Tips */}
              <div className="p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Tips for a helpful report
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Be specific about what happened and when</li>
                  <li>• Include any error messages you saw</li>
                  <li>• Describe what you expected to happen</li>
                  <li>• Mention your device type and app version if relevant</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                variant="gaming"
                className="w-full"
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>

              {/* Email Alternative */}
              <p className="text-center text-xs text-muted-foreground">
                Or email us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Report Submitted</h3>
              <p className="text-muted-foreground mb-6">
                Thank you for helping us improve StreamRate. Our team will review your report 
                and take appropriate action. You may receive a follow-up email if we need 
                more information.
              </p>
              
              <div className="p-4 bg-secondary/50 rounded-xl mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Reference:</strong>{" "}
                  #{Date.now().toString(36).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save this reference number for future correspondence
                </p>
              </div>

              <div className="space-y-3">
                <Button variant="gaming" className="w-full" onClick={onClose}>
                  Done
                </Button>
                <p className="text-xs text-muted-foreground">
                  Need immediate help? Email us at{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
