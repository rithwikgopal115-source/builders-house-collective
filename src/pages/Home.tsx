import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { ArrowRight, ListChecks } from "lucide-react";

const Home = () => {
  const { profile, loading } = useAuth();
  const [postsByChannel, setPostsByChannel] = useState<Record<string, FeedPost[]>>({});
  const [stats, setStats] = useState({ members: 0, postsThisWeek: 0, channels: 6 });
  const [pendingPublicReqs, setPendingPublicReqs] = useState(0);

  useEffect(() => {
    document.title = "home — builders house";

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

      const [{ count: members }, { count: weekPosts }, { count: pendReq }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("posts").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("public_visibility_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setStats({ members: members ?? 0, postsThisWeek: weekPosts ?? 0, channels: 6 });
      setPendingPublicReqs(pendReq ?? 0);
    };
    load();
  }, []);

  if (loading) return null;
  if (profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const resources = postsByChannel["resources"]?.[0];
  const aiNews = postsByChannel["ai-news"]?.[0];
  const ideas = postsByChannel["ideas"]?.[0];
  const vibing = postsByChannel["vibing"]?.[0];
  const hiring = postsByChannel["hiring"]?.[0];
  const wins = postsByChannel["wins"]?.[0];

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight mb-1">member dashboard</h1>
          <p className="text-xs font-mono text-muted-foreground">
            {stats.members} builders · {stats.postsThisWeek} posts this week
          </p>
        </header>

        {/* bento — Critical big, then 2x3 grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BentoCard slug="resources" title="critical info & resources" badge="pinned" icon="📌"
            color="#E8734A" big preview={resources} className="md:col-span-2 md:row-span-2" />
          <BentoCard slug="ai-news" title="ai news" icon="⚡" color="#1A3A3A" preview={aiNews} />
          <BentoCard slug="ideas" title="ideas" icon="💡" color="#2A1F0A" preview={ideas} />
          <BentoCard slug="vibing" title="vibing & chilling" icon="🎵" preview={vibing} />
          <BentoCard slug="hiring" title="hiring / co-founder" icon="💼" preview={hiring} />
          <BentoCard slug="wins" title="wins" badge="celebration" icon="🏆" preview={wins} />
        </div>

        {/* tasks shortcut */}
        <Link to="/tasks" className="mt-6 bento-card flex items-center gap-3 hover:bg-surface-elevated transition-colors">
          <ListChecks className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-medium">community tasks</div>
            <div className="text-xs text-muted-foreground font-mono">things people are working on</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </AppLayout>
  );
};

const BentoCard = ({ slug, title, badge, icon, color, big, preview, className = "" }: any) => (
  <Link to={`/channel/${slug}`}
    className={`bento-card group flex flex-col relative overflow-hidden ${className}`}
    style={{ minHeight: big ? 240 : 160 }}>
    {badge && (
      <span className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {badge}
      </span>
    )}
    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xl mb-4"
      style={{ background: color ? `${color}40` : "#1E1E1E" }}>
      {icon}
    </div>
    <h3 className={`font-medium mb-1 ${big ? "text-xl" : "text-base"}`}>{title}</h3>
    {preview ? (
      <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{preview.title || preview.content}</p>
    ) : (
      <p className="text-xs text-muted-foreground font-mono mt-1">no posts yet</p>
    )}
  </Link>
);

export default Home;
