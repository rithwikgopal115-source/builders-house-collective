import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostComposer } from "@/components/PostComposer";
import { useAuth } from "@/context/AuthContext";
import { TierBadge } from "@/components/TierBadge";
import { AvatarBlock } from "@/components/AvatarBlock";

interface Channel { id: string; slug: string; name: string; description: string | null; }

const Channel = () => {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [topContributors, setTopContributors] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!slug) return;
    const { data: ch } = await supabase.from("channels").select("*").eq("slug", slug).maybeSingle();
    if (!ch) { setNotFound(true); return; }
    setChannel(ch);
    document.title = `${ch.name.toLowerCase()} — builders house`;

    const { data: ps } = await supabase
      .from("posts")
      .select("id, channel_id, author_id, title, content, post_type, url, looking_for, created_at, profiles!inner(display_name, avatar_url, tier)")
      .eq("channel_id", ch.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((ps ?? []).map((p: any) => ({ ...p, author: p.profiles })));

    // top contributors in channel
    const { data: contribs } = await supabase
      .from("posts")
      .select("author_id, profiles!inner(id, display_name, avatar_url, tier)")
      .eq("channel_id", ch.id)
      .limit(50);
    const counts: Record<string, { profile: any; n: number }> = {};
    (contribs ?? []).forEach((p: any) => {
      const id = p.author_id;
      if (!counts[id]) counts[id] = { profile: p.profiles, n: 0 };
      counts[id].n++;
    });
    setTopContributors(Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    if (!channel) return;
    const ch = supabase
      .channel(`posts:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `channel_id=eq.${channel.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel, load]);

  if (notFound) return <Navigate to="/home" replace />;
  if (!channel) return <AppLayout><div className="p-10 text-muted-foreground font-mono text-sm">loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight">{channel.name.toLowerCase()}</h1>
          {channel.description && <p className="text-muted-foreground mt-2 text-sm">{channel.description}</p>}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div className="space-y-4">
            {posts.length === 0 && (
              <div className="bento-card text-center py-16 text-sm text-muted-foreground font-mono">
                nothing here yet. be the first.
              </div>
            )}
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>

          <aside className="space-y-4">
            <div className="bento-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">about</h3>
              <p className="text-sm">{channel.description}</p>
            </div>
            <div className="bento-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">top contributors</h3>
              <div className="space-y-2">
                {topContributors.map((c) => (
                  <div key={c.profile.id} className="flex items-center gap-2">
                    <AvatarBlock url={c.profile.avatar_url} name={c.profile.display_name} size={28} />
                    <span className="text-sm flex-1 truncate">{c.profile.display_name}</span>
                    <TierBadge tier={c.profile.tier} />
                    <span className="text-xs text-muted-foreground font-mono">{c.n}</span>
                  </div>
                ))}
                {topContributors.length === 0 && <p className="text-xs text-muted-foreground font-mono">none yet</p>}
              </div>
            </div>
          </aside>
        </div>

        {profile?.is_approved && (
          <Button
            onClick={() => setComposerOpen(true)}
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 p-0 shadow-lg"
            size="lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        <PostComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          channelId={channel.id}
          channelSlug={channel.slug}
          onCreated={load}
        />
      </div>
    </AppLayout>
  );
};

export default Channel;
