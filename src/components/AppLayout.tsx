import { ReactNode, useEffect, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Bell, LogOut, Shield } from "lucide-react";
import { AvatarBlock } from "./AvatarBlock";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global shell — no sidebar. Bottom-left stack of floating icons:
 *   avatar (→ /profile/:id), shield (admin only → /admin), logout.
 * Top-right: notification bell with unread dot (→ /notifications).
 *
 * Pages with their own custom shell (landing, login, waiting) should NOT
 * wrap themselves in <AppLayout/> — only logged-in app pages do.
 */
export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

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
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Top-right notification bell */}
      <Link
        to="/notifications"
        aria-label="notifications"
        className="fixed top-5 right-5 md:top-6 md:right-6 z-30 h-10 w-10 rounded-full flex items-center justify-center hairline bg-surface hover:bg-surface-elevated transition-colors"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </Link>

      <main className="min-w-0">{children}</main>

      {/* Bottom-left floating stack */}
      <div className="fixed bottom-5 left-5 md:bottom-6 md:left-6 z-30 flex flex-col gap-2">
        <Link
          to={`/profile/${user.id}`}
          aria-label="my profile"
          className="h-10 w-10 rounded-full overflow-hidden hairline hover:ring-2 hover:ring-primary/50 transition"
        >
          <AvatarBlock url={profile?.avatar_url} name={profile?.display_name ?? "?"} size={40} />
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            aria-label="admin"
            className="h-10 w-10 rounded-full flex items-center justify-center hairline bg-surface hover:bg-surface-elevated transition-colors"
          >
            <Shield className="h-4 w-4 text-primary" />
          </Link>
        )}
        <button
          onClick={signOut}
          aria-label="log out"
          className="h-10 w-10 rounded-full flex items-center justify-center hairline bg-surface hover:bg-surface-elevated transition-colors"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
