import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileLite {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_approved: boolean;
  is_admin: boolean;
  bio: string | null;
  what_building: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: ProfileLite | null;
  isAdmin: boolean;
  loading: boolean;        // true until we know if user is signed in or out
  profileLoading: boolean; // true while fetching the profile row from DB
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);       // auth-state phase
  const [profileLoading, setProfileLoading] = useState(false); // profile-fetch phase

  const loadProfile = async (uid: string): Promise<void> => {
    setProfileLoading(true);
    try {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, is_approved, is_admin, bio, what_building")
        .eq("id", uid)
        .maybeSingle();
      if (error) return; // preserve existing profile on error
      if (p) {
        setProfile(p as ProfileLite);
        setIsAdmin(!!p.is_admin);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (!sess?.user) {
        setProfile(null);
        setIsAdmin(false);
      } else {
        // Fire profile fetch in the background — do NOT await
        loadProfile(sess.user.id);
      }
      // Mark auth state as resolved immediately (no profile wait)
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    // Fallback: getSession resolves auth state if onAuthStateChange is slow
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (initialized) return; // already handled by onAuthStateChange
      initialized = true;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
        setIsAdmin(false);
      } else {
        loadProfile(s.user.id);
      }
      setLoading(false);
    });

    // Hard timeout — in case Supabase JS never fires (e.g. network totally down)
    const timeout = setTimeout(() => {
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    }, 4000);

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, profileLoading, isAdmin, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
