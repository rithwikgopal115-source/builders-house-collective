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
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string): Promise<void> => {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_approved, is_admin, bio, what_building")
      .eq("id", uid)
      .maybeSingle();

    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();

    if (p) {
      setProfile(p as ProfileLite);
      setIsAdmin(!!r || !!p.is_admin);
    } else {
      // No profile row — treat as unapproved visitor, do not hang
      setProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        await loadProfile(sess.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }

      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    // Fallback: if there is no session and onAuthStateChange hasn't fired, unblock loading
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s && !initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    return () => {
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
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
