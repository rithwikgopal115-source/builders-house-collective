import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "@/components/PostCard";
import { Star, Zap, Lightbulb, Music, Briefcase, Trophy, ListChecks } from "lucide-react";
import { FloatingActions } from "@/components/FloatingActions";

// Sharp Windows-Phone live tiles. Each channel has its own brand color + icon.
const TILES: Record<string, { bg: string; fg: string; icon: any; label: string; badge?: string; glow?: boolean }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Star,       label: "critical info", badge: "pinned", glow: true },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap,         label: "ai news" },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb,   label: "ideas" },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music,       label: "vibing" },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase,   label: "hiring" },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy,      label: "wins", badge: "celebration" },
};

const Home = () => {
  const { profile, user, loading, profileLoading } = useAuth();
  const [postsByChannel, setPostsByChannel] = useState<Record<string, FeedPost[]>>({});
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ members: 0, postsThisWeek: 0 });

  useEffect(() => {
    document.title = "home — builders house";
    if (!profile?.is_approved) return;

    const load = async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, channel_id, user_id, title, content, type, url, visibility, created_at, is_pinned, channels!inner(slug, name), profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)")
        .order("created_at", { ascending: false })
        .limit(60);

      const map: Record<string, FeedPost[]> = {};
      (posts ?? []).forEach((p: any) => {
        const slug = p.channels?.slug;
        if (!slug) return;
        if (!map[slug]) map[slug] = [];
        map[slug].push({ ...p, channel: p.channels, author: p.profiles });
      });
      setPostsByChannel(map);

      // Unread heuristic: any post in last 24h not authored by me
      const cutoff = Date.now() - 86400000;
      const unread: Record<string, boolean> = {};
      Object.entries(map).forEach(([slug, list]) => {
        unread[slug] = list.some(p => new Date(p.created_at).getTime() > cutoff && p.user_id !== user?.id);
      });
      setUnreadByChannel(unread);

      const [{ count: members }, { count: weekPosts }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("posts").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      setStats({ members: members ?? 0, postsThisWeek: weekPosts ?? 0 });
    };
    load();
  }, [profile?.is_approved, user?.id]);

  if (loading || profileLoading) return (
    <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ background: "#0D0D0D", color: "#8A8480" }}>
      loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user && !profile) return <Navigate to="/waiting" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const slugs = ["resources", "ai-news", "ideas", "vibing", "hiring", "wins"];
  const previews = Object.fromEntries(slugs.map((s) => [s, postsByChannel[s]?.[0] ?? null]));

  return (
    <AppLayout>
      <div className="px-5 md:px-8 pt-6 pb-32 max-w-6xl mx-auto">
        <header className="mb-5">
          <h1 className="text-xl md:text-2xl font-medium tracking-tight mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
            member dashboard
          </h1>
          <p className="text-xs font-mono" style={{ color: "#8A8480" }}>
            {stats.members} builders · {stats.postsThisWeek} posts this week
          </p>
        </header>

        {/* Sharp bento — 2px gaps, 0 radius — Windows Phone */}
        <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[150px] md:auto-rows-[180px] gap-[2px]">
          <BentoTile slug="resources" preview={previews.resources} unread={unreadByChannel.resources} className="col-span-2 row-span-2" big />
          <BentoTile slug="ai-news"   preview={previews["ai-news"]} unread={unreadByChannel["ai-news"]} />
          <BentoTile slug="ideas"     preview={previews.ideas}     unread={unreadByChannel.ideas} />
          <BentoTile slug="vibing"    preview={previews.vibing}    unread={unreadByChannel.vibing} />
          <BentoTile slug="hiring"    preview={previews.hiring}    unread={unreadByChannel.hiring} />
          <BentoTile slug="wins"      preview={previews.wins}      unread={unreadByChannel.wins} className="col-span-2 md:col-span-1" />
        </div>

        <Link
          to="/tasks"
          className="mt-5 flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.02]"
          style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}
        >
          <ListChecks className="h-5 w-5" style={{ color: "#E8734A" }} />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: "#F5F0EB" }}>community tasks</div>
            <div className="text-xs font-mono" style={{ color: "#8A8480" }}>things people are working on</div>
          </div>
        </Link>
      </div>

      <FloatingActions />
      <style>{`@keyframes tilePulseHome { 0%,100% { box-shadow: 0 0 24px rgba(232,115,74,0.45); } 50% { box-shadow: 0 0 36px rgba(232,115,74,0.7); } }`}</style>
    </AppLayout>
  );
};

const BentoTile = ({ slug, preview, unread, className = "", big }: any) => {
  const cfg = TILES[slug];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <Link
      to={`/channel/${slug}`}
      className={`group relative p-4 md:p-5 flex flex-col justify-between overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99] ${className}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        borderRadius: 0,
        animation: cfg.glow ? "tilePulseHome 3s ease-in-out infinite" : undefined,
      }}
    >
      {cfg.badge && (
        <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider opacity-70">
          {cfg.badge}
        </span>
      )}

      {/* Unread dot — top-right, sits above badge slot */}
      {unread && !cfg.badge && (
        <span
          className="absolute top-3 right-3 h-2 w-2 rounded-full"
          style={{ background: "#FFFFFF", boxShadow: "0 0 8px rgba(255,255,255,0.6)" }}
        />
      )}

      <Icon className={big ? "h-8 w-8 md:h-10 md:w-10" : "h-6 w-6 md:h-7 md:w-7"} strokeWidth={2} style={{ color: cfg.fg }} />

      <div>
        <h3
          className={`font-medium leading-tight ${big ? "text-lg md:text-xl" : "text-sm md:text-base"}`}
          style={{ color: cfg.fg, letterSpacing: "-0.02em" }}
        >
          {cfg.label}
        </h3>
        {preview ? (
          <p className={`mt-1 line-clamp-2 opacity-80 ${big ? "text-sm" : "text-xs"}`} style={{ color: cfg.fg }}>
            {preview.title || preview.content}
          </p>
        ) : (
          <p className="text-[10px] font-mono mt-1 opacity-60" style={{ color: cfg.fg }}>no posts yet</p>
        )}
      </div>
    </Link>
  );
};

export default Home;
