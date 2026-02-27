import React from "react";

// Manual verification overrides (red/blue only)
const VERIFIED_ACCOUNTS: Record<string, "red" | "blue"> = {
  "kgsinnocent@gmail.com": "red",
  "kagisosekete5@gmail.com": "blue",
};

// Gold verification is automatic for the first 100 signups
export const getVerificationBadge = (
  email: string | null | undefined,
  signupNumber?: number | null
): "red" | "blue" | "gold" | null => {
  if (!email) return null;
  
  // Check manual overrides first
  const manual = VERIFIED_ACCOUNTS[email.toLowerCase()];
  if (manual) return manual;
  
  // Auto-gold for first 100 signups
  if (signupNumber && signupNumber <= 100) return "gold";
  
  return null;
};

export const VerificationBadge = ({
  email,
  signupNumber,
  className = "w-4 h-4",
}: {
  email: string | null | undefined;
  signupNumber?: number | null;
  className?: string;
}) => {
  const badge = getVerificationBadge(email, signupNumber);
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
