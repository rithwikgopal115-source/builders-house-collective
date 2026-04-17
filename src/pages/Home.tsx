import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "@/components/PostCard";
import { Pin, Zap, Lightbulb, Music, Briefcase, Trophy, ListChecks } from "lucide-react";
import { FloatingActions } from "@/components/FloatingActions";

// Vivid Windows Phone live tiles. Each channel has its own brand color.
const TILES: Record<string, { bg: string; fg: string; icon: any; badge?: string; glow?: boolean }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Pin, badge: "pinned", glow: true },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy, badge: "celebration" },
};

const TITLES: Record<string, string> = {
  "resources": "critical info & resources",
  "ai-news": "ai news",
  "ideas": "ideas",
  "vibing": "vibing & chilling",
  "hiring": "hiring / co-founder",
  "wins": "wins",
};

const Home = () => {
  const { profile, loading } = useAuth();
  const [postsByChannel, setPostsByChannel] = useState<Record<string, FeedPost[]>>({});
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

      const [{ count: members }, { count: weekPosts }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("posts").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      setStats({ members: members ?? 0, postsThisWeek: weekPosts ?? 0 });
    };
    load();
  }, [profile?.is_approved]);

  if (loading) return null;
  if (profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const slugs = ["resources", "ai-news", "ideas", "vibing", "hiring", "wins"];
  const previews = Object.fromEntries(slugs.map((s) => [s, postsByChannel[s]?.[0] ?? null]));

  return (
    <AppLayout>
      <div className="px-6 md:px-10 pt-20 pb-32 max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight mb-1">member dashboard</h1>
          <p className="text-xs font-mono text-muted-foreground">
            {stats.members} builders · {stats.postsThisWeek} posts this week
          </p>
        </header>

        {/* Bento — Windows Phone live tiles, tight 8px gaps */}
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[170px] gap-2">
          <BentoTile slug="resources" preview={previews.resources} className="col-span-2 row-span-2" big />
          <BentoTile slug="ai-news"   preview={previews["ai-news"]} className="col-span-2 row-span-1" />
          <BentoTile slug="ideas"     preview={previews.ideas}     className="col-span-2 row-span-1" />
          <BentoTile slug="vibing"    preview={previews.vibing}    className="col-span-2 row-span-1" />
          <BentoTile slug="hiring"    preview={previews.hiring}    className="col-span-1 row-span-1" />
          <BentoTile slug="wins"      preview={previews.wins}      className="col-span-1 row-span-1" />
        </div>

        {/* tasks shortcut */}
        <Link to="/tasks" className="mt-6 bento-card flex items-center gap-3 hover:bg-surface-elevated transition-colors">
          <ListChecks className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-medium">community tasks</div>
            <div className="text-xs text-muted-foreground font-mono">things people are working on</div>
          </div>
        </Link>
      </div>

      <FloatingActions />
      <style>{`@keyframes tilePulseHome { 0%,100% { box-shadow: 0 0 24px rgba(232,115,74,0.5); } 50% { box-shadow: 0 0 40px rgba(232,115,74,0.8); } }`}</style>
    </AppLayout>
  );
};

const BentoTile = ({ slug, preview, className = "", big }: any) => {
  const cfg = TILES[slug];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <Link to={`/channel/${slug}`}
      className={`group relative rounded-2xl p-4 md:p-5 flex flex-col justify-between overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99] ${className}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        animation: cfg.glow ? "tilePulseHome 3s ease-in-out infinite" : undefined,
      }}>
      {cfg.badge && (
        <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider opacity-70">
          {cfg.badge}
        </span>
      )}
      <div className="h-10 w-10 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.18)" }}>
        <Icon className="h-5 w-5" style={{ color: cfg.fg }} strokeWidth={2} />
      </div>
      <div>
        <h3 className={`font-medium ${big ? "text-xl" : "text-base"} leading-tight`} style={{ color: cfg.fg }}>
          {TITLES[slug]}
        </h3>
        {preview ? (
          <p className="text-xs mt-1 line-clamp-2 opacity-80" style={{ color: cfg.fg }}>
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
