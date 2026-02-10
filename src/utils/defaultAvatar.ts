// Gender-based default avatar SVGs as data URIs
const MALE_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%236b7280'/%3E%3Cpath d='M20 85 Q20 62 50 62 Q80 62 80 85' fill='%236b7280'/%3E%3C/svg%3E";

const FEMALE_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Ccircle cx='50' cy='36' r='16' fill='%236b7280'/%3E%3Cpath d='M30 28 Q28 15 50 12 Q72 15 70 28' fill='%236b7280'/%3E%3Cpath d='M20 85 Q20 60 50 60 Q80 60 80 85' fill='%236b7280'/%3E%3C/svg%3E";

const NEUTRAL_AVATAR = MALE_AVATAR;

export const getDefaultAvatar = (gender?: string | null): string => {
  if (gender === "female") return FEMALE_AVATAR;
  if (gender === "male") return MALE_AVATAR;
  return NEUTRAL_AVATAR;
};
