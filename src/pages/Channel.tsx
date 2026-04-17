import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FloatingActions } from "@/components/FloatingActions";
import { toast } from "sonner";

interface Channel { id: string; slug: string; name: string; description: string | null; is_public_visible: boolean | null; }

const ChannelPage = () => {
  const { slug } = useParams();
  const { user, profile, isAdmin, loading } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [tab, setTab] = useState<"posts" | "resources">("posts");

  const isApproved = !!profile?.is_approved;

  const load = useCallback(async () => {
    if (!slug) return;
    if (loading) return;
    const { data: ch } = await supabase.from("channels").select("*").eq("slug", slug).maybeSingle();
    if (!ch) { setNotFound(true); return; }
    setChannel(ch);
    document.title = `${ch.name.toLowerCase()} — builders house`;

    const { data: ps } = await supabase
      .from("posts")
      .select("id, channel_id, user_id, title, content, type, url, visibility, created_at, is_pinned, is_resource, profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)")
      .eq("channel_id", ch.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);
    setPosts((ps ?? []).map((p: any) => ({ ...p, author: p.profiles })));
  }, [slug, loading]);

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

  // Public visitor on a public-visible channel: minimal shell, public posts only.
  if (!user || !isApproved) {
    if (!channel.is_public_visible) return <Navigate to="/" replace />;
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

  const visible = posts.filter((p) => tab === "resources" ? !!p.is_resource : true);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 md:p-10 pb-32">
        <header className="mb-6">
          <Link to="/home" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary">← home</Link>
          <h1 className="text-3xl font-medium tracking-tight mt-3">{channel.name.toLowerCase()}</h1>
          {channel.description && <p className="text-muted-foreground mt-2 text-sm">{channel.description}</p>}
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-surface hairline mb-6">
            <TabsTrigger value="posts">posts</TabsTrigger>
            <TabsTrigger value="resources">resources</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4">
            {visible.length === 0 && (
              <div className="bento-card text-center py-16 text-sm text-muted-foreground font-mono">
                {tab === "resources" ? "no resources saved yet." : "nothing here yet. be the first."}
              </div>
            )}
            {visible.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onAdminRequestPublic={isAdmin ? requestPublic : undefined}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <FloatingActions
        defaultChannelId={channel.id}
        defaultIsResource={tab === "resources"}
        onCreated={load}
      />
    </AppLayout>
  );
};

export default ChannelPage;
