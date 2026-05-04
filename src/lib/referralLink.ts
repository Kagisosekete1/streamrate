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