import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const domain = parsedUrl.hostname.replace("www.", "");
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <a
      href={url}
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
        <p className="text-xs text-muted-foreground truncate">{url}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
};
