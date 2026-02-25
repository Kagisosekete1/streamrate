import React from "react";

// Verification badge configuration
const VERIFIED_ACCOUNTS: Record<string, "red" | "blue"> = {
  "kgsinnocent@gmail.com": "red",
  "kagisosekete5@gmail.com": "blue",
};

export const getVerificationBadge = (email: string | null | undefined): "red" | "blue" | null => {
  if (!email) return null;
  return VERIFIED_ACCOUNTS[email.toLowerCase()] || null;
};

export const VerificationBadge = ({ email, className = "w-4 h-4" }: { email: string | null | undefined; className?: string }) => {
  const badge = getVerificationBadge(email);
  if (!badge) return null;

  const color = badge === "red" ? "hsl(0, 84%, 60%)" : "hsl(217, 91%, 60%)";

  return (
    <svg className={`${className} flex-shrink-0`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
