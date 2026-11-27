export const USER_ROLES = ["fan", "streamer", "gamer", "seller"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AppRole = UserRole | "admin";

export const getRoleLabel = (role: string | null | undefined): string => {
  switch (role?.toLowerCase()) {
    case "fan": return "Fan";
    case "streamer": return "Streamer";
    case "gamer": return "Gamer";
    case "seller": return "Seller";
    case "admin": return "Admin";
    default: return "Fan";
  }
};
