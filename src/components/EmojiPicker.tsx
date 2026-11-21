import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😜", "🤪", "🤩", "🥳", "😎", "🤗", "😏", "😌", "😔", "😢", "😭", "😤", "🤬", "🤯", "😱", "🥺"] },
  { name: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "💪", "🦾", "🙅", "🙆", "💁", "🙋"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💋", "💌", "💐", "🌹", "🌸", "💮", "🏵️", "🌺", "🌻", "🌼"] },
  { name: "Fire & Stars", emojis: ["🔥", "⭐", "🌟", "✨", "💫", "⚡", "💥", "💢", "💦", "💨", "🌈", "☀️", "🌙", "🎵", "🎶", "🎸", "🎤", "🎬", "🎮", "🏆", "🥇", "🥈", "🥉", "🎯", "🎪", "🎭", "🎨", "🎰", "🎲"] },
  { name: "Animals", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦄", "🐴", "🦋", "🐛", "🐝", "🐞", "🦀", "🐙", "🦑", "🐠", "🐬"] },
];

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [position, setPosition] = useState({ top: 8, left: 8 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const placePicker = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 16);
      setPosition({
        top: Math.max(8, Math.min(rect.top - 218, window.innerHeight - 250)),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      });
    };
    placePicker();
    window.addEventListener("resize", placePicker);
    window.addEventListener("scroll", placePicker, true);
    return () => {
      window.removeEventListener("resize", placePicker);
      window.removeEventListener("scroll", placePicker, true);
    };
  }, [isOpen]);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Choose an emoji"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
      >
        <Smile className="w-5 h-5 text-muted-foreground" />
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              style={{ top: position.top, left: position.left, width: "min(20rem, calc(100vw - 1rem))" }}
              className="fixed bg-card border border-border rounded-2xl shadow-xl z-[9999] overflow-hidden"
            >
              <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
                {EMOJI_CATEGORIES.map((category, index) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setActiveCategory(index)}
                    className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors ${activeCategory === index ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"}`}
                  >
                    {category.emojis[0]} {category.name}
                  </button>
                ))}
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      aria-label={`Insert ${emoji}`}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
