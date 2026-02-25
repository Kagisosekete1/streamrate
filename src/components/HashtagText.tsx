import { useNavigate } from "react-router-dom";

interface HashtagTextProps {
  text: string;
  className?: string;
}

export const HashtagText = ({ text, className = "" }: HashtagTextProps) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Combined regex: match URLs or hashtags
  const combinedRegex = /(https?:\/\/[^\s]+)|#(\w+)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // URL match
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
      // Hashtag match
      const hashtag = match[2];
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
