import { supabase } from "@/integrations/supabase/client";

export const sanitizeQrHandle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

export const isValidQrHandle = (value: string) => /^[a-z][a-z0-9_]{2,29}$/.test(value);

export const buildProfileQrUrl = (handle: string) => `https://streamrateapp.com/u/${handle}`;

export const checkQrHandleAvailable = async (handle: string, currentUserId?: string) => {
  const normalized = sanitizeQrHandle(handle);

  if (!isValidQrHandle(normalized)) {
    return { available: false, normalized, reason: "Use 3-30 characters, start with a letter, and use only lowercase letters, numbers, or underscores." };
  }

  const { data: profileMatch } = await supabase
    .from("profiles")
    .select("id")
    .eq("qr_handle", normalized)
    .maybeSingle();

  if (profileMatch && profileMatch.id !== currentUserId) {
    return { available: false, normalized, reason: "This QR handle is already taken." };
  }

  const { data: aliasMatch } = await (supabase as any)
    .from("profile_qr_aliases")
    .select("profile_id")
    .eq("alias", normalized)
    .maybeSingle();

  if (aliasMatch && aliasMatch.profile_id !== currentUserId) {
    return { available: false, normalized, reason: "This QR handle is already reserved by an existing profile link." };
  }

  return { available: true, normalized, reason: null };
};

export const resolveProfileRouteParam = async (rawParam?: string) => {
  if (!rawParam) return null;
  const param = rawParam.toLowerCase();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const fetchById = async (profileId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, qr_handle")
      .eq("id", profileId)
      .maybeSingle();

    return data ? { profileId: data.id, qrHandle: (data as any).qr_handle as string } : null;
  };

  const { data: qrMatch } = await supabase
    .from("profiles")
    .select("id, qr_handle")
    .eq("qr_handle", param)
    .maybeSingle();

  if (qrMatch) return { profileId: qrMatch.id, qrHandle: (qrMatch as any).qr_handle as string };

  if (uuidPattern.test(param)) return fetchById(param);

  if (param.startsWith("user-")) {
    const signupNumber = Number(param.replace("user-", ""));
    if (!Number.isNaN(signupNumber)) {
      const { data } = await supabase
        .from("profiles")
        .select("id, qr_handle")
        .eq("signup_number", signupNumber)
        .maybeSingle();

      if (data) return { profileId: data.id, qrHandle: (data as any).qr_handle as string };
    }
  }

  const { data: aliasMatch } = await (supabase as any)
    .from("profile_qr_aliases")
    .select("profile_id")
    .eq("alias", param)
    .maybeSingle();

  if (aliasMatch?.profile_id) return fetchById(aliasMatch.profile_id);

  const { data: usernameMatch } = await supabase
    .from("profiles")
    .select("id, qr_handle")
    .eq("username", param)
    .maybeSingle();

  return usernameMatch ? { profileId: usernameMatch.id, qrHandle: (usernameMatch as any).qr_handle as string } : null;
};