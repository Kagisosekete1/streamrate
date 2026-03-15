import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [resolvedThumbnailUrl, setResolvedThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedUrl) {
      setResolvedThumbnailUrl(null);
      return;
    }

    setThumbnailFailed(false);
    const instantThumbnail = getSocialThumbnailUrl(normalizedUrl);
    setResolvedThumbnailUrl(instantThumbnail);

    if (!isSocialLink(normalizedUrl)) return;

    let cancelled = false;

    const resolveFromBackend = async () => {
      const { data, error } = await supabase.functions.invoke<{ thumbnailUrl?: string }>("social-link-preview", {
        body: { url: normalizedUrl },
      });

      if (cancelled || error) return;

      const backendThumbnail = typeof data?.thumbnailUrl === "string" ? data.thumbnailUrl : null;
      if (backendThumbnail) {
        setResolvedThumbnailUrl(backendThumbnail);
      }
    };

    resolveFromBackend().catch(() => {
      // Keep current fallback state when backend resolution fails.
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedUrl]);

  if (!normalizedUrl) return null;

  const domain = getPreviewHostname(normalizedUrl);
  if (!domain) return null;

  const socialThumbnailUrl = getSocialThumbnailUrl(normalizedUrl);
  const shouldUseImageOnlyPreview = isSocialLink(normalizedUrl) && !!resolvedThumbnailUrl && !thumbnailFailed;
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
          src={resolvedThumbnailUrl}
          alt={`${domain} link preview`}
          className="w-full max-h-72 object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (socialThumbnailUrl && resolvedThumbnailUrl !== socialThumbnailUrl) {
              setResolvedThumbnailUrl(socialThumbnailUrl);
              return;
            }
            setThumbnailFailed(true);
          }}
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
