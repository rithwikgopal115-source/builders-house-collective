import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { ArrowRight } from "lucide-react";

const Home = () => {
  const { profile, loading } = useAuth();
  const [postsByChannel, setPostsByChannel] = useState<Record<string, FeedPost[]>>({});
  const [stats, setStats] = useState({ members: 0, postsThisWeek: 0, channels: 5 });

  useEffect(() => {
    document.title = "home — builders house";

    const load = async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, channel_id, author_id, title, content, post_type, url, looking_for, created_at, channels!inner(slug, name), profiles!inner(display_name, avatar_url, tier)")
        .order("created_at", { ascending: false })
        .limit(40);

      const map: Record<string, FeedPost[]> = {};
      (posts ?? []).forEach((p: any) => {
        const slug = p.channels.slug;
        if (!map[slug]) map[slug] = [];
        map[slug].push({ ...p, channel: p.channels, author: p.profiles });
      });
      setPostsByChannel(map);

      const [{ count: members }, { count: weekPosts }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      setStats({ members: members ?? 0, postsThisWeek: weekPosts ?? 0, channels: 5 });
    };
    load();
  }, []);

  if (loading) return null;
  if (profile && !profile.is_approved) return <Navigate to="/pending" replace />;

  const resources = postsByChannel["resources"]?.[0];
  const aiNews = postsByChannel["ai-news"]?.[0];
  const hiring = postsByChannel["hiring"]?.[0];
  const vibing = postsByChannel["vibing"]?.slice(0, 3) ?? [];
  const ideas = postsByChannel["ideas"]?.slice(0, 6) ?? [];

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        {/* stats */}
        <div className="flex gap-8 mb-8 text-sm font-mono">
          <Stat label="members" value={stats.members} />
          <Stat label="posts this week" value={stats.postsThisWeek} />
          <Stat label="channels" value={stats.channels} />
        </div>

        {/* bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
          {/* large: resources */}
          <BentoSlot
            title="latest from resources"
            channelSlug="resources"
            className="md:col-span-2"
            empty={!resources}
          >
            {resources && <PostCard post={resources} compact />}
          </BentoSlot>

          {/* medium: ai-news */}
          <BentoSlot title="ai news" channelSlug="ai-news" empty={!aiNews}>
            {aiNews && <PostCard post={aiNews} compact />}
          </BentoSlot>

          {/* medium: hiring */}
          <BentoSlot title="hiring" channelSlug="hiring" empty={!hiring}>
            {hiring && <PostCard post={hiring} compact />}
          </BentoSlot>

          {/* small: vibing */}
          <BentoSlot title="vibing" channelSlug="vibing" className="md:col-span-2" empty={vibing.length === 0}>
            <div className="space-y-3">
              {vibing.map((p) => (
                <PostCard key={p.id} post={p} compact />
              ))}
            </div>
          </BentoSlot>

          {/* wide: ideas */}
          <BentoSlot title="ideas" channelSlug="ideas" className="md:col-span-3" empty={ideas.length === 0}>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {ideas.map((p) => (
                <div key={p.id} className="min-w-[280px] max-w-[320px]">
                  <PostCard post={p} compact />
                </div>
              ))}
            </div>
          </BentoSlot>
        </div>
      </div>
    </AppLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="text-2xl font-medium">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

const BentoSlot = ({
  title,
  channelSlug,
  children,
  className = "",
  empty = false,
}: {
  title: string;
  channelSlug: string;
  children?: React.ReactNode;
  className?: string;
  empty?: boolean;
}) => (
  <section className={className}>
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{title}</h2>
      <Link to={`/channel/${channelSlug}`} className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1">
        view all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
    {empty ? (
      <div className="bento-card text-center py-10 text-sm text-muted-foreground font-mono">nothing yet</div>
    ) : (
      children
    )}
  </section>
);

export default Home;
