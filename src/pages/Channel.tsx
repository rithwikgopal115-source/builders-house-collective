import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FloatingActions } from "@/components/FloatingActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProjectChannelPage } from "@/components/ProjectChannelPage";
import { GeneralChannelPage } from "@/components/GeneralChannelPage";
import { IdeasChannelPage } from "@/components/IdeasChannelPage";
import { PostComposer } from "@/components/PostComposer";
import {
  Star, Zap, Lightbulb, Music, Briefcase, Trophy,
  Send, ArrowLeft, Pencil, Trash2,
  FileText, Link as LinkIcon, Youtube, FileType, LayoutTemplate,
  Users, Globe, Lock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from "lucide-react";

// Channel routing
const PROJECT_CHANNEL_SLUGS  = ["wins"];
const GENERAL_HUB_SLUGS      = ["resources"];
const IDEAS_CHANNEL_SLUGS    = ["ideas"];

// Ordered slugs for left/right switching
const CHANNEL_ORDER = ["resources", "ai-news", "ideas", "vibing", "hiring", "wins"];

interface Channel { id: string; slug: string; name: string; description: string | null; is_public_visible: boolean | null; intro_video_url?: string | null; }

type PostType = "text" | "link" | "video" | "doc" | "pdf" | "template";

const ICONS: Record<string, { icon: any; color: string }> = {
  "resources": { icon: Star,       color: "#E8734A" },
  "ai-news":   { icon: Zap,         color: "#1D6AE5" },
  "ideas":     { icon: Lightbulb,   color: "#F5C518" },
  "vibing":    { icon: Music,       color: "#7C3AED" },
  "hiring":    { icon: Briefcase,   color: "#16A34A" },
  "wins":      { icon: Trophy,      color: "#EA580C" },
};

// Per-channel vibrant gradient overlays
const CHANNEL_GRADIENTS: Record<string, string> = {
  "resources": "radial-gradient(ellipse at 80% 10%, rgba(232,115,74,0.22) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(232,115,74,0.12) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(180,70,30,0.06) 0%, transparent 70%)",
  "ai-news":   "radial-gradient(ellipse at 80% 10%, rgba(29,106,229,0.24) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(29,106,229,0.10) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(10,60,180,0.07) 0%, transparent 70%)",
  "ideas":     "radial-gradient(ellipse at 80% 10%, rgba(245,197,24,0.20) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(245,197,24,0.09) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(200,160,0,0.06) 0%, transparent 70%)",
  "vibing":    "radial-gradient(ellipse at 80% 10%, rgba(124,58,237,0.24) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(124,58,237,0.11) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(80,20,200,0.07) 0%, transparent 70%)",
  "hiring":    "radial-gradient(ellipse at 80% 10%, rgba(22,163,74,0.22) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(22,163,74,0.10) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(10,120,50,0.06) 0%, transparent 70%)",
  "wins":      "radial-gradient(ellipse at 80% 10%, rgba(234,88,12,0.24) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(234,88,12,0.11) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(180,60,0,0.07) 0%, transparent 70%)",
};

const CHANNEL_ACCENT: Record<string, string> = {
  "resources": "#E8734A",
  "ai-news":   "#1D6AE5",
  "ideas":     "#F5C518",
  "vibing":    "#7C3AED",
  "hiring":    "#16A34A",
  "wins":      "#EA580C",
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

const PillStyle = (active: boolean, accent?: string): React.CSSProperties => ({
  background: active ? (accent ?? "#E8734A") : "#1E1E1E",
  color: active ? "#0D0D0D" : "#A09890",
  border: active ? `1px solid ${accent ?? "#E8734A"}` : "1px solid rgba(255,255,255,0.08)",
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
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [tab, setTab] = useState<"posts" | "resources">("posts");
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [channelIntroCollapsed, setChannelIntroCollapsed] = useState(false);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevSlugRef = useRef<string>(slug ?? '');

  const isApproved = !!profile?.is_approved;
  const accent = CHANNEL_ACCENT[slug ?? ""] ?? "#E8734A";

  // Compute prev/next channel slugs
  const currentIdx = CHANNEL_ORDER.indexOf(slug ?? "");
  const prevSlug = currentIdx > 0 ? CHANNEL_ORDER[currentIdx - 1] : null;
  const nextSlug = currentIdx < CHANNEL_ORDER.length - 1 ? CHANNEL_ORDER[currentIdx + 1] : null;

  const load = useCallback(async () => {
    if (!slug) return;
    if (loading) return;
    const { data: ch } = await supabase.from("channels").select("*").eq("slug", slug).maybeSingle();
    if (!ch) { setNotFound(true); return; }
    setChannel(ch);
    document.title = `${ch.name.toLowerCase()} — builders house`;

    // Always load posts — even for hub channels — so visitor view has content
    const { data: ps } = await supabase
      .from("posts")
      .select("id, channel_id, user_id, title, content, type, url, image_urls, visibility, created_at, is_pinned, is_resource, profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)")
      .eq("channel_id", ch.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);
    setPosts((ps ?? []).map((p: any) => ({ ...p, author: p.profiles })));
  }, [slug, loading]);

  useEffect(() => { load(); }, [load]);

  // Trigger slide animation on slug change without remounting children (avoids flicker)
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug && contentRef.current) {
      const el = contentRef.current;
      const anim = slideDir === 'left' ? 'channelSlideInLeft' : 'channelSlideInRight';
      el.style.animation = 'none';
      void el.offsetWidth; // force reflow
      el.style.animation = `${anim} 0.28s cubic-bezier(0.22,1,0.36,1)`;
    }
    prevSlugRef.current = slug ?? '';
  }, [slug]);

  useEffect(() => {
    if (!channel) return;
    if ([...PROJECT_CHANNEL_SLUGS, ...GENERAL_HUB_SLUGS, ...IDEAS_CHANNEL_SLUGS].includes(channel.slug)) return;
    const ch = supabase
      .channel(`posts:${channel.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `channel_id=eq.${channel.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel, load]);

  // ── Swipe to change channel ──────────────────────────────────
  // Only fire if the gesture is PRIMARILY horizontal (|dx| > |dy| * 1.5)
  // This prevents vertical scroll from accidentally triggering channel switches.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // If vertical movement dominates, it's a scroll — ignore
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.6) return;
    // Require a meaningful horizontal swipe (60px minimum)
    if (deltaX > 60 && prevSlug) { setSlideDir('right'); navigate(`/channel/${prevSlug}`); }
    if (deltaX < -60 && nextSlug) { setSlideDir('left'); navigate(`/channel/${nextSlug}`); }
  };

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
  const channelGradient = CHANNEL_GRADIENTS[channel.slug] ?? "";

  // ── Channel switcher buttons ─────────────────────────────────
  const ChannelSwitcher = () => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => { if (prevSlug) { setSlideDir('right'); navigate(`/channel/${prevSlug}`); } }}
        disabled={!prevSlug}
        className="h-8 w-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/10 disabled:opacity-20"
        style={{ color: accent, border: `1px solid ${accent}33` }}
        title={prevSlug ? `← ${prevSlug}` : ""}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => { if (nextSlug) { setSlideDir('left'); navigate(`/channel/${nextSlug}`); } }}
        disabled={!nextSlug}
        className="h-8 w-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/10 disabled:opacity-20"
        style={{ color: accent, border: `1px solid ${accent}33` }}
        title={nextSlug ? `${nextSlug} →` : ""}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  if (!user || !isApproved) {
    if (!channel.is_public_visible) return <Navigate to="/" replace />;

    // Shared visitor nav (no AppLayout — keep it minimal)
    const VisitorNav = () => (
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium tracking-tight" style={{ color: "#F5F0EB" }}>← builders house</Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:block" style={{ color: "#6A6460" }}>read-only preview</span>
            <Link to="/login" className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg" style={{ background: "#E8734A", color: "#0D0D0D" }}>join</Link>
          </div>
        </div>
      </nav>
    );

    // Hub channels — show full layout in visitor/read-only mode
    if (GENERAL_HUB_SLUGS.includes(channel.slug)) {
      return (
        <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
          <VisitorNav />
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">
            <GeneralChannelPage channel={channel} isVisitor={true} />
          </div>
        </div>
      );
    }

    if (IDEAS_CHANNEL_SLUGS.includes(channel.slug)) {
      return (
        <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
          <VisitorNav />
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">
            <IdeasChannelPage channel={channel} isVisitor={true} />
          </div>
        </div>
      );
    }

    if (PROJECT_CHANNEL_SLUGS.includes(channel.slug)) {
      return (
        <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
          <VisitorNav />
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">
            <ProjectChannelPage channel={channel} isVisitor={true} />
          </div>
        </div>
      );
    }

    // Flat-feed channels (ai-news, vibing, hiring) — show public posts
    const publicPosts = posts.filter((p) => p.visibility === "public");
    return (
      <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
        <VisitorNav />
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
          <header className="mb-8 flex items-start gap-4">
            <div className="h-12 w-12 flex items-center justify-center" style={{ background: iconCfg.color, borderRadius: 12 }}>
              <Icon className="h-6 w-6" style={{ color: "#0D0D0D" }} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-3xl font-medium tracking-tight" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>{channel.name.toLowerCase()}</h1>
              {channel.description && <p className="text-sm mt-2" style={{ color: "#A09890" }}>{channel.description}</p>}
              <p className="text-[10px] font-mono uppercase tracking-wider mt-3" style={{ color: "#A09890" }}>public posts only · join for full access</p>
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

  // ── Shared channel page header with switcher ─────────────────
  const ChannelPageHeader = () => (
    <header className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <Link to="/home" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-colors hover:text-primary" style={{ color: "#A09890" }}>
          <ArrowLeft className="h-3.5 w-3.5" />home
        </Link>
        <ChannelSwitcher />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 flex items-center justify-center flex-shrink-0" style={{ background: iconCfg.color, borderRadius: 12 }}>
          <Icon className="h-6 w-6" style={{ color: "#0D0D0D" }} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight truncate" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>{channel.name.toLowerCase()}</h1>
          {channel.description && <p className="text-sm mt-0.5 truncate" style={{ color: "#A09890" }}>{channel.description}</p>}
        </div>
      </div>

      {/* Per-channel intro video */}
      {channel.intro_video_url && (
        <div className="mt-4">
          <button
            onClick={() => setChannelIntroCollapsed(v => !v)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2 hover:opacity-80"
            style={{ color: "#A09890" }}
          >
            {channelIntroCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {channelIntroCollapsed ? "show intro video" : "hide intro video"}
          </button>
          {!channelIntroCollapsed && (
            <div className="aspect-video overflow-hidden" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", maxWidth: 640 }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractYtId(channel.intro_video_url)}`}
                className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media"
                title={channel.name}
              />
            </div>
          )}
        </div>
      )}
    </header>
  );

  // Shared page wrapper with gradient overlay + swipe + smooth slide animation
  // Uses a ref-based CSS approach — NO key remounting — so children never flicker
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="relative min-h-screen"
      style={{ overflowX: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gradient overlay — transitions color smoothly */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: channelGradient, zIndex: 0, transition: "background 0.5s ease" }}
      />
      {/* Content — animation is applied via ref in useEffect, no remounting */}
      <div ref={contentRef} className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
      <style>{`
        @keyframes channelSlideInRight {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes channelSlideInLeft {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );

  // ── Hub page (resources) ──────────────────────────────────────
  if (GENERAL_HUB_SLUGS.includes(channel.slug)) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 pb-32">
            <ChannelPageHeader />
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
              <GeneralChannelPage channel={channel} />
              <ChannelChat channelId={channel.id} channelName={channel.name} accent={accent} />
            </div>
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  if (IDEAS_CHANNEL_SLUGS.includes(channel.slug)) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 pb-32">
            <ChannelPageHeader />
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
              <IdeasChannelPage channel={channel} />
              <ChannelChat channelId={channel.id} channelName={channel.name} accent={accent} />
            </div>
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  if (PROJECT_CHANNEL_SLUGS.includes(channel.slug)) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 pb-32">
            <ChannelPageHeader />
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
              <ProjectChannelPage channel={channel} />
              <ChannelChat channelId={channel.id} channelName={channel.name} accent={accent} />
            </div>
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  // ── All other channels: flat feed ────────────────────────────
  const visible = posts.filter((p) => tab === "resources" ? !!p.is_resource : true);

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 pb-32">
          <ChannelPageHeader />

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
                    /* PostCard handles its own edit/delete/move via inline hover buttons */
                    <PostCard
                      key={p.id}
                      post={p}
                      onAdminRequestPublic={isAdmin ? requestPublic : undefined}
                      onDeleted={() => load()}
                    />
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            <ChannelChat channelId={channel.id} channelName={channel.name} accent={accent} />
          </div>
        </div>

        <FloatingActions
          defaultChannelId={channel.id}
          defaultIsResource={tab === "resources"}
          onCreated={load}
          accent={accent}
        />

      </PageWrapper>
    </AppLayout>
  );
};

// ── YT id helper ─────────────────────────────────────────────
const extractYtId = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") ?? "";
  } catch { return ""; }
};

// ─────────────────────────────────────────────────────────────────────────────

const ChannelChat = ({ channelId, channelName, accent }: { channelId: string; channelName: string; accent?: string }) => {
  const { user, profile, isAdmin } = useAuth();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState("");
  // Start collapsed on mobile (window width < 1024px = lg breakpoint)
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : true);
  const endRef = useRef<HTMLDivElement>(null);
  const ac = accent ?? "#E8734A";

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

  const prevLengthRef = useRef(0);
  useEffect(() => {
    // Only scroll to bottom when a NEW message arrives, not on initial load
    if (messages.length > prevLengthRef.current && prevLengthRef.current !== 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !user || !profile?.is_approved) return;
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase.from("posts").insert({
      channel_id: channelId, user_id: user.id, content: text,
      type: "text", visibility: "community", is_resource: false,
    });
    if (error) toast.error(error.message);
  };

  const startEditMsg = (m: any) => { setEditingMsgId(m.id); setEditingMsgContent(m.content ?? ""); };
  const saveEditMsg = async (id: string) => {
    if (!editingMsgContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editingMsgContent.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditingMsgId(null); load();
  };
  const deleteMsg = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <aside
      className="flex flex-col self-start sticky top-20 transition-all duration-200"
      style={{
        background: "#161616",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        height: collapsed ? "auto" : "calc(100vh - 8rem)",
      }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.02] transition-colors rounded-t-2xl"
        style={{ borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div>
          <div className="text-xs font-mono uppercase tracking-wider" style={{ color: "#A09890" }}>group chat</div>
          <div className="text-sm font-medium" style={{ color: "#F5F0EB" }}>{channelName.toLowerCase()}</div>
        </div>
        <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 flex-shrink-0" style={{ color: "#A09890" }}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </header>

      {!collapsed && <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                    <input value={editingMsgContent} onChange={(e) => setEditingMsgContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEditMsg(m.id); if (e.key === "Escape") setEditingMsgId(null); }}
                      autoFocus className="w-full px-3 py-2 text-sm focus:outline-none rounded-lg"
                      style={{ background: mine ? ac : "#1E1E1E", color: mine ? "#0D0D0D" : "#F5F0EB", border: "1px solid rgba(255,255,255,0.15)", minWidth: 120 }}
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm" style={{ background: mine ? ac : "#1E1E1E", color: mine ? "#0D0D0D" : "#F5F0EB", borderRadius: 8 }}>
                      {m.content}
                    </div>
                  )}
                  {canEdit && !isEditing && (
                    <div className={`absolute -top-6 ${mine ? "right-0" : "left-0"} flex gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                      {mine && (
                        <button onClick={() => startEditMsg(m)} className="h-5 w-5 flex items-center justify-center rounded transition-colors hover:bg-white/10" style={{ color: "#A09890" }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => deleteMsg(m.id)} className="h-5 w-5 flex items-center justify-center rounded transition-colors hover:bg-red-500/20" style={{ color: "#A09890" }}>
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
      </div>}

      {!collapsed && profile?.is_approved && (
        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="say something…" className="flex-1 px-3 py-2 text-sm focus:outline-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />
          <button onClick={send} className="h-9 w-9 flex items-center justify-center transition-opacity hover:opacity-90"
            style={{ background: ac, color: "#0D0D0D", borderRadius: 8 }}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const EditPostComposer = ({
  post, open, onOpenChange, onSaved,
}: {
  post: FeedPost | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void;
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
    const { error } = await supabase.from("posts").update({
      title: title.trim() || null, content: content.trim() || null,
      type: dbType(type), url: url.trim() || null, visibility, is_resource: isResource,
    }).eq("id", post.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("post updated");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 max-w-xl max-h-[90vh] overflow-y-auto" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>edit post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title (optional)" maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="what's on your mind?" rows={5} maxLength={5000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
          {type !== "text" && (
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://"
              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
          )}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#A09890" }}>visibility</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setVisibility("community")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "community")}><Users className="h-3 w-3" /> community</button>
              <button onClick={() => setVisibility("public")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "public")}><Globe className="h-3 w-3" /> public</button>
              {isAdmin && <button onClick={() => setVisibility("private")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "private")}><Lock className="h-3 w-3" /> private</button>}
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
