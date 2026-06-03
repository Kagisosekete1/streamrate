import { useAuth } from "@/hooks/useAuth";

const SEEN_ADMIN_EMAIL = "kagisosekete5@gmail.com";

/**
 * Returns true only when the currently signed-in user is the designated
 * "seen-by / member-number" admin (kagisosekete5@gmail.com).
 * Used to gate visibility of post viewers, the "New Members" rail,
 * and signup-number badges across the app.
 */
export function useIsSeenAdmin(): boolean {
  const { profile, user } = useAuth();
  const email = (profile?.email || user?.email || "").trim().toLowerCase();
  return email === SEEN_ADMIN_EMAIL;
}
