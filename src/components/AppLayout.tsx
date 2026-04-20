import { ReactNode, useEffect, useState } from "react";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Bell, LogOut, Shield } from "lucide-react";
import { AvatarBlock } from "./AvatarBlock";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global shell — single top bar holds the wordmark left and all chrome right
 * (bell with unread dot, profile avatar, admin shield, logout).
 *
 * Pages with their own custom shell (landing, login, waiting) should NOT
 * wrap themselves in <AppLayout/> — only logged-in app pages do.
 */
export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  const handleSignOut = async () => {
    await signOut();
    nav("/");
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`notif-badge:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">loading…</div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
      {/* Top bar — wordmark left, all chrome right */}
      <header
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 md:px-8 h-14"
        style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          to="/home"
          className="text-sm font-medium tracking-tight transition-colors"
          style={{ color: "#F5F0EB" }}
        >
          builders house.
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            to="/notifications"
            aria-label="notifications"
            className="relative h-9 w-9 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <Bell className="h-4 w-4" style={{ color: "#A09890" }} />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                style={{ background: "#E8734A" }}
              />
            )}
          </Link>

          <Link
            to={`/profile/${user.id}`}
            aria-label="my profile"
            className="h-8 w-8 rounded-full overflow-hidden transition-opacity hover:opacity-80"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <AvatarBlock url={profile?.avatar_url} name={profile?.display_name ?? "?"} size={32} />
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              aria-label="admin"
              className="h-9 w-9 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
            >
              <Shield className="h-4 w-4" style={{ color: "#E8734A" }} />
            </Link>
          )}

          <button
            onClick={handleSignOut}
            aria-label="log out"
            className="h-9 w-9 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" style={{ color: "#A09890" }} />
          </button>
        </div>
      </header>

      <main className="min-w-0 pt-14">{children}</main>
    </div>
  );
};
