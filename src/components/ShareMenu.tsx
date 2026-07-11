import { useState } from "react";
import { ExternalLink, Link, Check, MessageCircle, Twitter, Facebook } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCanonicalPostUrl, getShareDestinationUrl, getPostShareTargetUrl, type ShareDestination } from "@/lib/shareLinks";

interface ShareMenuProps {
  postId: string;
  title?: string;
  imageUrl?: string;
  authorUsername?: string | null;
  authorName?: string | null;
}

export const ShareMenu = ({ postId, title = "Check out this post", imageUrl, authorUsername, authorName }: ShareMenuProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const appOrigin = window.location.origin;
  const functionsOrigin = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const shareUrl = getCanonicalPostUrl(appOrigin, postId);
  const handle = authorUsername ? `@${authorUsername}` : authorName || "";
  const attribution = handle ? ` by ${handle}` : "";
  const shareText = `${title}${attribution} – StreamRate`;

  const recordShare = async (destination: string) => {
    if (!user) return;
    try {
      await supabase.from("post_shares").insert({
        post_id: postId,
        user_id: user.id,
        destination,
      });
    } catch {
      /* non-blocking */
    }
  };

  const getTarget = (destination: ShareDestination) =>
    getPostShareTargetUrl({ destination, postId, origin: appOrigin, functionsOrigin });

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
      recordShare("copy_link");
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareDestinationUrl({ destination: "twitter", postId, origin: appOrigin, functionsOrigin, shareText });
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=450");
    recordShare("twitter");
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareDestinationUrl({ destination: "facebook", postId, origin: appOrigin, functionsOrigin, shareText });
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=450");
    recordShare("facebook");
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareDestinationUrl({ destination: "whatsapp", postId, origin: appOrigin, functionsOrigin, shareText });
    window.open(url, "_blank", "noopener,noreferrer");
    recordShare("whatsapp");
  };

  const handleShareTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareDestinationUrl({ destination: "telegram", postId, origin: appOrigin, functionsOrigin, shareText });
    window.open(url, "_blank", "noopener,noreferrer");
    recordShare("telegram");
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StreamRate",
          text: shareText,
          url: getTarget("native"),
        });
        recordShare("native");
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
