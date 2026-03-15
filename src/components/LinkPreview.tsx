import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  getPreviewHostname,
  getSocialThumbnailUrl,
  isSocialLink,
  normalizePreviewUrl,
} from "@/lib/urlPreview";

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  const normalizedUrl = useMemo(() => normalizePreviewUrl(url), [url]);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  if (!normalizedUrl) return null;

  const domain = getPreviewHostname(normalizedUrl);
  if (!domain) return null;

  const socialThumbnailUrl = getSocialThumbnailUrl(normalizedUrl);
  const shouldUseImageOnlyPreview = isSocialLink(normalizedUrl) && !!socialThumbnailUrl && !thumbnailFailed;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  if (shouldUseImageOnlyPreview) {
    return (
      <a
        href={normalizedUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block mx-4 my-2 rounded-xl overflow-hidden border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
      >
        <img
          src={socialThumbnailUrl}
          alt={`${domain} link preview`}
          className="w-full max-h-72 object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setThumbnailFailed(true)}
        />
      </a>
    );
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 mx-4 my-2 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
    >
      <img
        src={faviconUrl}
        alt={domain}
        className="w-10 h-10 rounded-lg object-contain bg-background p-1 shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{domain}</p>
        <p className="text-xs text-muted-foreground truncate">{normalizedUrl}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
};
