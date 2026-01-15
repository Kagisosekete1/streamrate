import { useNavigate } from "react-router-dom";

interface HashtagTextProps {
  text: string;
  className?: string;
}

export const HashtagText = ({ text, className = "" }: HashtagTextProps) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Regex to find hashtags
  const hashtagRegex = /#(\w+)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add clickable hashtag
    const hashtag = match[1];
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

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
};
