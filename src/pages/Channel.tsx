import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FloatingActions } from "@/components/FloatingActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Star, Zap, Lightbulb, Music, Briefcase, Trophy,
  Send, ArrowLeft, Pencil, Trash2,
  FileText, Link as LinkIcon, Youtube, FileType, LayoutTemplate,
  Users, Globe, Lock,
} from "lucide-react";

interface Channel { id: string; slug: string; name: string; description: string | null; is_public_visible: boolean | null; }

type PostType = "text" | "link" | "video" | "doc" | "pdf" | "template";

const ICONS: Record<string, { icon: any; color: string }> = {
  "resources": { icon: Star,       color: "#E8734A" },
  "ai-news":   { icon: Zap,         color: "#1D6AE5" },
  "ideas":     { icon: Lightbulb,   color: "#F5C518" },
  "vibing":    { icon: Music,       color: "#7C3AED" },
  "hiring":    { icon: Briefcase,   color: "#16A34A" },
  "wins":      { icon: Trophy,      color: "#EA580C" },
};

const EDIT_TYPES: { v: PostType; i: any; l: string }[] = [
  { v: "text",     i: FileText,     l: "text" },
  { v: "link",     i: LinkIcon,     l: "link" },
  { v: "video",    i: Youtube,      l: "youtube" },
  { v: "doc",      i: FileType,     l: "doc" },
  { v: "pdf",      i: FileType,     l: "pdf" },
  { v: "template", i: LayoutTemplate, l: "template" },
];

const dbType = (t: PostType) => (t === "pdf" || t === "template" ? "doc" : t);

const PillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#E8734A" : "#1E1E1E",
  color: active ? "#0D0D0D" : "#A09890",
  border: active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  transition: "all .15s",
  cursor: "pointer",
});

// ─────────────────────────────────────────────────────────────────────────────

const ChannelPage = () => {
  const { slug } = useParams();
  const { user, profile, isAdmin, loading } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [tab, setTab] = useState<"posts" | "resources">("posts");
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

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

  const deletePost = async (id: string) => {
    if (!window.confirm("delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("deleted");
    load();
  };

  if (loading) return <AppLayout><div className="p-10 text-muted-foreground font-mono text-sm">loading…</div></AppLayout>;
  if (notFound) return <Navigate to="/home" replace />;
  if (!channel) return <div className="min-h-screen p-10 text-muted-foreground font-mono text-sm">loading…</div>;

  const iconCfg = ICONS[channel.slug] ?? { icon: Star, color: "#E8734A" };
  const Icon = iconCfg.icon;

  if (!user || !isApproved) {
    if (!channel.is_public_visible) return <Navigate to="/" replace />;
    const publicPosts = posts.filter((p) => p.visibility === "public");
    return (
      <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
        <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="max-w-4xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
            <Link to={user ? "/home" : "/"} className="text-sm font-medium tracking-tight" style={{ color: "#F5F0EB" }}>← builders house</Link>
            <Link to="/login" className="text-xs font-mono uppercase tracking-wider hover:text-primary" style={{ color: "#A09890" }}>login</Link>
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
          <header className="mb-8 flex items-start gap-4">
            <div className="h-12 w-12 flex items-center justify-center" style={{ background: iconCfg.color, borderRadius: 12 }}>
              <Icon className="h-6 w-6" style={{ color: "#0D0D0D" }} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-3xl font-medium tracking-tight" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>{channel.name.toLowerCase()}</h1>
              {channel.description && <p className="text-sm mt-2" style={{ color: "#A09890" }}>{channel.description}</p>}
              <p className="text-[10px] font-mono uppercase tracking-wider mt-3" style={{ color: "#A09890" }}>public posts only · request access for full feed</p>
            </div>
          </header>
          <div className="space-y-4">
            {publicPosts.length === 0 && (
              <div className="text-center py-16 text-sm font-mono" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, color: "#A09890" }}>
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
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 pb-32">
        <header className="mb-6">
          <Link
            to="/home"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 transition-colors hover:text-primary"
            style={{ color: "#A09890" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            home
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center flex-shrink-0" style={{ background: iconCfg.color, borderRadius: 12 }}>
              <Icon className="h-6 w-6" style={{ color: "#0D0D0D" }} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight truncate" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
                {channel.name.toLowerCase()}
              </h1>
              {channel.description && <p className="text-sm mt-0.5 truncate" style={{ color: "#A09890" }}>{channel.description}</p>}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="mb-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                <TabsTrigger value="posts">posts</TabsTrigger>
                <TabsTrigger value="resources">resources</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="space-y-4">
                {visible.length === 0 && (
                  <div className="text-center py-16 text-sm font-mono" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, color: "#A09890" }}>
                    {tab === "resources" ? "no resources saved yet." : "nothing here yet. be the first."}
                  </div>
                )}
                {visible.map((p) => (
                  <div key={p.id} className="relative group">
                    <PostCard post={p} onAdminRequestPublic={isAdmin ? requestPublic : undefined} />
                    {(p.user_id === user?.id || isAdmin) && (
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.user_id === user?.id && (
                          <button
                            onClick={() => setEditingPost(p)}
                            className="h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                            style={{ color: "#A09890" }}
                            title="edit post"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deletePost(p.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-red-500/20"
                          style={{ color: "#A09890" }}
                          title="delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <ChannelChat channelId={channel.id} channelName={channel.name} />
        </div>
      </div>

      <FloatingActions
        defaultChannelId={channel.id}
        defaultIsResource={tab === "resources"}
        onCreated={load}
      />

      <EditPostComposer
        post={editingPost}
        open={!!editingPost}
        onOpenChange={(o) => { if (!o) setEditingPost(null); }}
        onSaved={() => { setEditingPost(null); load(); }}
      />
    </AppLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ChannelChat = ({ channelId, channelName }: { channelId: string; channelName: string }) => {
  const { user, profile, isAdmin } = useAuth();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles!posts_user_id_fkey(display_name, avatar_url)")
      .eq("channel_id", channelId)
      .eq("type", "text")
      .is("title", null)
      .order("created_at", { ascending: false })
      .limit(30);
    setMessages((data ?? []).reverse());
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat:${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `channel_id=eq.${channelId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!draft.trim() || !user || !profile?.is_approved) return;
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase.from("posts").insert({
      channel_id: channelId,
      user_id: user.id,
      content: text,
      type: "text",
      visibility: "community",
      is_resource: false,
    });
    if (error) toast.error(error.message);
  };

  const startEditMsg = (m: any) => {
    setEditingMsgId(m.id);
    setEditingMsgContent(m.content ?? "");
  };

  const saveEditMsg = async (id: string) => {
    if (!editingMsgContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editingMsgContent.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditingMsgId(null);
    load();
  };

  const deleteMsg = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <aside
      className="flex flex-col self-start sticky top-20"
      style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, height: "calc(100vh - 8rem)" }}
    >
      <header className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-xs font-mono uppercase tracking-wider" style={{ color: "#A09890" }}>group chat</div>
        <div className="text-sm font-medium" style={{ color: "#F5F0EB" }}>{channelName.toLowerCase()}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs font-mono text-center py-8" style={{ color: "#A09890" }}>no messages yet — say hi.</p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          const canEdit = mine || isAdmin;
          const isEditing = editingMsgId === m.id;

          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group/msg`}>
              <div className="max-w-[80%]">
                {!mine && (
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "#A09890" }}>
                    {m.profiles?.display_name ?? "member"}
                  </div>
                )}
                <div className="relative">
                  {isEditing ? (
                    <input
                      value={editingMsgContent}
                      onChange={(e) => setEditingMsgContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditMsg(m.id);
                        if (e.key === "Escape") setEditingMsgId(null);
                      }}
                      autoFocus
                      className="w-full px-3 py-2 text-sm focus:outline-none rounded-lg"
                      style={{
                        background: mine ? "#E8734A" : "#1E1E1E",
                        color: mine ? "#0D0D0D" : "#F5F0EB",
                        border: "1px solid rgba(255,255,255,0.15)",
                        minWidth: 120,
                      }}
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm" style={{ background: mine ? "#E8734A" : "#1E1E1E", color: mine ? "#0D0D0D" : "#F5F0EB", borderRadius: 8 }}>
                      {m.content}
                    </div>
                  )}

                  {canEdit && !isEditing && (
                    <div className={`absolute -top-6 ${mine ? "right-0" : "left-0"} flex gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                      {mine && (
                        <button onClick={() => startEditMsg(m)} className="h-5 w-5 flex items-center justify-center rounded transition-colors hover:bg-white/10" style={{ color: "#A09890" }} title="edit">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => deleteMsg(m.id)} className="h-5 w-5 flex items-center justify-center rounded transition-colors hover:bg-red-500/20" style={{ color: "#A09890" }} title="delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {profile?.is_approved && (
        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="say something…"
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />
          <button onClick={send} className="h-9 w-9 flex items-center justify-center transition-opacity hover:opacity-90" style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 8 }}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const EditPostComposer = ({
  post,
  open,
  onOpenChange,
  onSaved,
}: {
  post: FeedPost | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) => {
  const { isAdmin } = useAuth();
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [type, setType]         = useState<PostType>("text");
  const [url, setUrl]           = useState("");
  const [visibility, setVisibility] = useState<"community" | "public" | "private">("community");
  const [isResource, setIsResource] = useState(false);
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    if (!post) return;
    setTitle(post.title ?? "");
    setContent(post.content ?? "");
    setType((post.type as PostType) ?? "text");
    setUrl((post as any).url ?? "");
    setVisibility(((post as any).visibility ?? "community") as any);
    setIsResource(!!(post as any).is_resource);
  }, [post]);

  const save = async () => {
    if (!post) return;
    setBusy(true);
    const { error } = await supabase
      .from("posts")
      .update({
        title: title.trim() || null,
        content: content.trim() || null,
        type: dbType(type),
        url: url.trim() || null,
        visibility,
        is_resource: isResource,
      })
      .eq("id", post.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("post updated");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-0 max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>edit post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type pills */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#A09890" }}>type</p>
            <div className="flex flex-wrap gap-1.5">
              {EDIT_TYPES.map(({ v, i: Icon, l }) => (
                <button key={v} onClick={() => setType(v)} className="flex items-center gap-1.5 font-mono" style={PillStyle(type === v)}>
                  <Icon className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title (optional)"
            maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="what's on your mind?"
            rows={5}
            maxLength={5000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          {type !== "text" && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
            />
          )}

          {/* Visibility pills */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#A09890" }}>visibility</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setVisibility("community")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "community")}>
                <Users className="h-3 w-3" /> community
              </button>
              <button onClick={() => setVisibility("public")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "public")}>
                <Globe className="h-3 w-3" /> public
              </button>
              {isAdmin && (
                <button onClick={() => setVisibility("private")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "private")}>
                  <Lock className="h-3 w-3" /> private
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: "#A09890" }}>
            <input type="checkbox" checked={isResource} onChange={(e) => setIsResource(e.target.checked)} />
            save to resources tab (curated)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} style={{ color: "#A09890" }}>cancel</Button>
            <Button onClick={save} disabled={busy} className="px-8">{busy ? "saving…" : "save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelPage;
