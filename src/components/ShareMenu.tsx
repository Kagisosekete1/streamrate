import { useState, useRef } from "react";
import { ExternalLink, Link, Copy, Check, MessageCircle, Instagram, Twitter, Facebook, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareMenuProps {
  postId: string;
  title?: string;
  imageUrl?: string;
  authorUsername?: string | null;
  authorName?: string | null;
}

export const ShareMenu = ({ postId, title = "Check out this post", imageUrl, authorUsername, authorName }: ShareMenuProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/post/${postId}`;
  const handle = authorUsername ? `@${authorUsername}` : authorName || "";
  const attribution = handle ? ` by ${handle}` : "";
  const shareText = `${title}${attribution} – StreamRate`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=450");
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=450");
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StreamRate",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-2 text-foreground hover:opacity-60 transition-opacity">
          <ExternalLink className="w-6 h-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-3">
          {copied ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <Link className="w-5 h-5" />
          )}
          <span>Copy Link</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer gap-3">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleShareTelegram} className="cursor-pointer gap-3">
          <ExternalLink className="w-5 h-5 text-blue-400" />
          <span>Telegram</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer gap-3">
          <Twitter className="w-5 h-5" />
          <span>X (Twitter)</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer gap-3">
          <Facebook className="w-5 h-5 text-blue-500" />
          <span>Facebook</span>
        </DropdownMenuItem>

        {navigator.share && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer gap-3">
              <ExternalLink className="w-5 h-5 text-primary" />
              <span>More Options...</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
