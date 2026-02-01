import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, RefreshCw, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIWritingAssistantProps {
  text: string;
  onApply: (newText: string) => void;
}

const actions = [
  { id: "fix_grammar", label: "Fix Grammar", icon: "✓" },
  { id: "rephrase", label: "Rephrase", icon: "🔄" },
  { id: "make_formal", label: "Make Formal", icon: "👔" },
  { id: "make_casual", label: "Make Casual", icon: "😊" },
  { id: "shorten", label: "Shorten", icon: "📝" },
  { id: "expand", label: "Expand", icon: "📖" },
];

export const AIWritingAssistant = ({ text, onApply }: AIWritingAssistantProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    if (!text.trim()) {
      toast({
        title: "No text to improve",
        description: "Write something first!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setActiveAction(action);
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-writing-assistant", {
        body: { text, action },
      });

      if (error) throw error;

      if (data?.result) {
        setSuggestion(data.result);
      } else {
        throw new Error("No result received");
      }
    } catch (error) {
      console.error("AI assistant error:", error);
      toast({
        title: "AI Assistant Error",
        description: error instanceof Error ? error.message : "Failed to process text",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onApply(suggestion);
      setSuggestion(null);
      setIsOpen(false);
      toast({ title: "Text updated!" });
    }
  };

  const handleRetry = () => {
    if (activeAction) {
      handleAction(activeAction);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        disabled={!text.trim()}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">AI Assist</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Writing Assistant</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSuggestion(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-3 grid grid-cols-2 gap-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-sm transition-all ${
                    activeAction === action.id && isLoading
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary/50 hover:bg-secondary text-foreground"
                  } disabled:opacity-50`}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Processing...</span>
                </div>
              </div>
            )}

            {/* Suggestion */}
            {suggestion && !isLoading && (
              <div className="px-3 pb-3 space-y-3">
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed">{suggestion}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="gaming"
                    onClick={handleApply}
                    className="flex-1 gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
