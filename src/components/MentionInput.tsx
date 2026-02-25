import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

interface MentionUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const MentionInput = ({
  value,
  onChange,
  placeholder,
  className = "",
  autoFocus = false,
  multiline = false,
  onKeyDown,
}: MentionInputProps) => {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .not("username", "is", null)
      .ilike("username", `${query}%`)
      .limit(6);

    if (data && data.length > 0) {
      setSuggestions(data.map(p => ({ id: p.id, username: p.username!, avatar_url: p.avatar_url })));
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleChange = (newValue: string) => {
    onChange(newValue);

    const el = inputRef.current;
    if (!el) return;

    const cursorPos = (el as HTMLTextAreaElement).selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Find the last @ before cursor that isn't preceded by a word char
    const mentionMatch = textBeforeCursor.match(/(?:^|[\s])@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const startIdx = textBeforeCursor.lastIndexOf("@" + query);
      setMentionQuery(query);
      setMentionStartIndex(startIdx);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchUsers(query), 200);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    }
  };

  const selectUser = (user: MentionUser) => {
    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(mentionStartIndex + 1 + mentionQuery.length);
    const newValue = `${before}@${user.username} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Restore focus
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        const pos = before.length + user.username.length + 2;
        (el as HTMLTextAreaElement).setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectUser(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="relative w-full">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 bottom-full mb-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${
                idx === selectedIndex ? "bg-secondary/50" : ""
              }`}
              onClick={() => selectUser(user)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <img
                src={user.avatar_url || getDefaultAvatar()}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium text-foreground">@{user.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
