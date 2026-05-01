import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PartyComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

export const WatchPartyComments = ({ partyId }: { partyId: string }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<PartyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const enrich = async (rows: { id: string; user_id: string; content: string; created_at: string }[]) => {
    if (rows.length === 0) return [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    const map = new Map((profiles || []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      username: map.get(r.user_id)?.username ?? null,
      full_name: map.get(r.user_id)?.full_name ?? null,
      avatar_url: map.get(r.user_id)?.avatar_url ?? null,
    }));
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("watch_party_comments")
        .select("id, user_id, content, created_at")
        .eq("party_id", partyId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!mounted) return;
      setComments(await enrich(data || []));
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    };
    load();

    const channel = supabase
      .channel(`party-comments-${partyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "watch_party_comments", filter: `party_id=eq.${partyId}` },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string; content: string; created_at: string };
          const [enriched] = await enrich([row]);
          setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, enriched]));
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "watch_party_comments", filter: `party_id=eq.${partyId}` },
        (payload) => {
          const old = payload.old as { id: string };
          setComments((prev) => prev.filter((c) => c.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [partyId]);

  const send = async () => {
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    const content = text.trim();
    if (!content) return;
    if (content.length > 500) {
      toast.error("Keep it under 500 characters");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("watch_party_comments")
      .insert({ party_id: partyId, user_id: user.id, content });
    setSending(false);
    if (error) {
      toast.error("Couldn't send comment");
      return;
    }
    setText("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("watch_party_comments").delete().eq("id", id);
    if (error) toast.error("Couldn't delete");
  };

  return (
    <div className="flex flex-col border-t border-border/50">
      <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Party chat
      </div>
      <div ref={scrollRef} className="px-4 py-2 max-h-72 overflow-y-auto space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
          </>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Be the first to say something.</p>
        ) : (
          comments.map((c) => {
            const name = c.username || c.full_name || "User";
            const isMine = user?.id === c.user_id;
            return (
              <div key={c.id} className="flex items-start gap-2 group">
                <img
                  src={
                    c.avatar_url ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"
                  }
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">@{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">{c.content}</p>
                </div>
                {isMine && (
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="Delete comment"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 flex gap-2 border-t border-border/50">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={user ? "Say something to the party…" : "Sign in to chat"}
          disabled={!user || sending}
          maxLength={500}
          aria-label="Write a watch party comment"
        />
        <Button onClick={send} disabled={!user || sending || !text.trim()} size="icon" aria-label="Send comment">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};