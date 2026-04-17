import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, Pin, Zap, Lightbulb, Music, Briefcase, Trophy, Shield, LogOut, ListChecks, Bell } from "lucide-react";
import { AvatarBlock } from "./AvatarBlock";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  resources: Pin, "ai-news": Zap, ideas: Lightbulb,
  vibing: Music, hiring: Briefcase, wins: Trophy,
};

interface Channel { id: string; slug: string; name: string; }

export const Sidebar = () => {
  const { profile, isAdmin, signOut, user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      if (data) setChannels(data);
    });
    if (user) {
      supabase.from("notifications").select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id).eq("is_read", false)
        .then(({ count }) => setUnreadCount(count ?? 0));
    }
  }, [user]);

  return (
    <aside className="hidden md:flex w-16 shrink-0 flex-col items-center bg-surface hairline-r h-screen sticky top-0 py-4">
      <Link to="/home" className="h-9 w-9 rounded-lg flex items-center justify-center mb-6"
        style={{ background: "#1E1E1E" }}>
        <span className="font-bold text-sm" style={{ color: "#E8734A" }}>BH</span>
      </Link>

      <nav className="flex-1 flex flex-col items-center gap-1.5">
        <NavIcon to="/home" icon={LayoutGrid} active={location.pathname === "/home"} label="home" />
        {channels.map((c) => {
          const Icon = ICONS[c.slug] ?? Pin;
          const path = `/channel/${c.slug}`;
          return <NavIcon key={c.id} to={path} icon={Icon} active={location.pathname === path} label={c.name} />;
        })}
        <NavIcon to="/tasks" icon={ListChecks} active={location.pathname === "/tasks"} label="tasks" />
      </nav>

      <div className="flex flex-col items-center gap-1.5 hairline-t pt-3 w-full">
        {isAdmin && <NavIcon to="/admin" icon={Shield} active={location.pathname.startsWith("/admin")} label="admin" />}
        <NavIcon to="/notifications" icon={Bell} active={false} label="notifications" badge={unreadCount} />
        {user && (
          <Link to={`/profile/${user.id}`} className="mt-1" title="profile">
            <AvatarBlock url={profile?.avatar_url} name={profile?.display_name ?? "me"} size={32} />
          </Link>
        )}
        <button onClick={signOut} title="sign out"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

const NavIcon = ({ to, icon: Icon, active, label, badge }: any) => (
  <Link to={to} title={label}
    className={cn(
      "relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
      active ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
    )}>
    <Icon className="h-4 w-4" />
    {active && <span className="absolute -left-1 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />}
    {badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-[8px] font-mono flex items-center justify-center text-primary-foreground">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </Link>
);
