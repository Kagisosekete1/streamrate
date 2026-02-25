import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface HashtagTextProps {
  text: string;
  className?: string;
}

export const HashtagText = ({ text, className = "" }: HashtagTextProps) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Combined regex: match URLs, @mentions, or hashtags
  const combinedRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|@(\w+)|#(\w+)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // URL match (http/https)
      const url = match[1];
      parts.push(
        <a
          key={`url-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline cursor-pointer font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    } else if (match[2]) {
      // www. URL match (no protocol)
      const url = match[2];
      parts.push(
        <a
          key={`www-${match.index}`}
          href={`https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline cursor-pointer font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    } else if (match[3]) {
      // @mention match
      const username = match[3];
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="text-primary hover:underline cursor-pointer font-medium"
          onClick={(e) => {
            e.stopPropagation();
            supabase
              .from("profiles")
              .select("id")
              .eq("username", username)
              .maybeSingle()
              .then(({ data }) => {
                if (data) navigate(`/streamer/${data.id}`);
              });
          }}
        >
          @{username}
        </span>
      );
    } else if (match[4]) {
      // Hashtag match
      const hashtag = match[4];
      parts.push(
        <span
          key={`${match.index}-${hashtag}`}
          className="text-primary hover:underline cursor-pointer font-medium"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hashtags/${hashtag}`);
          }}
        >
          #{hashtag}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
};
