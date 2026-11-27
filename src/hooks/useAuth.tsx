import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, UserRole } from "@/lib/userRole";

import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  qr_handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  manual_verification_badge?: string | null;
  manual_verification_expires_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: AppRole | null;
  roleLoading: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole, gender?: string) => Promise<{ error: Error | null }>;
  chooseRoleOnce: (role: UserRole) => Promise<{ error: Error | null; assigned: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const [{ data: profileData, error: profileError }, { data: ownEmail, error: emailError }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, qr_handle, full_name, avatar_url, bio, country, manual_verification_badge, manual_verification_expires_at"
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase.rpc("get_my_email"),
    ]);

    if (profileError) {
      console.error("Unable to load the signed-in profile:", profileError);
    }
    if (emailError) {
      console.error("Unable to load the signed-in email:", emailError);
    }

    if (profileData) {
      // email is never exposed for other users; only the signed-in user's own
      // address is resolved server-side via the get_my_email() function.
      setProfile({ ...profileData, email: (ownEmail as string | null) ?? null });
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (roleError) {
      console.error("Unable to load the signed-in role:", roleError);
    }
    setUserRole(!roleError && roleData ? roleData.role as AppRole : null);
    setRoleLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let initialSessionResolved = false;
    let disposed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setRoleLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id);
            
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setRoleLoading(false);
        }
        // Do not let the auth callback race the initial persisted-session read.
        // Otherwise the auth screen can flash before the saved session is restored.
        if (initialSessionResolved) setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (disposed) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
      initialSessionResolved = true;
      setLoading(false);
    }).catch((error) => {
      console.error("Unable to restore the saved sign-in session:", error);
      if (!disposed) {
        initialSessionResolved = true;
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole, gender?: string) => {
    const redirectUrl = "https://streamrateapp.com/auth";

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          app_role: role,
          gender: gender ?? null,
        },
      },
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  const chooseRoleOnce = async (role: UserRole) => {
    const { data, error } = await supabase.rpc("choose_my_role_once", { _role: role });
    return {
      error: error ?? null,
      assigned: data === true,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
    setRoleLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (!error && data) {
      await fetchProfile(user.id);
    }

    return { error: error ?? (!data ? new Error("Profile update did not affect a row") : null) };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        roleLoading,
        loading,
        signUp,
        chooseRoleOnce,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
