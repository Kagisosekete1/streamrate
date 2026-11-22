import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRoundSearch } from "lucide-react";
import { ProfileAvatarImage } from "@/components/ProfileAvatarImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SuggestedCreator {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

async function readFollowing(userId: string) {
  const rows: { following_id: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("follows").select("following_id")
      .eq("follower_id", userId).order("following_id").range(offset, offset + 499);
    if (error) return { data: rows, error };
    rows.push(...data);
    if (data.length < 500) return { data: rows, error: null };
  }
}

export function CreatorSuggestions() {
  const { user } = useAuth();
  return user ? <Suggestions key={user.id} user={user} /> : null;
}

function Suggestions({ user }: { user: { id: string } }) {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [suggestedCreatorsLoading, setSuggestedCreatorsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const fetchCreators = async () => {
      const request = ++revision;
      setSuggestedCreatorsLoading(true);
      const [{ data: roles }, followResult] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "streamer"),
        readFollowing(user.id),
      ]);
      if (followResult.error) {
        if (active && request === revision) {
          setSuggestedCreators([]);
          setSuggestedCreatorsLoading(false);
          setFailed(true);
        }
        return;
      }
      const followedIds = new Set(followResult.data.map(row => row.following_id));
      const creatorIds = [...new Set((roles || []).map((row) => row.user_id))].filter((id) => id !== user?.id && !followedIds.has(id));
      let profiles: SuggestedCreator[] = [];
      if (creatorIds.length) {
        const result = await supabase.from("profiles").select("id, username, full_name, avatar_url")
          .in("id", creatorIds).or("is_deactivated.is.null,is_deactivated.eq.false").limit(40);
        profiles = result.data || [];
      }
      // Some legacy creator profiles predate the user_roles row. Keep the
      // section useful by falling back to profiles with a public stream link.
      if (!profiles.length) {
        const result = await supabase.from("profiles").select("id, username, full_name, avatar_url")
          .or("is_deactivated.is.null,is_deactivated.eq.false").limit(40);
        profiles = result.data || [];
      }
      if (active && request === revision) {
        setFailed(false);
        setSuggestedCreators(profiles.filter((profile) => profile.id !== user?.id && !followedIds.has(profile.id)).slice(0, 8));
        setSuggestedCreatorsLoading(false);
      }
    };
    void fetchCreators();
    const channel = supabase.channel(`suggested-creators-${user?.id || "guest"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => void fetchCreators());
    if (user) channel.on("postgres_changes", { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, () => void fetchCreators());
    channel.subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);
  return (
          <section className="mb-5 rounded-2xl border border-border/60 bg-card/50 p-3" aria-label="Creators you may know">
              <div className="flex items-center gap-2 mb-3">
                <UserRoundSearch className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Creators you may know</h2>
              </div>
              {suggestedCreators.length > 0 ? <div className="flex gap-3 overflow-x-auto pb-2">
                {suggestedCreators.map((creator) => (
                  <button key={creator.id} onClick={() => navigate(`/streamer/${creator.id}`)} className="flex min-w-28 max-w-32 flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-3 text-center hover:border-primary/50">
                    <ProfileAvatarImage src={creator.avatar_url || ""} alt={creator.username || creator.full_name || "Creator"} className="h-14 w-14 rounded-full object-cover" />
                    <span className="w-full truncate text-xs font-medium">@{creator.username || creator.full_name || "creator"}</span>
                  </button>
                ))}
              </div> : <p className="py-2 text-sm text-muted-foreground">{failed ? "Creator suggestions are unavailable." : suggestedCreatorsLoading ? "Finding creators for you…" : "New creator suggestions will show here as more streamers join."}</p>}
          </section>
  );
}
