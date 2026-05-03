import React from "react";

// Hardcoded manual verification overrides (legacy — kept for backwards compatibility)
const VERIFIED_ACCOUNTS: Record<string, "red" | "blue"> = {
  "kgsinnocent@gmail.com": "red",
  "kagisosekete5@gmail.com": "blue",
};

export type BadgeColor = "red" | "blue" | "gold";

// Gold = first 100 signups. Manual badge (from DB) overrides.
// A manual badge with an expires_at in the past is ignored.
export const getVerificationBadge = (
  email: string | null | undefined,
  signupNumber?: number | null,
  manualBadge?: string | null,
  manualExpiresAt?: string | null
): BadgeColor | null => {
  // 1. Database-driven manual badge (e.g. earned via referral)
  if (manualBadge && (manualBadge === "red" || manualBadge === "blue" || manualBadge === "gold")) {
    if (!manualExpiresAt || new Date(manualExpiresAt).getTime() > Date.now()) {
      return manualBadge as BadgeColor;
    }
  }

  // 2. Legacy hardcoded overrides
  if (email) {
    const manual = VERIFIED_ACCOUNTS[email.toLowerCase()];
    if (manual) return manual;
  }

  // 3. Auto-gold for first 100 signups
  if (signupNumber && signupNumber <= 100) return "gold";

  return null;
};

export const VerificationBadge = ({
  email,
  signupNumber,
  manualBadge,
  manualExpiresAt,
  className = "w-4 h-4",
}: {
  email?: string | null;
  signupNumber?: number | null;
  manualBadge?: string | null;
  manualExpiresAt?: string | null;
  className?: string;
}) => {
  const badge = getVerificationBadge(email, signupNumber, manualBadge, manualExpiresAt);
  if (!badge) return null;

  const colorMap = {
    red: "hsl(0, 84%, 60%)",
    blue: "hsl(217, 91%, 60%)",
    gold: "hsl(45, 93%, 47%)",
  };

  const color = colorMap[badge];

  return (
    <svg className={`${className} flex-shrink-0`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
