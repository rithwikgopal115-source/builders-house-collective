import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostComposer } from "@/components/PostComposer";
import { useAuth } from "@/context/AuthContext";
import { BuilderBadge } from "@/components/TierBadge";
import { AvatarBlock } from "@/components/AvatarBlock";
import { toast } from "sonner";

interface Channel { id: string; slug: string; name: string; description: string | null; is_public_visible: boolean | null; }

const ChannelPage = () => {
  const { slug } = useParams();
  const { user, profile, isAdmin, loading } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [topContributors, setTopContributors] = useState<any[]>([]);

  const isApproved = !!profile?.is_approved;

  const load = useCallback(async () => {
    if (!slug) return;
    // Wait until auth has resolved — RLS on posts requires either a public-visible
    // channel + public visibility, or an approved auth.uid. Querying mid-bootstrap
    // returns 0 rows or a 401 depending on token state.
    if (loading) return;
    const { data: ch } = await supabase.from("channels").select("*").eq("slug", slug).maybeSingle();
    if (!ch) { setNotFound(true); return; }
    setChannel(ch);
    document.title = `${ch.name.toLowerCase()} — builders house`;

    const { data: ps } = await supabase
      .from("posts")
      .select("id, channel_id, user_id, title, content, type, url, visibility, created_at, is_pinned, profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)")
      .eq("channel_id", ch.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((ps ?? []).map((p: any) => ({ ...p, author: p.profiles })));

    if (isApproved) {
      const { data: contribs } = await supabase
        .from("posts")
        .select("user_id, profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)")
        .eq("channel_id", ch.id)
        .limit(100);
      const counts: Record<string, { profile: any; n: number }> = {};
      (contribs ?? []).forEach((p: any) => {
        const id = p.user_id;
        if (!counts[id]) counts[id] = { profile: p.profiles, n: 0 };
        counts[id].n++;
      });
      setTopContributors(Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5));
    }
  }, [slug, isApproved, loading]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!channel) return;
    const ch = supabase
      .channel(`posts:${channel.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `channel_id=eq.${channel.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel, load]);

  const requestPublic = async (post: FeedPost) => {
    if (!user) return;
    const { error } = await supabase.from("public_visibility_requests").insert({
      post_id: post.id, initiator_id: user.id, direction: "admin_to_member",
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({
      recipient_id: post.user_id, type: "public_request",
      related_id: post.id, content: "admin wants to make your post public",
    });
    toast.success("request sent to author");
  };

  if (loading) return <AppLayout><div className="p-10 text-muted-foreground font-mono text-sm">loading…</div></AppLayout>;
  if (notFound) return <Navigate to="/home" replace />;
  if (!channel) return <div className="min-h-screen p-10 text-muted-foreground font-mono text-sm">loading…</div>;

  // Public visitor (not logged in / not approved) viewing a public-visible channel: show only public posts, no app shell.
  if (!user || !isApproved) {
    if (!channel.is_public_visible) {
      return <Navigate to="/" replace />;
    }
    const publicPosts = posts.filter((p) => p.visibility === "public");
    return (
      <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
        <nav className="hairline-b">
          <div className="max-w-4xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
            <Link to={user ? "/home" : "/"} className="text-sm font-medium tracking-tight">← builders house</Link>
            <Link to="/login" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary">login</Link>
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
          <header className="mb-8">
            <h1 className="text-3xl font-medium tracking-tight">{channel.name.toLowerCase()}</h1>
            {channel.description && <p className="text-muted-foreground mt-2 text-sm">{channel.description}</p>}
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-3">public posts only · request access for full feed</p>
          </header>
          <div className="space-y-4">
            {publicPosts.length === 0 && (
              <div className="bento-card text-center py-16 text-sm text-muted-foreground font-mono">
                no public posts here yet.
              </div>
            )}
            {publicPosts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </div>
      </div>
    );
  }

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
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onAdminRequestPublic={isAdmin ? requestPublic : undefined} />
            ))}
          </div>

          <aside className="space-y-4">
            <div className="bento-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">about</h3>
              <p className="text-sm">{channel.description ?? "—"}</p>
            </div>
            <div className="bento-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">top contributors</h3>
              <div className="space-y-2">
                {topContributors.map((c) => (
                  <div key={c.profile.id} className="flex items-center gap-2">
                    <AvatarBlock url={c.profile.avatar_url} name={c.profile.display_name} size={28} />
                    <span className="text-sm flex-1 truncate">{c.profile.display_name}</span>
                    <BuilderBadge />
                    <span className="text-xs text-muted-foreground font-mono">{c.n}</span>
                  </div>
                ))}
                {topContributors.length === 0 && <p className="text-xs text-muted-foreground font-mono">none yet</p>}
              </div>
            </div>
          </aside>
        </div>

        {profile?.is_approved && (
          <Button onClick={() => setComposerOpen(true)}
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 p-0 shadow-lg" size="lg">
            <Plus className="h-6 w-6" />
          </Button>
        )}

        <PostComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          defaultChannelId={channel.id}
          onCreated={load}
        />
      </div>
    </AppLayout>
  );
};

export default ChannelPage;
