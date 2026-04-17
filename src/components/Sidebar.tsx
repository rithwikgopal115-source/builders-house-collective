import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Sparkles, Briefcase, Music, Lightbulb, User, Shield, LogOut, Home } from "lucide-react";
import { AvatarBlock } from "./AvatarBlock";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = { BookOpen, Sparkles, Briefcase, Music, Lightbulb };

interface Channel { id: string; slug: string; name: string; icon: string | null; }

export const Sidebar = () => {
  const { profile, isAdmin, signOut, user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const location = useLocation();

  useEffect(() => {
    supabase.from("channels").select("id, slug, name, icon").order("sort_order").then(({ data }) => {
      if (data) setChannels(data);
    });
  }, []);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-surface hairline-r h-screen sticky top-0 p-4">
      <Link to="/home" className="flex items-center gap-2 px-2 py-3 mb-4">
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">b</span>
        </div>
        <span className="font-medium tracking-tight">builders house</span>
      </Link>

      <nav className="flex-1 space-y-0.5">
        <NavItem to="/home" icon={Home} active={location.pathname === "/home"}>home</NavItem>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-3 pt-5 pb-2">
          channels
        </div>
        {channels.map((c) => {
          const Icon = ICONS[c.icon ?? "BookOpen"] ?? BookOpen;
          const path = `/channel/${c.slug}`;
          return (
            <NavItem key={c.id} to={path} icon={Icon} active={location.pathname === path}>
              {c.name.toLowerCase()}
            </NavItem>
          );
        })}
      </nav>

      <div className="hairline-t pt-3 space-y-0.5">
        {user && (
          <Link to={`/profile/${user.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated">
            <AvatarBlock url={profile?.avatar_url} name={profile?.display_name ?? "me"} size={28} />
            <span className="text-sm truncate">{profile?.display_name ?? "me"}</span>
          </Link>
        )}
        {isAdmin && (
          <NavItem to="/admin" icon={Shield} active={location.pathname.startsWith("/admin")}>admin</NavItem>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
        >
          <LogOut className="h-4 w-4" />
          sign out
        </button>
      </div>
    </aside>
  );
};

const NavItem = ({ to, icon: Icon, children, active }: any) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      active ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50"
    )}
  >
    <Icon className="h-4 w-4" />
    {children}
  </Link>
);
