import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😜", "🤪", "🤩", "🥳", "😎", "🤗", "😏", "😌", "😔", "😢", "😭", "😤", "🤬", "🤯", "😱", "🥺"]
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "💪", "🦾", "🙅", "🙆", "💁", "🙋"]
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💋", "💌", "💐", "🌹", "🌸", "💮", "🏵️", "🌺", "🌻", "🌼"]
  },
  {
    name: "Fire & Stars",
    emojis: ["🔥", "⭐", "🌟", "✨", "💫", "⚡", "💥", "💢", "💦", "💨", "🌈", "☀️", "🌙", "⭐", "🎵", "🎶", "🎸", "🎤", "🎬", "🎮", "🏆", "🥇", "🥈", "🥉", "🎯", "🎪", "🎭", "🎨", "🎰", "🎲"]
  },
  {
    name: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦄", "🐴", "🦋", "🐛", "🐝", "🐞", "🦀", "🐙", "🦑", "🐠", "🐬"]
  }
];

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
      >
        <Smile className="w-5 h-5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Picker */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {/* Category tabs */}
              <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
                {EMOJI_CATEGORIES.map((category, index) => (
                  <button
                    key={category.name}
                    onClick={() => setActiveCategory(index)}
                    className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
                      activeCategory === index
                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {category.emojis[0]} {category.name}
                  </button>
                ))}
              </div>

              {/* Emojis grid */}
              <div className="p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
                    <button
                      key={index}
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
        )}
      </AnimatePresence>
    </div>
  );
};
