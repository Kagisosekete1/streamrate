import React from "react";

// Verification badge configuration
const VERIFIED_ACCOUNTS: Record<string, "red" | "blue" | "gold"> = {
  "kgsinnocent@gmail.com": "red",
  "kagisosekete5@gmail.com": "blue",
  // Gold verified accounts
  "sheldzsteyn94@gmail.com": "gold",
  "leef4680@gmail.com": "gold",
  "paranigelactivity@gmail.com": "gold",
  "tjduo082@gmail.com": "gold",
  "valorain420@gmail.com": "gold",
  "leandidplsss78@gmail.com": "gold",
  "lelolego67@gmail.com": "gold",
  "thegamingyard6208@gmail.com": "gold",
  "semogrouppayments@gmail.com": "gold",
  "parrymichaeljungalism@gmail.com": "gold",
  "saikosairen@gmail.com": "gold",
  "mclyleward@gmail.com": "gold",
  "kagisosekete4@gmail.com": "gold",
  "sitholekuhle85@gmail.com": "gold",
  "seketefilmstv@gmail.com": "gold",
  "themorgueza@gmail.com": "gold",
  "oxydizeza@gmail.com": "gold",
  "phenyonyandex@gmail.com": "gold",
};

export const getVerificationBadge = (email: string | null | undefined): "red" | "blue" | "gold" | null => {
  if (!email) return null;
  return VERIFIED_ACCOUNTS[email.toLowerCase()] || null;
};

export const VerificationBadge = ({ email, className = "w-4 h-4" }: { email: string | null | undefined; className?: string }) => {
  const badge = getVerificationBadge(email);
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
