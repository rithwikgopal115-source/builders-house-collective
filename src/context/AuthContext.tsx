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
  const { data: p, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_approved, is_admin, bio, what_building")
    .eq("id", uid)
    .maybeSingle();
  if (error) return; // query failed — preserve existing profile, don't wipe it
  if (p) {
    setProfile(p as ProfileLite);
    setIsAdmin(!!p.is_admin);
  } else {
    setProfile(null);
    setIsAdmin(false);
  }
};

  useEffect(() => {
    let initialized = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
  try {
    setSession(sess);
    setUser(sess?.user ?? null);
    if (sess?.user) {
      await loadProfile(sess.user.id);
    } else {
      setProfile(null);
      setIsAdmin(false);
    }
  } catch (e) {
    console.error("auth state change error", e);
  } finally {
    if (!initialized) {
      initialized = true;
      setLoading(false);
    }
  }
});
    // Fallback: if onAuthStateChange hasn't fired yet, getSession initializes fully.
    // Whichever resolves first wins via the `initialized` flag.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (initialized) return; // onAuthStateChange already handled it
      initialized = true;
      try {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        setLoading(false);
      }
    });

    // Hard timeout: if nothing resolved within 4s, unblock loading anyway
    const timeout = setTimeout(() => {
      if (\!initialized) {
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
