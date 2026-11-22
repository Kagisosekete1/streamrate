export function buildReferralUrl(origin: string, referralCode: string): string {
  if (!referralCode) throw new Error("Referral code is required");
  return `${origin.replace(/\/$/, "")}/auth?ref=${encodeURIComponent(referralCode)}`;
}

export function parseReferralCode(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.pathname.endsWith("/auth")) return null;
    return u.searchParams.get("ref");
  } catch {
    return null;
  }
}

export function isValidReferralCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[a-z0-9_]{3,30}$/.test(code);
}

export function referralCodeMatchesHandle(code: string, handle: string): boolean {
  if (!code || !handle) return false;
  const normalized = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
  // Allow numeric collision suffix (e.g. "kristin1", "kristin2")
  return code === normalized || new RegExp(`^${normalized.slice(0, 22)}\\d+$`).test(code);
}
// Stored referral codes use letters, digits and underscores, so this prefix
// cannot collide with an existing code. Keep old links redeemable.
export function displayReferralCode(code: string): string {
  return /streamrate/i.test(code) ? "zyiro-" + btoa(code).replace(/=+$/, "") : code;
}

export function storedReferralCode(code: string): string {
  if (!code.startsWith("zyiro-")) return code;
  try {
    const decoded = atob(code.slice(6));
    return displayReferralCode(decoded) === code ? decoded : code;
  } catch { return code; }
}

export function zyiroInviteUrl(code: string): string {
  const origin = import.meta.env.VITE_PUBLIC_INVITE_ORIGIN || "https://streamrateapp.com";
  return buildReferralUrl(origin, displayReferralCode(code));
}
